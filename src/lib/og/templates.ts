import { readFile } from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";
import { groups, site } from "../../config/site";
import {
  dateRangeLabel,
  getCurrentEvent,
  getItems,
  itemThumb,
  resolveProgram,
  type ProgramBlock,
} from "../content";
import { ogTheme, type OgTheme } from "./theme";
import {
  aboutCaption,
  accessCaption,
  itemCaption,
  overviewCaption,
  scheduleCaption,
  stayCaption,
  ticketCaption,
} from "./caption";

/** SNS画像の大きさ。Instagram の縦長（4:5） */
export const OG_SIZE = { width: 1080, height: 1350 };

export const OG_KINDS = [
  "overview",
  "about",
  "schedule",
  "item",
  "ticket",
  "ticketnotes",
  "access",
  "stay",
  "notice",
] as const;
export type OgKind = (typeof OG_KINDS)[number];

/** satori に渡す要素。JSXを使わずに素の形で書く */
type Node = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, children?: any): Node => ({
  type,
  props: { style, ...(children === undefined ? {} : { children }) },
});
const img = (src: string, style: Record<string, any>): Node => ({
  type: "img",
  props: { src, style },
});

/** 画像を読み込む。satori は画像を自分で取りに行けないので、
    public/ のファイルも、YouTubeのサムネイルのような外部URLもここで読み込む */
async function loadImage(src?: string | null): Promise<Buffer | null> {
  if (!src) return null;
  try {
    if (/^https?:\/\//.test(src)) {
      const res = await fetch(src);
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
    if (!src.startsWith("/")) return null;
    return await readFile(path.join(process.cwd(), "public", src.slice(1)));
  } catch {
    return null;
  }
}

type Picture = { uri: string; width: number; height: number };

/**
 * 画像を satori に渡せる形（data URI）にする。
 * satori は webp を読めない（読めないと黙って空白になる）。管理画面から上げた画像は
 * webp にそろえているので、ここで PNG / JPEG に直す。大きすぎるものは縮める。
 */
async function picture(src?: string | null): Promise<Picture | null> {
  const raw = await loadImage(src);
  if (!raw) return null;
  try {
    const img = sharp(raw, { animated: false }).rotate().resize({ width: 1200, withoutEnlargement: true });
    const meta = await img.metadata();
    // 透過のあるもの（ロゴなど）は PNG、写真は軽い JPEG
    const { data, info } = meta.hasAlpha
      ? await img.png().toBuffer({ resolveWithObject: true })
      : await img.jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
    const mime = meta.hasAlpha ? "image/png" : "image/jpeg";
    return { uri: `data:${mime};base64,${data.toString("base64")}`, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** data URI だけ欲しいとき */
const dataUri = async (src?: string | null) => (await picture(src))?.uri ?? null;

/* ---------------------------------------------------------
   共通の枠
   --------------------------------------------------------- */

const PAD = 72;
const FOOTER = 96;

type Frame = {
  theme: OgTheme;
  label: string;
  /** 小さい方の見出し。大きい見出しを使うときは省く */
  jp?: string;
  /** 主役の見出し。DAY 1 のように大きく出す */
  big?: { title: string; sub?: string };
  logo: string | null;
  footer: string;
  center?: boolean;
  children: any[];
};

function frame({ theme, label, jp, big, logo, footer, center, children }: Frame): Node {
  return h(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: `${PAD}px ${PAD}px 60px`,
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: "Noto Sans JP",
    },
    [
      h("div", { display: "flex", flexDirection: "column", marginBottom: 40 }, [
        h(
          "div",
          {
            fontFamily: "Barlow Condensed",
            fontSize: big ? 42 : 64,
            fontWeight: 600,
            letterSpacing: 4,
            color: theme.brand,
            lineHeight: 1,
          },
          label.toUpperCase()
        ),
        ...(big
          ? [
              // DAY 1 の右に日付を下揃えで置く
              h(
                "div",
                { display: "flex", alignItems: "baseline", gap: 24, marginTop: 14 },
                [
                  h(
                    "div",
                    {
                      fontFamily: "Barlow Condensed",
                      fontSize: 108,
                      fontWeight: 600,
                      letterSpacing: 2,
                      lineHeight: 1,
                    },
                    big.title
                  ),
                  ...(big.sub
                    ? [h("div", { fontSize: 40, fontWeight: 700, color: theme.brand }, big.sub)]
                    : []),
                ]
              ),
            ]
          : jp
            ? [h("div", { fontSize: 24, letterSpacing: 2, color: theme.muted, marginTop: 10 }, jp)]
            : []),
      ]),

      h(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflow: "hidden",
          ...(center ? { justifyContent: "center" } : {}),
        },
        children
      ),

      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 32,
          paddingTop: 24,
          borderTop: `1px solid ${theme.brand}`,
        },
        [
          logo
            ? img(logo, { height: 42 })
            : h("div", { fontSize: 26, fontWeight: 700 }, site.name),
          h("div", { fontSize: 24, color: theme.brand, fontWeight: 700 }, footer),
        ]
      ),
    ]
  );
}

/* ---------------------------------------------------------
   行
   --------------------------------------------------------- */

/** タイムテーブルの1行。時刻・分類・内容を1行に収める */
const slot = (theme: OgTheme, time: string, title: string, tag: string | undefined, size: number) =>
  h("div", { display: "flex", alignItems: "baseline", marginBottom: size * 0.5 }, [
    h(
      "div",
      { width: 140, flexShrink: 0, fontSize: size, fontWeight: 700, color: theme.brand },
      time
    ),
    ...(tag
      ? [
          h(
            "div",
            {
              flexShrink: 0,
              marginRight: 14,
              fontSize: size * 0.62,
              fontWeight: 700,
              color: theme.brand,
            },
            tag
          ),
        ]
      : []),
    h("div", { flexGrow: 1, fontSize: size, lineHeight: 1.3 }, title),
  ]);

/** 見出しの行（第1部 など） */
const partRow = (theme: OgTheme, text: string, size: number) =>
  h(
    "div",
    {
      marginTop: 12,
      marginBottom: 16,
      fontFamily: "Barlow Condensed",
      fontSize: size * 1.2,
      fontWeight: 600,
      letterSpacing: 2,
      color: theme.brand,
    },
    text
  );

/** 日付。トップページと同じで、月日だけを大きくキーカラーにする */
const dateLine = (theme: OgTheme, value: string, size: number) => {
  const TOKEN = /(\d{4}\.?|\d{1,2}\.\d{1,2}|\b(?:mon|tue|wed|thu|fri|sat|sun)\b\.?)/gi;
  const parts = value.split(TOKEN).filter(Boolean);

  return h(
    "div",
    { display: "flex", alignItems: "baseline", flexWrap: "wrap" },
    parts.map((t) => {
      if (/^\d{1,2}\.\d{1,2}$/.test(t)) {
        return h(
          "div",
          { fontSize: size * 1.5, fontWeight: 700, color: theme.brand, lineHeight: 1.1 },
          t
        );
      }
      if (/^(\d{4}\.?|(?:mon|tue|wed|thu|fri|sat|sun)\.?)$/i.test(t)) {
        return h(
          "div",
          { fontSize: size * 0.66, letterSpacing: 2, color: theme.muted },
          t
        );
      }
      // 「 - 」のような区切り。前後の空白はflexで潰れるので余白で作る
      return h(
        "div",
        { padding: "0 8px", fontSize: size * 0.8, color: theme.muted },
        t.trim()
      );
    })
  );
};

/** 名前が左、値段が右。サイトのチケット表と同じ並び */
const priceRow = (theme: OgTheme, label: string, price: string, note: string | undefined) =>
  h(
    "div",
    {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 24,
      paddingBottom: 18,
      marginBottom: 18,
      borderBottom: `1px solid ${theme.surface}`,
    },
    [
      h("div", { display: "flex", flexDirection: "column", flexGrow: 1 }, [
        h("div", { fontSize: 34, fontWeight: 700 }, label),
        ...(note
          ? [h("div", { fontSize: 22, color: theme.muted, marginTop: 6 }, note)]
          : []),
      ]),
      h(
        "div",
        { flexShrink: 0, fontSize: 38, fontWeight: 700, color: theme.brand },
        price
      ),
    ]
  );

/* ---------------------------------------------------------
   スケジュールのページ分け
   --------------------------------------------------------- */

/** 読める大きさを先に決めて、入りきらないぶんは次のページへ送る。
    高さは実際の書き出しに合わせた実測値 */
const SIZE = 26;
const ROW_H = 48;
const LINE_H = 34;
const PART_H = 76;
const ROOM = 780;

/** 内容が入る幅。時刻とタグのぶんを引いたもの */
const TITLE_W = OG_SIZE.width - PAD * 2 - 140 - 80;

/** ざっくりの文字幅。和文は全角、英数字は半角ぶんで数える */
function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += /[\x00-\x7F｡-ﾟ]/.test(ch) ? size * 0.52 : size;
  return w;
}

/** 折り返しを含めた1行の高さ。途中で切れないよう、行数ぶんを足す */
const slotHeight = (title: string) =>
  ROW_H + (Math.ceil(textWidth(title, SIZE) / TITLE_W) - 1) * LINE_H;

type Line = { kind: "part"; text: string } | { kind: "slot"; time: string; title: string; tag?: string };

function paginate(blocks: ProgramBlock[]): Line[][] {
  const pages: Line[][] = [];
  let page: Line[] = [];
  let used = 0;

  const push = (line: Line, height: number) => {
    if (used + height > ROOM && page.length > 0) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += height;
  };

  for (const block of blocks) {
    if (block.part) push({ kind: "part", text: block.part }, PART_H);
    block.items.forEach((s, i) => {
      push(
        {
          kind: "slot",
          // 同じ時刻が続くときは時刻を繰り返さない
          time: i > 0 && block.items[i - 1].time === s.time ? "" : s.time,
          title: s.title,
          tag: s.tag,
        },
        slotHeight(s.title)
      );
    });
  }
  if (page.length > 0) pages.push(page);
  return pages.length > 0 ? pages : [[]];
}

/** その日のプログラムが何枚に分かれるか。ページ側で共有ボタンを組むのに使う */
export function schedulePageCount(blocks: ProgramBlock[]): number {
  return paginate(blocks).length;
}

/* ---------------------------------------------------------
   組み立て
   --------------------------------------------------------- */

/** 本文の書き出しを、記号を落として指定の長さで切る */
function summarize(body: string, max: number): string {
  const text = body
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** その画像に出る文字。フォントを切り出すために集める */
function collect(node: any, into: Set<string>) {
  if (typeof node === "string") {
    for (const ch of node) into.add(ch);
    return;
  }
  if (Array.isArray(node)) return node.forEach((n) => collect(n, into));
  if (node && typeof node === "object") collect(node.props?.children, into);
}

export type OgResult = { node: Node; text: string; name: string };

export async function buildOg(kind: OgKind, id?: string, page = 1): Promise<OgResult | null> {
  const theme = await ogTheme();
  const event = await getCurrentEvent();
  const ev = event?.data;
  if (!ev) return null;

  const logo = await dataUri(site.logo);
  const period = dateRangeLabel(ev.schedule);
  const base = { theme, logo, footer: period };

  let node: Node;
  let name: string = kind;

  if (kind === "schedule") {
    const day = ev.schedule.find((d) => d.id === id) ?? ev.schedule[0];
    if (!day) return null;
    const pages = paginate(await resolveProgram(day));
    const lines = pages[Math.min(Math.max(page, 1), pages.length) - 1];

    node = frame({
      ...base,
      label: "Schedule",
      big: { title: day.label, sub: day.note },
      footer:
        pages.length > 1 ? `${day.time ?? period}　${page} / ${pages.length}` : day.time ?? period,
      children: lines.map((l) =>
        l.kind === "part"
          ? partRow(theme, l.text, SIZE)
          : slot(theme, l.time, l.title, l.tag, SIZE)
      ),
    });
    name = pages.length > 1 ? `schedule-${day.id}-${page}` : `schedule-${day.id}`;
  } else if (kind === "overview") {
    const kv = await picture(ev.hero);
    // 縦長のKV（ポスター型）は切らずに全体を見せる。横長は帯にして切り抜く
    const tall = !!kv && kv.height > kv.width;
    const KV_H = tall ? 600 : 560;
    node = frame({
      ...base,
      label: ev.tagline || site.tagline || "Film festival",
      jp: ev.edition,
      // 日付は本文に出すので、足もとは会場名にする
      footer: ev.venue ?? period,
      children: [
        ...(kv
          ? [
              tall
                ? h(
                    "div",
                    { display: "flex", justifyContent: "center", width: "100%", marginBottom: 40 },
                    img(kv.uri, {
                      height: KV_H,
                      width: Math.round((KV_H * kv.width) / kv.height),
                      borderRadius: 10,
                    })
                  )
                : img(kv.uri, {
                    width: "100%",
                    height: KV_H,
                    objectFit: "cover",
                    borderRadius: 10,
                    marginBottom: 44,
                  }),
            ]
          : []),
        h(
          "div",
          { fontSize: 44, fontWeight: 700, lineHeight: 1.5, marginBottom: 28 },
          ev.catch ?? ""
        ),
        dateLine(theme, period, 34),
        ...(ev.venue
          ? [h("div", { fontSize: 30, color: theme.muted, marginTop: 14 }, ev.venue)]
          : []),
      ],
    });
  } else if (kind === "about") {
    node = frame({
      ...base,
      label: "About",
      jp: "エリアユナイトとは",
      center: true,
      children: [
        h("div", { fontSize: 40, fontWeight: 700, lineHeight: 1.7 }, ev.aboutLead ?? ""),
      ],
    });
  } else if (kind === "ticketnotes") {
    node = frame({
      ...base,
      label: "Ticket",
      jp: "ご入場について",
      center: true,
      children: ev.ticketNotes.map((n) =>
        h(
          "div",
          { display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18 },
          [
            h("div", { flexShrink: 0, fontSize: 26, color: theme.brand }, "—"),
            h("div", { fontSize: 26, lineHeight: 1.6 }, n),
          ]
        )
      ),
    });
  } else if (kind === "stay") {
    const rooms = await getItems("stay");
    node = frame({
      ...base,
      label: "Stay",
      jp: "周辺の宿泊",
      center: true,
      children: rooms.map((r) =>
        h(
          "div",
          {
            display: "flex",
            flexDirection: "column",
            paddingBottom: 20,
            marginBottom: 20,
            borderBottom: `1px solid ${theme.surface}`,
          },
          [
            ...(r.data.subtitle
              ? [h("div", { fontSize: 24, color: theme.brand, marginBottom: 6 }, r.data.subtitle)]
              : []),
            h("div", { fontSize: 36, fontWeight: 700 }, r.data.title),
          ]
        )
      ),
    });
  } else if (kind === "item") {
    let found = null as null | Awaited<ReturnType<typeof getItems>>[number];
    let groupJp = "";
    for (const group of Object.keys(groups)) {
      const hit = (await getItems(group)).find((e) => e.id === id);
      if (hit) {
        found = hit;
        groupJp = groups[group].jp;
        break;
      }
    }
    if (!found) return null;
    const d = found.data;
    const thumb = await dataUri(itemThumb(d));
    const meta = [d.time, d.runtime].filter(Boolean).join("　／　");
    const lead = summarize(found.body ?? "", 90);

    node = frame({
      ...base,
      label: "Contents",
      jp: groupJp,
      center: true,
      footer: period,
      children: [
        ...(thumb
          ? [
              img(thumb, {
                width: "100%",
                height: 460,
                objectFit: "cover",
                borderRadius: 10,
                marginBottom: 36,
              }),
            ]
          : []),
        ...(d.subtitle
          ? [h("div", { fontSize: 30, color: theme.muted, marginBottom: 12 }, d.subtitle)]
          : []),
        h("div", { fontSize: 52, fontWeight: 700, lineHeight: 1.25 }, d.title),
        // 時刻と長さは作品名のすぐ下。いちばん知りたいところなので大きく出す
        ...(meta
          ? [
              h(
                "div",
                { fontSize: 38, fontWeight: 700, color: theme.brand, marginTop: 16 },
                meta
              ),
            ]
          : []),
        ...(lead
          ? [
              h(
                "div",
                { fontSize: 27, lineHeight: 1.7, color: theme.muted, marginTop: 22 },
                lead
              ),
            ]
          : []),
      ],
    });
    name = `item-${found.id}`;
  } else if (kind === "ticket") {
    node = frame({
      ...base,
      label: "Ticket",
      jp: "チケット",
      center: true,
      children: ev.tickets.map((t) => priceRow(theme, t.label, t.price, t.note)),
    });
  } else if (kind === "access") {
    node = frame({
      ...base,
      label: "Access",
      jp: "会場・アクセス",
      center: true,
      children: [
        h("div", { fontSize: 52, fontWeight: 700, marginBottom: 24 }, ev.venue ?? ""),
        ...(ev.address
          ? [h("div", { fontSize: 30, color: theme.muted, marginBottom: 32 }, ev.address)]
          : []),
        ...ev.accessNotes.map((n) =>
          h("div", { fontSize: 28, lineHeight: 1.6, marginBottom: 14 }, n)
        ),
      ],
    });
  } else {
    const notice = ev.notice;
    if (!notice?.text) return null;
    node = frame({
      ...base,
      label: "Information",
      jp: "お知らせ",
      center: true,
      children: [
        h("div", { fontSize: 52, fontWeight: 700, lineHeight: 1.5 }, notice.text),
        ...(notice.label
          ? [h("div", { fontSize: 32, color: theme.brand, marginTop: 32 }, notice.label)]
          : []),
      ],
    });
  }

  const chars = new Set<string>();
  collect(node, chars);
  return { node, text: [...chars].join(""), name };
}

/* ---------------------------------------------------------
   何が作れるかの一覧（管理画面で使う）
   --------------------------------------------------------- */

export type Sheet = {
  key: string;
  label: string;
  note: string;
  src: string;
  /** SNSに貼る文章の下書き */
  caption?: string;
};
export type SheetSet = { key: string; label: string; note: string; sheets: Sheet[] };

/** 画像のまとまり。管理画面のメニューと同じ区切りにしている */
export async function ogSets(): Promise<SheetSet[]> {
  const ev = (await getCurrentEvent())?.data;
  if (!ev) return [];

  const sets: SheetSet[] = [];

  sets.push({
    key: "overview",
    label: "概要",
    note: "KV・日付・会場・キャッチコピー",
    sheets: [
      {
        key: "overview",
        label: "概要",
        note: "",
        src: "/api/og/overview.png",
        caption: overviewCaption(ev as any),
      },
    ],
  });

  if (ev.aboutLead) {
    sets.push({
      key: "about",
      label: "アバウト",
      note: "冒頭の紹介文",
      sheets: [
        {
          key: "about",
          label: "アバウト",
          note: "",
          src: "/api/og/about.png",
          caption: aboutCaption(ev as any),
        },
      ],
    });
  }

  // スケジュールは日をまたいで1つのまとまりにする
  const schedule: Sheet[] = [];
  for (const day of ev.schedule) {
    const blocks = await resolveProgram(day);
    const pages = paginate(blocks);
    const caption = scheduleCaption(ev as any, day, blocks);
    pages.forEach((_, i) => {
      schedule.push({
        key: pages.length > 1 ? `schedule-${day.id}-${i + 1}` : `schedule-${day.id}`,
        label: pages.length > 1 ? `${day.label}（${i + 1}/${pages.length}）` : day.label,
        note: day.note ?? "",
        src: `/api/og/schedule.png?id=${day.id}&page=${i + 1}`,
        // 何枚に分かれても、文章は1日ぶんで1つ
        caption: i === 0 ? caption : undefined,
      });
    });
  }
  if (schedule.length > 0) {
    sets.push({
      key: "schedule",
      label: "スケジュール",
      note: `${ev.schedule.length}日ぶん`,
      sheets: schedule,
    });
  }

  const items: Sheet[] = [];
  for (const [key, g] of Object.entries(groups)) {
    if (key === "stay") continue;
    for (const entry of await getItems(key)) {
      items.push({
        key: `item-${entry.id}`,
        label: entry.data.title,
        note: g.jp,
        src: `/api/og/item.png?id=${entry.id}`,
        caption: (await itemCaption(ev as any, entry.id)) ?? undefined,
      });
    }
  }
  if (items.length > 0) {
    sets.push({
      key: "items",
      label: "コンテンツ",
      note: "作品・出演者・出店ごと",
      sheets: items,
    });
  }

  sets.push({
    key: "ticket",
    label: "チケット",
    note: "料金と注意事項",
    sheets: [
      {
        key: "ticket",
        label: "料金",
        note: "",
        src: "/api/og/ticket.png",
        caption: ticketCaption(ev as any),
      },
      ...(ev.ticketNotes.length > 0
        ? [{ key: "ticket-notes", label: "注意事項", note: "", src: "/api/og/ticketnotes.png" }]
        : []),
    ],
  });

  const stay = await getItems("stay");
  sets.push({
    key: "access",
    label: "アクセス",
    note: "会場・行き方・宿泊",
    sheets: [
      {
        key: "access",
        label: "会場・行き方",
        note: "",
        src: "/api/og/access.png",
        caption: accessCaption(ev as any),
      },
      ...(stay.length > 0
        ? [
            {
              key: "stay",
              label: "宿泊",
              note: "",
              src: "/api/og/stay.png",
              caption: stayCaption(ev as any, stay.map((r) => r.data.title)),
            },
          ]
        : []),
    ],
  });

  return sets;
}

/** まとまり1つぶん。無ければ null */
export async function ogSet(key: string): Promise<SheetSet | null> {
  return (await ogSets()).find((s) => s.key === key) ?? null;
}
