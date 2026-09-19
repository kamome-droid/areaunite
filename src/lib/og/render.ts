import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { buildOg, OG_SIZE, type OgKind } from "./templates";
import { ogFonts } from "./font";
import type { AstroCookies } from "astro";
import { getCurrentEvent } from "../content";
import { showsComingSoon, type PageKey } from "../visibility";

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
/** 画像の種類と、その中身が載っているページ */
const pageOfKind: Partial<Record<OgKind, PageKey>> = {
  about: "about",
  schedule: "schedule",
  item: "contents",
  access: "access",
  stay: "access",
};

/** ページが準備中で、この人には画像も出さないか（管理画面にログインしていれば出す） */
export async function ogHidden(kind: OgKind, cookies: AstroCookies) {
  const page = pageOfKind[kind];
  return !!page && showsComingSoon((await getCurrentEvent())?.data, page, { cookies });
}

/** "/api/og/xxx.png?…" の形から種類を取り出す */
export const kindOfSrc = (src: string) =>
  new URL(src, "http://x").pathname.split("/").pop()!.replace(".png", "") as OgKind;

export async function renderOgSrc(src: string, width?: number) {
  if (!src.startsWith("/api/og/")) return null;
  const q = new URL(src, "http://x");
  const kind = kindOfSrc(src);
  return renderOg(
    kind,
    q.searchParams.get("id") ?? undefined,
    Number(q.searchParams.get("page") ?? 1) || 1,
    width
  );
}
