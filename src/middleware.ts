import { defineMiddleware } from "astro:middleware";
import { verifyToken, authRequired, COOKIE } from "./lib/admin/auth";
import { gateEnabled, gatePassed, GATE_COOKIE } from "./lib/gate";

/** 公開前のパスワードゲートと、管理画面のログイン確認 */
export const onRequest = defineMiddleware((ctx, next) => {
  const p = ctx.url.pathname;

  // 公開前はサイトごとパスワードで隠す（SITE_PASSWORD を入れたときだけ）
  const isGate = p === "/gate" || p === "/api/gate";
  if (gateEnabled() && !isGate && !gatePassed(ctx.cookies.get(GATE_COOKIE)?.value)) {
    return ctx.redirect(`/gate?to=${encodeURIComponent(p + ctx.url.search)}`);
  }

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
