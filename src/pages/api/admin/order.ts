export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { commitFiles, prepareEntry, readOne, type FileChange } from "../../../lib/admin/store";

/** 一覧で並べ替えた順番を、各ファイルの order に書き戻す（まとめて1コミット） */
export const POST: APIRoute = async ({ request }) => {
  const { collection, ids } = await request.json();
  const def = collections[collection];
  if (!def) return new Response("不明な項目です", { status: 400 });
  if (!Array.isArray(ids)) return new Response("並び順がありません", { status: 400 });

  try {
    const changes: FileChange[] = [];
    for (const [i, id] of ids.entries()) {
      if (!(await readOne(def, id))) continue;
      // 10刻み。あとから手で間に入れられるようにしておく。本文には触らない
      const { change } = await prepareEntry(def, id, { order: (i + 1) * 10 });
      changes.push(change);
    }
    const { commit } = await commitFiles(changes, `admin: reorder ${def.key}`);
    return new Response(JSON.stringify({ ok: true, commit }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
