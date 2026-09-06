import { defineMiddleware } from "astro:middleware";
import { verifyToken, authRequired, COOKIE } from "./lib/admin/auth";
import { gateEnabled, gatePassed, gateResponse } from "./lib/gate";

/** 公開前のパスワードゲートと、管理画面のログイン確認 */
export const onRequest = defineMiddleware((ctx, next) => {
  // 公開前はサイトごとパスワードで隠す（SITE_PASSWORD を入れたときだけ）
  if (gateEnabled() && !gatePassed(ctx.request)) return gateResponse();

  const p = ctx.url.pathname;
  const isAdmin = p.startsWith("/admin") || p.startsWith("/api/admin");
  const isLogin = p === "/admin/login" || p === "/api/admin/login";

  if (isAdmin && !isLogin && authRequired()) {
    if (!verifyToken(ctx.cookies.get(COOKIE)?.value)) {
      if (p.startsWith("/api/")) return new Response("Unauthorized", { status: 401 });
      return ctx.redirect("/admin/login");
    }
  }

  return next();
});
