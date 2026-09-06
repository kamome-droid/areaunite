export const prerender = false;

import type { APIRoute } from "astro";
import { checkPassword, makeToken, COOKIE } from "../../../lib/admin/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!checkPassword(password)) return redirect("/admin/login?error=1");

  cookies.set(COOKIE, makeToken(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !import.meta.env.DEV,
    maxAge: 60 * 60 * 24 * 30,
  });
  return redirect("/admin/");
};
