/**
 * ページごとの公開・非公開。
 *
 * 非公開のページは、一般の人には COMING SOON を出す。
 * 管理画面にログインしている人には中身をそのまま見せる
 * （管理画面のプレビューで、公開前に仕上がりを確かめられるように）。
 */
import type { AstroGlobal } from "astro";
import { COOKIE, verifyToken } from "./admin/auth";

export const pageKeys = ["about", "schedule", "contents", "access"] as const;
export type PageKey = (typeof pageKeys)[number];

/** 管理画面の画面（key）と、切り替えるページの対応 */
export const pageOfScreen: Record<string, PageKey> = {
  about: "about",
  schedule: "schedule",
  items: "contents",
  access: "access",
};

export const pageLabels: Record<PageKey, string> = {
  about: "アバウト",
  schedule: "スケジュール",
  contents: "コンテンツ",
  access: "アクセス・宿泊",
};

type WithHidden = { hiddenPages?: readonly string[] } | undefined;

/** そのページが非公開か */
export const isHidden = (ev: WithHidden, page: PageKey) => !!ev?.hiddenPages?.includes(page);

/** 管理画面にログインしている人か */
export const isAdmin = (astro: Pick<AstroGlobal, "cookies">) =>
  verifyToken(astro.cookies.get(COOKIE)?.value);

/**
 * 管理画面のプレビュー枠の中で開かれたか。
 * ブラウザは iframe の中で開くページに Sec-Fetch-Dest: iframe を付ける
 */
const inPreview = (request: Request) =>
  request.headers.get("sec-fetch-dest") === "iframe" || new URL(request.url).searchParams.has("preview");

/**
 * このリクエストで COMING SOON を出すか。
 * 非公開なら、ログインしていてもサイトを直接開いたときは COMING SOON を出す
 * （一般の人と同じ見え方を確かめられるように）。
 * 中身を見せるのは、管理画面にログインしていて、プレビュー枠の中で開いたときだけ。
 */
export const showsComingSoon = (
  ev: WithHidden,
  page: PageKey,
  astro: Pick<AstroGlobal, "cookies" | "request">
) => isHidden(ev, page) && !(isAdmin(astro) && inPreview(astro.request));

/** 非公開ページのSNS画像を出さないか。管理画面（SNS画像ダウンロード）からは作れるようにする */
export const hiddenFromPublic = (ev: WithHidden, page: PageKey, astro: Pick<AstroGlobal, "cookies">) =>
  isHidden(ev, page) && !isAdmin(astro);
