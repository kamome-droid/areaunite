export const prerender = false;

import type { APIRoute } from "astro";
import { collections } from "../../../lib/admin/schema";
import { uploadImage } from "../../../lib/admin/store";

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const collection = String(form.get("collection") ?? "");
  const media = String(form.get("media") ?? "");
  const file = form.get("file");
  const def = collections[collection];

  if (!def) return new Response("不明な項目です", { status: 400 });
  if (!(file instanceof File)) return new Response("ファイルがありません", { status: 400 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(def, file.name, buf, media);
    return new Response(JSON.stringify({ url }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String((e as Error).message ?? e), { status: 500 });
  }
};
