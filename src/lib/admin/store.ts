// 管理画面の保存処理。ローカル(dev)は直接ファイル書き込み、本番(Vercel)はGitHub APIでコミット。
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { CollectionDef } from "./schema";

function env(k: string): string | undefined {
  // 本番の秘密は process.env、devの .env は import.meta.env
  return (typeof process !== "undefined" && process.env[k]) || (import.meta.env as any)[k];
}

const useGitHub = () => !import.meta.env.DEV && !!env("GITHUB_TOKEN");

// ---- slug ----
export function slugify(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// id（ファイル名）が安全な単一セグメントか検証。パス区切りや .. を弾く（パストラバーサル対策）
function safeSlug(id: string): string {
  const s = String(id ?? "").trim();
  if (!s || s.includes("/") || s.includes("\\") || s.includes("..")) {
    throw new Error("不正なID");
  }
  return s;
}

export function makeSlug(def: CollectionDef, data: Record<string, any>): string {
  if (def.slug.mode === "field") {
    return slugify(String(data[def.slug.field] || "")) || "entry-" + Date.now();
  }
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(
    d.getMinutes()
  )}${p(d.getSeconds())}`;
}

// ---- frontmatter 生成 ----
// 項目ごとに手で組み立てず、丸ごとYAMLに直す。
// 開催回のように1ファイルを複数の画面で分担する場合、その画面が扱わない項目
// （例：トップページの画面から保存したときのスケジュール）を消さずに残せる。
//
// 注意：この方式ではファイル内のコメントは保存時に失われる。
// 開発用の覚え書きは md ではなく docs/ に置くこと。

/** フォームから来た値を、保存できる形に整える */
function clean(value: any): any {
  if (Array.isArray(value)) {
    const arr = value.map(clean).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = clean(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? undefined : t;
  }
  if (value === null) return undefined;
  return value;
}

export function buildFile(data: Record<string, any>, body: string): string {
  const cleaned = clean(data) ?? {};
  const front = yaml.dump(cleaned, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  let out = `---\n${front}---\n`;
  const text = (body || "").trim();
  if (text) out += `\n${text}\n`;
  return out;
}

// ---- 書き込み（テキスト / バイナリ）----
async function githubPut(repoPath: string, contentBase64: string, message: string) {
  const token = env("GITHUB_TOKEN")!;
  const repo = env("GITHUB_REPO"); // "owner/name"
  const branch = env("GITHUB_BRANCH") || "main";
  const api = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  // 既存ファイルの sha を取得（更新に必要）
  let sha: string | undefined;
  const get = await fetch(`${api}?ref=${branch}`, { headers });
  if (get.ok) sha = (await get.json()).sha;
  const res = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content: contentBase64, branch, sha }),
  });
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status} ${await res.text()}`);
}

async function writeText(repoPath: string, text: string, message: string) {
  if (useGitHub()) {
    await githubPut(repoPath, Buffer.from(text, "utf8").toString("base64"), message);
  } else {
    const abs = path.join(process.cwd(), repoPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, text, "utf8");
  }
}

async function writeBinary(repoPath: string, buf: Buffer, message: string) {
  if (useGitHub()) {
    await githubPut(repoPath, buf.toString("base64"), message);
  } else {
    const abs = path.join(process.cwd(), repoPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buf);
  }
}

// ---- 公開API ----
export async function saveEntry(
  def: CollectionDef,
  id: string | null,
  data: Record<string, any>,
  body: string
): Promise<{ slug: string }> {
  const slug = id ? safeSlug(id) : makeSlug(def, data);

  // その画面が扱わない項目を消さないよう、既存の内容に上書きする形で合成する。
  // 開催回の1ファイルを、トップページ・スケジュール・アクセスの3画面で分担しているため。
  const existing = id ? await readOne(def, slug) : null;
  const merged = { ...(existing?.data ?? {}), ...data };

  // 本文を編集しない画面から保存したときに、本文を消さない。
  // 開催回のように1ファイルを複数の画面で分担しているため
  const nextBody = def.hasBody ? body : (existing?.body ?? "");

  const repoPath = `${def.dir}/${slug}.md`;
  await writeText(repoPath, buildFile(merged, nextBody), `admin: save ${def.key}/${slug}`);
  return { slug };
}

/** GitHubからの返事を、原因の分かる文にする */
async function githubError(res: Response, where: string): Promise<string> {
  const repo = env("GITHUB_REPO") ?? "(GITHUB_REPO未設定)";
  let detail = "";
  try {
    detail = ((await res.json()) as any)?.message ?? "";
  } catch {
    /* 本文が読めないことは気にしない */
  }
  const hint =
    res.status === 401
      ? "GITHUB_TOKEN が違うか期限切れです"
      : res.status === 403
        ? "GITHUB_TOKEN にこのリポジトリへの権限がありません（Contents: Read and write）"
        : res.status === 404
          ? `GITHUB_REPO（${repo}）かブランチ名が違うかもしれません`
          : "";
  return `GitHubから読めませんでした（${res.status} ${detail}／${where}）${hint ? "。" + hint : ""}`;
}

// 1件の生ファイル内容を読む。無ければ null。
export async function readRaw(def: CollectionDef, id: string): Promise<string | null> {
  const repoPath = `${def.dir}/${safeSlug(id)}.md`;
  if (useGitHub()) {
    const token = env("GITHUB_TOKEN")!;
    const repo = env("GITHUB_REPO");
    const branch = env("GITHUB_BRANCH") || "main";
    const api = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    const get = await fetch(`${api}?ref=${branch}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    // 404 は「まだ無い」。それ以外の失敗は、設定の間違いなので黙って隠さない
    if (get.status === 404) return null;
    if (!get.ok) throw new Error(await githubError(get, repoPath));
    const j = await get.json();
    return Buffer.from(j.content, "base64").toString("utf8");
  }
  try {
    return await fs.readFile(path.join(process.cwd(), repoPath), "utf8");
  } catch {
    return null;
  }
}

// ---- 管理画面用：コンテンツを「キャッシュ非依存」で直接読む ----
// getCollection/getEntry は dev のコンテンツキャッシュに依存し、保存直後に一瞬空になることがある。
// 管理画面は下記でファイル(dev)/GitHub(prod)を直接読むので、その空振りの影響を受けない。
export type RawEntry = { id: string; data: Record<string, any>; body: string };

function parseFile(id: string, raw: string): RawEntry {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { id, data: {}, body: raw.trim() };
  let data: Record<string, any> = {};
  try {
    data = (yaml.load(m[1]) as Record<string, any>) || {};
  } catch {
    data = {};
  }
  // date は Date で扱う（getCollection と同じ形に寄せる）
  if (data.date != null && !(data.date instanceof Date)) {
    const d = new Date(data.date);
    if (!isNaN(d.valueOf())) data.date = d;
  }
  return { id, data, body: (m[2] || "").trim() };
}

export async function readOne(def: CollectionDef, id: string): Promise<RawEntry | null> {
  const raw = await readRaw(def, id);
  return raw == null ? null : parseFile(id, raw);
}

export async function readAll(def: CollectionDef): Promise<RawEntry[]> {
  let ids: string[] = [];
  if (useGitHub()) {
    const token = env("GITHUB_TOKEN")!;
    const repo = env("GITHUB_REPO");
    const branch = env("GITHUB_BRANCH") || "main";
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${def.dir}?ref=${branch}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(await githubError(res, def.dir));
    const files = (await res.json()) as { name: string }[];
    ids = files.filter((f) => f.name.endsWith(".md")).map((f) => f.name.replace(/\.md$/, ""));
  } else {
    try {
      const names = await fs.readdir(path.join(process.cwd(), def.dir));
      ids = names.filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/, ""));
    } catch {
      return [];
    }
  }
  const out: RawEntry[] = [];
  for (const id of ids) {
    const one = await readOne(def, id);
    if (one) out.push(one);
  }
  return out;
}

export async function deleteEntry(def: CollectionDef, id: string): Promise<void> {
  const repoPath = `${def.dir}/${safeSlug(id)}.md`;
  if (useGitHub()) {
    const token = env("GITHUB_TOKEN")!;
    const repo = env("GITHUB_REPO");
    const branch = env("GITHUB_BRANCH") || "main";
    const api = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
    const get = await fetch(`${api}?ref=${branch}`, { headers });
    if (!get.ok) return;
    const sha = (await get.json()).sha;
    await fetch(api, {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `admin: delete ${def.key}/${id}`, sha, branch }),
    });
  } else {
    await fs.rm(path.join(process.cwd(), repoPath), { force: true });
  }
}

export async function uploadImage(
  def: CollectionDef,
  filename: string,
  buf: Buffer
): Promise<string> {
  const safe = slugify(filename.replace(/\.[^.]+$/, "")) + (filename.match(/\.[^.]+$/)?.[0] || "");
  const name = `${Date.now()}-${safe || "image"}`;
  const repoPath = `public/images/${def.media}/${name}`;
  await writeBinary(repoPath, buf, `admin: upload ${repoPath}`);
  return `/images/${def.media}/${name}`;
}
