/**
 * 公開前に、サイト全体をパスワードで隠しておくための仕組み。
 *
 * 環境変数 SITE_PASSWORD を入れると、ブラウザ標準のパスワード入力が出る。
 * 入れなければ素通し（ローカルでは何も起きない）。
 * 一般公開するときは Vercel から SITE_PASSWORD を消すだけでよい。
 */

function env(key: string): string | undefined {
  return (typeof process !== "undefined" && process.env[key]) || (import.meta.env as any)[key];
}

const USER = env("SITE_USER") || "areaunite";
const PASSWORD = env("SITE_PASSWORD");

export function gateEnabled(): boolean {
  return !!PASSWORD;
}

/** Authorization ヘッダーが合っているか */
export function gatePassed(request: Request): boolean {
  if (!PASSWORD) return true;

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return false;

  try {
    const [user, ...rest] = atob(encoded).split(":");
    return user === USER && rest.join(":") === PASSWORD;
  } catch {
    return false;
  }
}

/** パスワードを聞く画面（ブラウザが出す） */
export function gateResponse(): Response {
  return new Response("このサイトは公開前です。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AREA UNITE", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
