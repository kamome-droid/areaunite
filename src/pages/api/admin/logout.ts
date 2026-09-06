export const prerender = false;

import type { APIRoute } from "astro";
import { COOKIE } from "../../../lib/admin/auth";

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(COOKIE, { path: "/" });
  return redirect("/admin/login");
};
