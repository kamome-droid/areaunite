export const prerender = false;

import type { APIRoute } from "astro";
import { OG_KINDS, OG_SIZE, type OgKind } from "../../../lib/og/templates";
import { renderOg } from "../../../lib/og/render";

/**
 * SNS用の画像（1080×1350）を作って返す。
 * 管理画面で入れた内容をそのまま流し込むので、画像を作り直す手間が要らない。
 * ?w=… で小さく（一覧のサムネイル用）、?dl=1 でダウンロードとして返す。
 */
export const GET: APIRoute = async ({ params, url }) => {
  const kind = params.kind as OgKind;
  if (!OG_KINDS.includes(kind)) return new Response("不明な種類です", { status: 404 });

  const width = Math.min(OG_SIZE.width, Number(url.searchParams.get("w")) || OG_SIZE.width);
  const made = await renderOg(
    kind,
    url.searchParams.get("id") ?? undefined,
    Number(url.searchParams.get("page") ?? 1) || 1,
    width
  );
  if (!made) return new Response("出せる内容がありません", { status: 404 });

  const dl = url.searchParams.has("dl");
  return new Response(new Uint8Array(made.png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `${dl ? "attachment" : "inline"}; filename="${made.name}.png"`,
      "cache-control": "no-store",
    },
  });
};
