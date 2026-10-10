/**
 * 公開前に、サイト全体をパスワードで隠しておくための仕組み。
 *
 * 環境変数 SITE_PASSWORD を入れると、入口にパスワード入力の画面が出る。
 * 入れなければ素通し（ローカルでは何も起きない）。
 * 一般公開するときは Vercel から SITE_PASSWORD を消すだけでよい。
 */
import crypto from "node:crypto";

function env(key: string): string | undefined {
  return (typeof process !== "undefined" && process.env[key]) || (import.meta.env as any)[key];
}

// リポジトリは公開しているので、この合言葉が無いと誰でもクッキーを偽造できてしまう。
// 本番で AUTH_SECRET を入れ忘れたときは、毎回変わる値にして偽造を通さない
// （ログインし直しは必要になるが、入られるよりよい）
const SECRET =
  env("AUTH_SECRET") ||
  (import.meta.env.DEV ? "dev-insecure-secret" : crypto.randomBytes(32).toString("hex"));
const PASSWORD = env("SITE_PASSWORD");

export const GATE_COOKIE = "site_gate";

export function gateEnabled(): boolean {
  return !!PASSWORD;
}

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest();
}

export function checkGatePassword(input: string): boolean {
  if (!PASSWORD) return true;
  try {
    return crypto.timingSafeEqual(sha(String(input)), sha(PASSWORD));
  } catch {
    return false;
  }
}

export function gateToken(): string {
  return crypto.createHmac("sha256", SECRET).update("site-gate-ok").digest("hex");
}

export function gatePassed(token?: string | null): boolean {
  if (!gateEnabled()) return true;
  return !!token && token === gateToken();
}
