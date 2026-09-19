export const prerender = false;

import type { APIRoute } from "astro";
import { isLive } from "../../../lib/admin/store";

/**
 * 保存したコミットが、公開中のサイトに反映されたか。
 * 保存するとサイトが作り直されるので、終わるまで1〜2分かかる。
 * 管理画面はこれを数秒おきに聞いて、終わったらプレビューを読み直す。
 * live が null のときは判断できない（Vercel の外で動いているなど）。
 */
export const GET: APIRoute = async ({ url }) => {
  const commit = url.searchParams.get("commit") ?? "";
  if (!/^[0-9a-f]{7,40}$|^local$/.test(commit)) return new Response("不正な値です", { status: 400 });
  const live = commit === "local" ? true : await isLive(commit);
  return new Response(JSON.stringify({ live }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
