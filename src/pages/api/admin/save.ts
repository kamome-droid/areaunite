export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { saveEntry } from "../../../lib/admin/store";

export const POST: APIRoute = async ({ request }) => {
  const { collection, id, data, body } = await request.json();
  const def = collections[collection];
  if (!def) return new Response("不明な項目です", { status: 400 });

  try {
    const { slug } = await saveEntry(def, id ?? null, data ?? {}, body ?? "");
    return new Response(JSON.stringify({ slug }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
