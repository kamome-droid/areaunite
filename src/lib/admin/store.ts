// 管理画面の保存処理。ローカル(dev)は直接ファイル書き込み、本番(Vercel)はGitHub APIでコミット。
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import yaml from "js-yaml";
import type { CollectionDef } from "./schema";
import { prepareImage, isMedia } from "./image";

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
  // 日付は元の "2026-10-17" の形で書き戻す（読むときに Date にしているため）。
  // そのまま書くと時刻付きに化けて、中身は同じなのに毎回差分が出る
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
  }
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
  if (get.ok) {
    const cur = await get.json();
    sha = cur.sha;
    // 中身が同じなら書かない。空のコミットでもサイトが作り直されて、反映待ちの列が伸びるため
    if (typeof cur.content === "string" && cur.content.replace(/\s/g, "") === contentBase64) return;
  }
  const res = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content: contentBase64, branch, sha }),
  });
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status} ${await res.text()}`);
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

// ---- まとめて1コミットにする ----
// 1回の保存（本文＋協賛の行＋削除）を1つのコミットにまとめる。
// コミットのたびにサイトが作り直されるので、細切れにすると反映待ちの列が伸び、
// Vercel の1日のデプロイ回数の上限にも近づくため。

/**
 * 書き込む1ファイル。content が null なら削除。
 * update を渡すと、コミットを積む時点の最新の中身から作り直す。
 * 読んでから書くまでの間に別の保存が入っても、その変更を古い内容で上書きしないように
 */
export type FileChange =
  | { path: string; content: string | null }
  | { path: string; update: (current: string | null) => string | null };

const resolve = (c: FileChange, current: string | null) =>
  "update" in c ? c.update(current) : c.content;

/** git がファイルの中身から付ける名前（blob の sha）。中身が同じか比べるのに使う */
const blobSha = (text: string) => {
  const buf = Buffer.from(text, "utf8");
  return crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf]))
    .digest("hex");
};

async function gh(pathname: string, init: RequestInit = {}) {
  const token = env("GITHUB_TOKEN")!;
  const repo = env("GITHUB_REPO");
  const res = await fetch(`https://api.github.com/repos/${repo}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function ghJson(pathname: string, init: RequestInit = {}) {
  const res = await gh(pathname, init);
  if (!res.ok) throw new Error(await githubError(res, pathname));
  return res.json() as Promise<any>;
}

/**
 * ファイルをまとめて書く。中身の変わらないものは書かない。
 * 何も変わらなければコミットしない（commit は null）。
 */
export async function commitFiles(
  changes: FileChange[],
  message: string
): Promise<{ commit: string | null }> {
  if (!useGitHub()) {
    let wrote = false;
    for (const c of changes) {
      const abs = path.join(process.cwd(), c.path);
      const content = resolve(c, await fs.readFile(abs, "utf8").catch(() => null));
      if (content == null) {
        const had = await fs.stat(abs).then(() => true, () => false);
        if (had) {
          await fs.rm(abs, { force: true });
          wrote = true;
        }
        continue;
      }
      if ((await fs.readFile(abs, "utf8").catch(() => null)) === content) continue;
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf8");
      wrote = true;
    }
    return { commit: wrote ? "local" : null };
  }

  const branch = env("GITHUB_BRANCH") || "main";
  // 同時に別の保存が入って先を越されたら、最新の上に積み直す
  for (let attempt = 0; attempt < 3; attempt++) {
    const head = (await ghJson(`/git/ref/heads/${branch}`)).object.sha as string;
    const base = (await ghJson(`/git/commits/${head}`)).tree.sha as string;
    const tree = await ghJson(`/git/trees/${base}?recursive=1`);
    const current = new Map<string, string>(
      (tree.tree as { path: string; sha: string; type: string }[])
        .filter((t) => t.type === "blob")
        .map((t) => [t.path, t.sha])
    );

    const entries = [];
    for (const c of changes) {
      // update は、このコミットの土台（head）にある中身から作る
      const sha = current.get(c.path);
      const before =
        "update" in c && sha
          ? Buffer.from((await ghJson(`/git/blobs/${sha}`)).content, "base64").toString("utf8")
          : null;
      const content = resolve(c, before);
      if (content == null) {
        if (sha) entries.push({ path: c.path, mode: "100644", type: "blob", sha: null });
      } else if (sha !== blobSha(content)) {
        entries.push({ path: c.path, mode: "100644", type: "blob", content });
      }
    }
    if (entries.length === 0) return { commit: null };

    const nextTree = await ghJson(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: base, tree: entries }),
    });
    const commit = await ghJson(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: nextTree.sha, parents: [head] }),
    });
    const moved = await gh(`/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    if (moved.ok) return { commit: commit.sha };
    // 422 は「先に別のコミットが入った」。それ以外は設定の問題なので知らせる
    if (moved.status !== 422) throw new Error(await githubError(moved, `refs/heads/${branch}`));
  }
  throw new Error("ほかの保存と重なって書き込めませんでした。もう一度保存してください");
}

/** 公開中のサイトが、そのコミットの内容まで作り直し終えているか */
export async function isLive(commit: string): Promise<boolean | null> {
  if (!useGitHub()) return true;
  // Vercel が今のデプロイに付けているコミット。無ければ判断できない
  const deployed = env("VERCEL_GIT_COMMIT_SHA");
  if (!deployed) return null;
  if (deployed === commit) return true;
  const res = await gh(`/compare/${commit}...${deployed}`);
  if (!res.ok) return null;
  const { status } = await res.json();
  // 公開中のものが、保存したコミットと同じか、それより先に進んでいれば反映済み
  return status === "identical" || status === "ahead";
}

// ---- 公開API ----

/**
 * 画面から来た値を、既存の内容に重ねる。
 * 開催回の1ファイルを複数の画面で分担しているので、その画面が送ってこなかった項目は残す。
 * id を持つ行の並び（開催日）は、行ごとに重ねる。トップページは日付、
 * スケジュール画面は見出しだけを送ってくるため。
 */
function mergeData(existing: Record<string, any>, data: Record<string, any>) {
  const out: Record<string, any> = { ...existing };
  for (const [k, v] of Object.entries(data)) {
    const old = existing[k];
    const byId =
      Array.isArray(v) &&
      Array.isArray(old) &&
      v.every((r) => r && typeof r === "object" && "id" in r);
    out[k] = byId
      ? v.map((row: any) => ({ ...(old.find((o: any) => o?.id === row.id) ?? {}), ...row }))
      : v;
  }
  return out;
}

/** 数として持つ欄（選択肢で選ぶ大きさなど）を、数に直す */
function coerce(def: CollectionDef, data: Record<string, any>) {
  const out = { ...data };
  for (const f of def.fields) {
    if (f.type === "select" && f.numeric && out[f.name] != null && out[f.name] !== "") {
      const n = Number(out[f.name]);
      if (!Number.isNaN(n)) out[f.name] = n;
    }
  }
  return out;
}

/** 画面から来る値。今の中身を見て決めたいとき（公開・非公開の切り替えなど）は関数で渡す */
export type EntryData = Record<string, any> | ((existing: Record<string, any>) => Record<string, any>);

/**
 * 1件ぶんの書き込みを作る（まだ書かない）。
 * 既存の内容との重ね合わせは、書き込む時点の最新の中身に対して行う。
 * body を省くと本文はそのまま残す。
 */
export async function prepareEntry(
  def: CollectionDef,
  id: string | null,
  data: EntryData,
  body?: string,
  /** 同じ保存の中ですでに使った名前。新しく作る行どうしで重ならないように */
  taken: Set<string> = new Set()
): Promise<{ slug: string; change: FileChange }> {
  let slug = id ? safeSlug(id) : makeSlug(def, typeof data === "function" ? {} : data);

  // 新しく作るとき、同じ名前のファイルがあれば番号を付ける（上書きしてしまわないように）
  if (!id) {
    const base = slug;
    for (let n = 2; taken.has(slug) || (await readRaw(def, slug)) != null; n++) slug = `${base}-${n}`;
  }
  taken.add(slug);

  const update = (raw: string | null) => {
    // 既存の項目なのに見つからない＝その間に削除された。項目の一部だけで作り直すと
    // 必須の欄が欠けたファイルになり、サイトの作り直しが失敗するので、何も書かない
    if (id && raw == null) return null;
    const existing = id && raw != null ? parseFile(slug, raw) : null;
    const before = existing?.data ?? {};
    const incoming = coerce(def, typeof data === "function" ? data(before) : data);
    const merged = mergeData(before, incoming);
    // 本文を編集しない画面から保存したときに、本文を消さない。
    // 開催回のように1ファイルを複数の画面で分担しているため
    const nextBody = def.hasBody && body !== undefined ? body : (existing?.body ?? "");
    return buildFile(merged, nextBody);
  };

  return { slug, change: { path: `${def.dir}/${slug}.md`, update } };
}

export async function saveEntry(
  def: CollectionDef,
  id: string | null,
  data: EntryData,
  body?: string
): Promise<{ slug: string; commit: string | null }> {
  const { slug, change } = await prepareEntry(def, id, data, body);
  const { commit } = await commitFiles([change], `admin: save ${def.key}/${slug}`);
  return { slug, commit };
}

export const entryPath = (def: CollectionDef, id: string) => `${def.dir}/${safeSlug(id)}.md`;

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

export async function deleteEntry(def: CollectionDef, id: string): Promise<{ commit: string | null }> {
  return commitFiles([{ path: entryPath(def, id), content: null }], `admin: delete ${def.key}/${id}`);
}

export async function uploadImage(
  def: CollectionDef,
  filename: string,
  raw: Buffer,
  /** 置き場所の指定。同じ画面でも欄によって置き場所を変えたいときに使う */
  media?: string
): Promise<string> {
  const dir = media && isMedia(media) ? media : def.media;
  // 置き場所ごとの決まった形にそろえてから保存する
  const { buf, ext } = await prepareImage(dir, raw);
  const base = slugify(filename.replace(/\.[^.]+$/, "")) || "image";
  const safe = base + (ext || filename.match(/\.[^.]+$/)?.[0] || "");
  const name = `${Date.now()}-${safe}`;
  const repoPath = `public/images/${dir}/${name}`;
  await writeBinary(repoPath, buf, `admin: upload ${repoPath}`);
  return `/images/${dir}/${name}`;
}
