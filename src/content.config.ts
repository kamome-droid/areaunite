import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/* =========================================================
   コンテンツ定義
   将来の管理画面は、この3つのコレクションのMarkdownを
   読み書きするだけで成立するように最小限にしている。
   ========================================================= */

/** カードとして並ぶ項目すべて（上映作品・出演者・出店・宿…）。group で置き場所が決まる */
const items = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/items" }),
  schema: z.object({
    /** site.ts の groups のキー（movies / daytime / music / foods / shops / stay …） */
    group: z.string(),
    title: z.string(),
    /** 作品なら監督・レーベル、出店なら業種など、タイトルの上に小さく出る文字 */
    subtitle: z.string().optional(),
    /** 開始時刻。"17:30" のように入れるとタイムテーブル表示になる */
    time: z.string().optional(),
    /** 上映日など。"10.17 sat." のように入れるとカードに時刻と並べて出る */
    date: z.string().optional(),
    /** 上映時間。"10 min" のように入れると日時の横に出る */
    runtime: z.string().optional(),
    /** 予告編などの動画URL（YouTube / Vimeo）。入れると個別ページの主役になる */
    video: z.string().optional(),
    /** サブ画像。本文の下に並ぶ */
    gallery: z.array(z.string()).default([]),
    /** カード画像（/public 起点） */
    image: z.string().optional(),
    /** 外部リンク（公式サイト・Instagram など） */
    link: z.string().optional(),
    /** リンクのラベル */
    linkLabel: z.string().optional(),
    /** トップページのダイジェストに出すか */
    featured: z.boolean().default(false),
    /** 表示順（小さいほど先。time があれば time 優先） */
    order: z.number().default(0),
    /** 下書き（true は非公開） */
    draft: z.boolean().default(false),
  }),
});

/** 開催回ごとの基本情報。1開催 = 1ファイル */
const timeSlot = z.object({
  time: z.string(),
  title: z.string(),
  note: z.string().optional(),
});

const ticketRow = z.object({
  label: z.string(),
  price: z.string(),
  note: z.string().optional(),
});

/** 1日のプログラムは「部」のかたまりの並び。
    items に直接書くか、include で items コレクションの分類を丸ごと差し込む。
    include を使うと、上映作品などを一覧ページと二重に持たなくて済む。 */
const programBlock = z.object({
  /** 「第2部 ／ ムービー」など。省略すると見出しなしで行だけ並ぶ */
  part: z.string().optional(),
  /** items コレクションの group キー。時刻を持つ項目が時刻順に入る。
      「制作者名」＋「作品名」の形で1行にまとめて表示する */
  include: z.string().optional(),
  /** 直接書く行 */
  items: z.array(timeSlot).default([]),
});

/** スケジュールは日ごとに分ける（DAY 1 / DAY 2 …）。
    ここに1件足すと、ナビの Schedule の子メニューも1つ増える。 */
const schedulePart = z.object({
  /** アンカーに使うID。"daytime" など */
  id: z.string(),
  /** 英字見出し */
  label: z.string(),
  /** 日本語見出し（ナビに出るのはこちら） */
  jp: z.string(),
  /** その日の日付など、見出しに添える文字 */
  note: z.string().optional(),
  /** "12:00 - LATE" のような開催時間帯。トップページの要約に出る。
      空なら items の最初と最後の時刻から組み立てる */
  time: z.string().optional(),
  /** その日のプログラム */
  program: z.array(programBlock).default([]),
});

const event = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/event" }),
  schema: z.object({
    /** "AREA UNITE 2025" */
    edition: z.string(),
    /** 画面に出す日付表記 "2025.10.18 SAT" */
    dateLabel: z.string(),
    /** 並び替え・終了判定に使う開催日 */
    date: z.coerce.date(),
    /** KV画像（/public 起点） */
    hero: z.string().default(""),
    /** KVの見せ方
        overlay … 写真の上にイベント名や日付を重ねる（KVに文字が入っていないとき）
        band    … KVを切らずに全部見せ、日付は下に置く
                  （KVにロゴやタイトルが描き込まれているとき）
        split   … 左に情報・右にKV。KVを切らず、情報とまとめて1画面のヒーローにする */
    heroStyle: z.enum(["overlay", "band", "split"]).default("overlay"),
    /** KVに重ねるキャッチ */
    catch: z.string().default(""),
    /** 会場名・住所・地図 */
    venue: z.string().default(""),
    address: z.string().default(""),
    mapUrl: z.string().optional(),
    mapEmbed: z.string().optional(),
    accessNotes: z.array(z.string()).default([]),
    /** 当日のスケジュール（日ごと） */
    schedule: z.array(schedulePart).default([]),
    /** チケット料金表 */
    tickets: z.array(ticketRow).default([]),
    /** チケット購入ボタン */
    ticketUrl: z.string().optional(),
    ticketUrlLabel: z.string().optional(),
    /** チケットの注意事項 */
    ticketNotes: z.array(z.string()).default([]),
    /** 来場ライダー・ゲストなど、名前だけを並べる欄 */
    guests: z.array(z.string()).default([]),
    guestsLabel: z.string().default("来場ライダー"),
    /** 後援・協力団体（ロゴではなく名前だけを並べる欄） */
    supporters: z.array(z.string()).default([]),
    supportersLabel: z.string().default("後援"),
    /** 開催後に出すお礼メッセージ（入れると告知バナーが出る） */
    afterMessage: z.string().optional(),
    /** 現在のサイトで主役にする開催回か */
    current: z.boolean().default(false),
  }),
});

/** スポンサー・後援 */
const sponsors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/sponsors" }),
  schema: z.object({
    name: z.string(),
    logo: z.string().optional(),
    url: z.string().optional(),
    /** 表示サイズの段。1が最大 */
    tier: z.number().default(2),
    order: z.number().default(0),
  }),
});

export const collections = { items, event, sponsors };
