import { parents, groupsOf } from "../config/site";

/* =========================================================
   グローバルナビの組み立て
   親は固定で、子は site.ts の groups から自動で生える。
   子を持たせるのは「親から推測できない行き先」があるときだけ。
   ========================================================= */

export type NavChild = { label: string; href: string };
export type NavItem = {
  label: string;
  jp: string;
  href: string;
  children: NavChild[];
};

export async function getNav(): Promise<NavItem[]> {
  return [
    { label: "About", jp: "イベントについて", href: "/about/", children: [] },
    { label: "Ticket", jp: "チケット", href: "/ticket/", children: [] },
    // 日はページ内で続けて並んでおり、ページ先頭に日の目次もある。
    // ナビから途中に飛ばせても得るものがないので、子は持たせない
    { label: "Schedule", jp: "スケジュール", href: "/schedule/", children: [] },
    {
      label: parents.contents.label,
      jp: parents.contents.jp,
      href: parents.contents.href,
      children: groupsOf("contents").map(([key, g]) => ({
        label: g.jp,
        href: `${parents.contents.href}#${key}`,
      })),
    },
    // 子は「会場・アクセス」と「宿泊」の2つだけで、どちらも親の日本語ラベル
    // （アクセス・宿泊）から推測できる。開いても得るものがないので持たせない
    {
      label: parents.access.label,
      jp: parents.access.jp,
      href: parents.access.href,
      children: [],
    },
    { label: "Contact", jp: "お問い合わせ", href: "/contact/", children: [] },
  ];
}
