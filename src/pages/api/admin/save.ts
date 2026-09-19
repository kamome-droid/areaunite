export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { commitFiles, entryPath, prepareEntry, type FileChange } from "../../../lib/admin/store";

type Part = { collection: string; id?: string | null; data?: Record<string, any>; body?: string };

/**
 * 1画面ぶんをまとめて保存する（1コミット）。
 * subs … この画面の中で編集した別コレクションの行（協賛など）
 * deletes … この画面の中で消した行
 * 中身の変わらないファイルは書かないので、何も変えていなければ commit は null。
 */
export const POST: APIRoute = async ({ request }) => {
  const { collection, id, data, body, subs = [], deletes = [] } = await request.json();
  const def = collections[collection];
  if (!def) return new Response("不明な項目です", { status: 400 });

  try {
    const changes: FileChange[] = [];
    const taken = new Set<string>();

    const main = await prepareEntry(def, id ?? null, data ?? {}, body ?? "", taken);
    changes.push(main.change);

    const subSlugs: string[] = [];
    for (const sub of subs as Part[]) {
      const sdef = collections[sub.collection];
      if (!sdef) throw new Error(`不明な項目です：${sub.collection}`);
      const one = await prepareEntry(sdef, sub.id ?? null, sub.data ?? {}, sub.body, taken);
      changes.push(one.change);
      subSlugs.push(one.slug);
    }

    for (const del of deletes as Part[]) {
      const ddef = collections[del.collection];
      if (!ddef || !del.id) continue;
      changes.push({ path: entryPath(ddef, del.id), content: null });
    }

    const { commit } = await commitFiles(changes, `admin: save ${def.key}/${main.slug}`);
    return new Response(JSON.stringify({ slug: main.slug, subSlugs, commit }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
