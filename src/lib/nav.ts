import { parents, groupsOf } from "../config/site";
import { getCurrentEvent } from "./content";

/* =========================================================
   グローバルナビの組み立て
   親は5つに固定し、子は site.ts の groups と
   開催回のスケジュールから自動で生える。
   ========================================================= */

export type NavChild = { label: string; href: string };
export type NavItem = {
  label: string;
  jp: string;
  href: string;
  children: NavChild[];
};

export async function getNav(): Promise<NavItem[]> {
  const event = await getCurrentEvent();
  const parts = event?.data.schedule ?? [];

  return [
    { label: "About", jp: "イベントについて", href: "/about/", children: [] },
    { label: "Ticket", jp: "チケット", href: "/ticket/", children: [] },
    {
      label: "Schedule",
      jp: "スケジュール",
      href: "/schedule/",
      children: parts.map((p) => ({ label: p.jp, href: `/schedule/#${p.id}` })),
    },
    {
      label: parents.contents.label,
      jp: parents.contents.jp,
      href: parents.contents.href,
      children: groupsOf("contents").map(([key, g]) => ({
        label: g.jp,
        href: `${parents.contents.href}#${key}`,
      })),
    },
    {
      label: parents.access.label,
      jp: parents.access.jp,
      href: parents.access.href,
      children: [
        { label: "会場・アクセス", href: `${parents.access.href}#map` },
        ...groupsOf("access").map(([key, g]) => ({
          label: g.jp,
          href: `${parents.access.href}#${key}`,
        })),
      ],
    },
  ];
}
