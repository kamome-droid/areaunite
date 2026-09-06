import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { buildOg, OG_SIZE, type OgKind } from "./templates";
import { ogFonts } from "./font";

/** 1枚ぶんのPNGを作る。無い内容なら null */
export async function renderOg(
  kind: OgKind,
  id?: string,
  page = 1,
  width = OG_SIZE.width
): Promise<{ png: Buffer; name: string } | null> {
  const built = await buildOg(kind, id, page);
  if (!built) return null;

  const fonts = await ogFonts(built.text);
  if (fonts.length === 0) return null;

  const svg = await satori(built.node as any, { ...OG_SIZE, fonts: fonts as any });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  return { png, name: built.name };
}

/** 画像のURL（/api/og/xxx.png?id=…）から作る */
export async function renderOgSrc(src: string, width?: number) {
  if (!src.startsWith("/api/og/")) return null;
  const q = new URL(src, "http://x");
  const kind = q.pathname.split("/").pop()!.replace(".png", "") as OgKind;
  return renderOg(
    kind,
    q.searchParams.get("id") ?? undefined,
    Number(q.searchParams.get("page") ?? 1) || 1,
    width
  );
}
