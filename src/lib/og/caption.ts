import { groups, site } from "../../config/site";
import { dateRangeLabel, getItems, resolveProgram, type ProgramBlock } from "../content";

/**
 * SNSに貼るキャプションを、管理画面に入っている内容から組み立てる。
 * 画像だけ作っても、結局そのたびに文章を書くことになるので、
 * 下書きまで用意して「コピーして貼るだけ」にする。
 */

/** ハッシュタグ。管理画面（トップページ）で入れたもの */
const tags = (ev: Ev) => (ev.hashtags?.length ? ev.hashtags : site.hashtags ?? []).join(" ");

const join = (...blocks: (string | undefined | false)[]) =>
  blocks.filter(Boolean).join("\n\n").trim();

type Ev = {
  hashtags?: readonly string[];
  edition?: string;
  catch?: string;
  venue?: string;
  aboutLead?: string;
  schedule: { id: string; label: string; note?: string; time?: string }[];
  tickets: { label: string; price: string; note?: string }[];
  ticketNotes: string[];
  address?: string;
  accessNotes: string[];
  ticketUrl?: string;
};

/** 開催回の見出し。どのキャプションにも共通で入れる */
const head = (ev: Ev) =>
  [ev.edition, dateRangeLabel(ev.schedule), ev.venue].filter(Boolean).join("\n");

export function overviewCaption(ev: Ev): string {
  return join(head(ev), ev.catch, tags(ev));
}

export function aboutCaption(ev: Ev): string {
  return join(head(ev), ev.aboutLead, tags(ev));
}

export function scheduleCaption(
  ev: Ev,
  day: Ev["schedule"][number],
  blocks: ProgramBlock[]
): string {
  const lines = blocks.flatMap((b) => [
    ...(b.part ? [`▼ ${b.part}`] : []),
    ...b.items.map((s) => `${s.time}　${s.title}`),
  ]);

  return join(
    `【${day.label} タイムスケジュール】`,
    [day.note, day.time].filter(Boolean).join("　"),
    lines.join("\n"),
    ev.venue && `会場：${ev.venue}`,
    tags(ev)
  );
}

export function ticketCaption(ev: Ev): string {
  const rows = ev.tickets.map((t) => `${t.label}　${t.price}`);
  return join(
    "【チケット】",
    rows.join("\n"),
    ev.ticketNotes[0],
    ev.ticketUrl && `▼ご購入はこちら\n${ev.ticketUrl}`,
    tags(ev)
  );
}

export function accessCaption(ev: Ev): string {
  return join(
    "【会場・アクセス】",
    [ev.venue, ev.address].filter(Boolean).join("\n"),
    ev.accessNotes.join("\n"),
    tags(ev)
  );
}

export function stayCaption(ev: Ev, names: string[]): string {
  return join("【周辺の宿泊】", names.join("\n"), ev.venue && `会場：${ev.venue}`, tags(ev));
}

export async function itemCaption(ev: Ev, id: string): Promise<string | null> {
  for (const [key, g] of Object.entries(groups)) {
    const hit = (await getItems(key)).find((e) => e.id === id);
    if (!hit) continue;

    const d = hit.data;
    const name = d.subtitle ? `${d.subtitle}「${d.title}」` : d.title;
    const when = [
      ev.schedule.find((s) => s.id === d.day)?.note,
      d.time,
      d.runtime,
    ]
      .filter(Boolean)
      .join("　");

    return join(
      `【${g.jp}】`,
      name,
      when,
      (hit.body ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>#]/g, "").trim(),
      tags(ev)
    );
  }
  return null;
}

export { resolveProgram };
