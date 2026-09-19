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
 * このリクエストで COMING SOON を出すか。
 * 非公開 かつ 管理者でない とき。
 */
export const showsComingSoon = (ev: WithHidden, page: PageKey, astro: Pick<AstroGlobal, "cookies">) =>
  isHidden(ev, page) && !isAdmin(astro);
