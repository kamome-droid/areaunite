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

const SECRET = env("AUTH_SECRET") || "dev-insecure-secret";
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
