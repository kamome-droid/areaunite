// 最小の認証。共有パスワード(env ADMIN_PASSWORD) + 署名クッキー。
// dev で ADMIN_PASSWORD 未設定なら認証スキップ（ローカルで手軽に使える）。
import crypto from "node:crypto";

function env(k: string): string | undefined {
  return (typeof process !== "undefined" && process.env[k]) || (import.meta.env as any)[k];
}

const SECRET = env("AUTH_SECRET") || "dev-insecure-secret";
const PASSWORD = env("ADMIN_PASSWORD");

export const COOKIE = "admin_session";

/** 認証が必要か（本番は必須。dev は ADMIN_PASSWORD 未設定ならスキップ）。 */
export function authRequired(): boolean {
  return !import.meta.env.DEV || !!PASSWORD;
}

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest();
}

export function checkPassword(input: string): boolean {
  if (!PASSWORD) return true;
  try {
    return crypto.timingSafeEqual(sha(String(input)), sha(PASSWORD));
  } catch {
    return false;
  }
}

export function makeToken(): string {
  return crypto.createHmac("sha256", SECRET).update("admin-ok").digest("hex");
}

export function verifyToken(token?: string | null): boolean {
  if (!authRequired()) return true;
  return !!token && token === makeToken();
}
