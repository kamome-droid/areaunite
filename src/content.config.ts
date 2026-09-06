import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { groups } from "./config/site";

/* =========================================================
   コンテンツ定義
   将来の管理画面は、この3つのコレクションのMarkdownを
   読み書きするだけで成立するように最小限にしている。
   ========================================================= */

/** カードとして並ぶ項目すべて（上映作品・出演者・出店・宿…）。group で置き場所が決まる */
const items = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/items" }),
  schema: z.object({
    /** どの分類に置くか。site.ts の groups のキー。
        打ち間違いはビルド時に弾かれる */
    group: z.enum(Object.keys(groups) as [string, ...string[]]),
    title: z.string(),
    /** 作品なら監督・レーベル、出店なら業種など、タイトルの上に小さく出る文字 */
    subtitle: z.string().optional(),
    /** 開始時刻。"17:30" のように入れるとスケジュールに差し込まれる */
    time: z.string().optional(),
    /** どの開催日か。開催回の schedule の id（day1 / day2 …）を指す。
        並び順と日付表示はここから引くので、日付を直接書く必要はない。
        複数日ある開催では必ず指定する（未指定はすべての日に出る）。 */
    day: z.string().optional(),
    /** 日付を個別に上書きしたいときだけ使う。通常は day から自動で決まる */
    date: z.string().optional(),
    /** 上映時間。"10 min" のように入れると日時の横に出る */
    runtime: z.string().optional(),
    /** 予告編などの動画URL（YouTube / Vimeo）。入れると個別ページの主役になる */
    video: z.string().optional(),
    /** サブ画像。本文の下に並ぶ */
    gallery: z.array(z.string()).default([]),
    /** 一覧のサムネイル（/public 起点）。
        未指定でも video があれば YouTube のサムネイルが使われる */
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
  /** items コレクションの group キー。その日の項目が時刻順に入る。
      配列で複数の分類をまとめて差し込むこともできる（第1部にトークとライブ、など）。
      名前の書き方は分類ごとの scheduleFormat で決まる */
  include: z.union([z.string(), z.array(z.string())]).optional(),
  /** 直接書く行 */
  items: z.array(timeSlot).default([]),
});

/** スケジュールは日ごとに分ける（DAY 1 / DAY 2 …）。
    ここに1件足すと、スケジュールページに日が1つ増える。 */
const scheduleDay = z.object({
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
    /* ---- 基本 ---- */
    /** "AREA UNITE 2026" のような開催回の名前 */
    edition: z.string(),
    /** 画面に出す日付表記。"2026.10.17 sat. - 10.18 sun." のように書く。
        月日は大きくキーカラー、年と曜日は小さく組まれる */
    dateLabel: z.string(),
    /** 並び替え・終了判定に使う開催日 */
    date: z.coerce.date(),
    /** サイトの主役にする開催回か。複数の回があるとき1つだけ true にする */
    current: z.boolean().default(false),

    /* ---- KV ---- */
    /** KV画像（/public 起点） */
    hero: z.string().default(""),
    /** KVの見せ方
        overlay … 写真の上にイベント名や日付を重ねる（KVに文字が入っていないとき）
        band    … KVを切らずに全部見せ、日付は下に置く
                  （KVにロゴやタイトルが描き込まれているとき）
        split   … 左に情報・右にKV。KVを切らず、情報とまとめて1画面のヒーローにする */
    heroStyle: z.enum(["overlay", "band", "split"]).default("overlay"),
    /** KVに添えるキャッチ */
    catch: z.string().default(""),
    /** キャッチのすぐ下に出す案内。note は小さな説明文、label はボタンの文字 */
    heroCta: z
      .object({
        note: z.string().optional(),
        label: z.string(),
        href: z.string(),
      })
      .optional(),
    /** 開催後に出すお礼メッセージ（入れるとKVの下に告知帯が出る） */
    afterMessage: z.string().optional(),

    /* ---- 紹介（ABOUT） ---- */
    /** トップページのABOUTに出る冒頭の文。ABOUTページでは本文の先頭に置かれる */
    aboutLead: z.string().default(""),
    /** PRムービー（YouTube / Vimeo）。ABOUTに埋め込まれる */
    prVideo: z.string().optional(),

    /* ---- 会場 ---- */
    venue: z.string().default(""),
    address: z.string().default(""),
    /** 地図。書かなければ address（なければ venue）で検索する形に組み立てる */
    mapUrl: z.string().optional(),
    mapEmbed: z.string().optional(),
    /** 駐車場や交通手段の案内。1行ずつ並ぶ */
    accessNotes: z.array(z.string()).default([]),

    /* ---- スケジュール ---- */
    schedule: z.array(scheduleDay).default([]),

    /* ---- チケット ---- */
    tickets: z.array(ticketRow).default([]),
    /** 購入ボタン。書かなければボタンは出ない */
    ticketUrl: z.string().optional(),
    ticketUrlLabel: z.string().optional(),
    ticketNotes: z.array(z.string()).default([]),

    /* ---- 出演・協賛 ---- */
    /** 名前だけを並べる欄（来場ライダーなど） */
    guests: z.array(z.string()).default([]),
    guestsLabel: z.string().default("来場ライダー"),
    /** ロゴではなく名前だけを並べる欄（後援・協力） */
    supporters: z.array(z.string()).default([]),
    supportersLabel: z.string().default("後援"),
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
