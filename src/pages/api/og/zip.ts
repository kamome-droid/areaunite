export const prerender = false;

import type { APIRoute } from "astro";
import JSZip from "jszip";
import { ogSet, ogSets } from "../../../lib/og/templates";
import { renderOgSrc, ogHidden, kindOfSrc } from "../../../lib/og/render";

/** 画像をまとめて1つのzipにして返す。
    ?set=all で全部、?src=… を並べればその画像だけ */
export const GET: APIRoute = async ({ url, cookies }) => {
  const picked = url.searchParams.getAll("src");
  const key = url.searchParams.get("set") ?? "all";

  const srcs = picked.length
    ? picked
    : (key === "all" ? await ogSets() : [await ogSet(key)].filter(Boolean)).flatMap((set) =>
        set!.sheets.map((s) => s.src)
      );
  if (srcs.length === 0) return new Response("見つかりません", { status: 404 });

  const zip = new JSZip();
  for (const src of srcs) {
    // 準備中のページの画像は入れない
    if (await ogHidden(kindOfSrc(src), cookies)) continue;
    const made = await renderOgSrc(src);
    if (made) zip.file(`${made.name}.png`, made.png);
  }

  const name = url.searchParams.get("name") ?? (key === "all" ? "sns" : key);
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${name}.zip"`,
      "cache-control": "no-store",
    },
  });
};
