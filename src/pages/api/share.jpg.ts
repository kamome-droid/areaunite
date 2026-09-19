export const prerender = false;

import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getCurrentEvent } from "../../lib/content";

/**
 * LINE や X でサイトのURLがシェアされたときに出る画像（1200×630）。
 * 今のKVから作るので、KVを差し替えれば自動で変わる。
 * KVは切らずに全体を置き、余白はKVをぼかしたもので埋める（縦長のKVでも収まるように）。
 */
const W = 1200;
const H = 630;

export const GET: APIRoute = async () => {
  const hero = (await getCurrentEvent())?.data.hero;
  let kv: Buffer | null = null;
  try {
    if (hero?.startsWith("/")) kv = await readFile(path.join(process.cwd(), "public", hero.slice(1)));
  } catch {
    kv = null;
  }
  if (!kv) return new Response("KVがありません", { status: 404 });

  const back = await sharp(kv)
    .rotate()
    .resize(W, H, { fit: "cover" })
    .blur(40)
    .modulate({ brightness: 0.45 })
    .toBuffer();
  const front = await sharp(kv)
    .rotate()
    .resize(W - 80, H - 60, { fit: "inside" })
    .toBuffer();

  const jpg = await sharp(back)
    .composite([{ input: front, gravity: "center" }])
    .jpeg({ quality: 86 })
    .toBuffer();

  return new Response(new Uint8Array(jpg), {
    headers: {
      "content-type": "image/jpeg",
      // シェア先は何度も取りに来るので、少しのあいだ使い回させる
      "cache-control": "public, max-age=600, s-maxage=3600",
    },
  });
};
