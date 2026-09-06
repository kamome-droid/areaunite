export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { readOne, saveEntry } from "../../../lib/admin/store";

/** 一覧で並べ替えた順番を、各ファイルの order に書き戻す */
export const POST: APIRoute = async ({ request }) => {
  const { collection, ids } = await request.json();
  const def = collections[collection];
  if (!def) return new Response("不明な項目です", { status: 400 });
  if (!Array.isArray(ids)) return new Response("並び順がありません", { status: 400 });

  try {
    for (const [i, id] of ids.entries()) {
      const entry = await readOne(def, id);
      if (!entry) continue;
      // 10刻み。あとから手で間に入れられるようにしておく
      await saveEntry(def, id, { ...entry.data, order: (i + 1) * 10 }, entry.body);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
