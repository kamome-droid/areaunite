import { defineMiddleware } from "astro:middleware";
import { verifyToken, authRequired, COOKIE } from "./lib/admin/auth";

/** 管理画面と保存APIを、ログインしていない人から守る */
export const onRequest = defineMiddleware((ctx, next) => {
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
