/**
 * SNS画像に使うフォント。Google Fonts から、その画像で使う文字だけを
 * 切り出して取ってくる（`text=` を付けると必要な字形だけが返る）。
 * 数KBで済むので、リポジトリにフォントを置かずに済ませている。
 */

/** 古いUAを名乗ると、woff2 ではなく woff が返る。
    satori は woff を読めるが woff2 は読めない */
const UA =
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36";

const cache = new Map<string, ArrayBuffer>();

async function load(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // v1 の API を使う。css2 はどのUAでも woff2 しか返さない
  const url =
    `https://fonts.googleapis.com/css?family=${family.replace(/ /g, "+")}:${weight}` +
    `&text=${encodeURIComponent(text)}`;

  try {
    const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    const src = css.match(/url\((https:[^)]+)\)/)?.[1];
    if (!src) return null;
    const data = await (await fetch(src)).arrayBuffer();
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

/** 本文用（和文）と見出し用（英字）をまとめて用意する */
export async function ogFonts(text: string): Promise<OgFont[]> {
  const body = text + "0123456789";
  const [reg, bold, display] = await Promise.all([
    load("Noto Sans JP", 400, body),
    load("Noto Sans JP", 700, body),
    load("Barlow Condensed", 600, body),
  ]);

  const fonts: OgFont[] = [];
  if (reg) fonts.push({ name: "Noto Sans JP", data: reg, weight: 400, style: "normal" });
  if (bold) fonts.push({ name: "Noto Sans JP", data: bold, weight: 700, style: "normal" });
  if (display)
    fonts.push({ name: "Barlow Condensed", data: display, weight: 600, style: "normal" });
  return fonts;
}
