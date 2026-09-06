export const prerender = false;

import type { APIRoute } from "astro";
import { checkGatePassword, gateToken, GATE_COOKIE } from "../../lib/gate";

/** 公開前の入口。合っていればクッキーを渡して、元のページへ戻す */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const raw = String(form.get("to") ?? "/");
  // 外のサイトへ飛ばされないよう、自分のパスだけ受ける
  const to = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (!checkGatePassword(password)) {
    return redirect(`/gate?error=1&to=${encodeURIComponent(to)}`);
  }

  cookies.set(GATE_COOKIE, gateToken(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !import.meta.env.DEV,
    maxAge: 60 * 60 * 24 * 30,
  });
  return redirect(to);
};
