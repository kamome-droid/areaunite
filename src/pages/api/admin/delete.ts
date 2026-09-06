export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { deleteEntry } from "../../../lib/admin/store";

export const POST: APIRoute = async ({ request }) => {
  const { collection, id } = await request.json();
  const def = collections[collection];
  if (!def || !id) return new Response("不明な項目です", { status: 400 });

  try {
    await deleteEntry(def, id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
