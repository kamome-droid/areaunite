export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { readOne, saveEntry } from "../../../lib/admin/store";
import { pageKeys, type PageKey } from "../../../lib/visibility";

/** ページの公開・非公開を切り替える。押した時点で保存する */
export const POST: APIRoute = async ({ request }) => {
  const { page, hidden } = await request.json();
  if (!pageKeys.includes(page)) return new Response("不明なページです", { status: 400 });

  const def = collections.top;
  const id = def.singleton!;
  try {
    const entry = await readOne(def, id);
    if (!entry) return new Response("開催回のファイルがありません", { status: 404 });
    const now = new Set<PageKey>((entry.data.hiddenPages ?? []) as PageKey[]);
    if (hidden) now.add(page);
    else now.delete(page);
    // 並びを決めておく（書くたびに順番が変わって、中身が同じなのに差分が出ないように）
    const hiddenPages = pageKeys.filter((k) => now.has(k));
    const { commit } = await saveEntry(def, id, { hiddenPages }, entry.body);
    return new Response(JSON.stringify({ hiddenPages, commit }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
