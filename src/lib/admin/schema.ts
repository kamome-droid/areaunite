// 管理画面のフィールド定義。フォームの描画と保存（frontmatter生成）の両方をここが決める。
//
// サイトの「ページ」単位で画面を分けている。開催回の情報は1ファイルに入っているが、
// トップページ・スケジュール・アクセスの3画面に分けて出す（editable で担当を決める）。

export type Field =
  | {
      name: string;
      label: string;
      type: "text" | "textarea" | "markdown" | "number" | "datetime";
      placeholder?: string;
      help?: string;
    }
  | { name: string; label: string; type: "image"; help?: string }
  | { name: string; label: string; type: "images"; help?: string }
  | { name: string; label: string; type: "boolean"; help?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; help?: string }
  /** 文字列の並び（注意事項・ゲスト名など）。1行1件 */
  | { name: string; label: string; type: "lines"; placeholder?: string; help?: string }
  /** 決まった列を持つ行の並び（チケット料金など） */
  | {
      name: string;
      label: string;
      type: "rows";
      columns: { name: string; label: string; width?: string }[];
      help?: string;
    }
  /** 入れ子の1かたまり（KV下の案内など） */
  | { name: string; label: string; type: "group"; fields: Field[]; help?: string }
  /** 開催日ごとのプログラム。専用のエディタで編集する */
  | { name: string; label: string; type: "schedule"; help?: string }
  /** 画面に出さずそのまま保持する */
  | { name: string; label: string; type: "hidden" };

export interface CollectionDef {
  key: string;
  label: string;
  labelOne: string;
  dir: string;
  media: string;
  hasBody: boolean;
  bodyLabel?: string;
  /** 単一ファイルを直接編集する画面。値は固定のファイル名 */
  singleton?: string;
  /** 一覧の見出しに使う項目 */
  titleField: string;
  /** 一覧の並びに使う項目 */
  order?: string;
  /** 新規作成時のファイル名の作り方 */
  slug: { mode: "timestamp" } | { mode: "field"; field: string };
  /** この画面が担当する項目。同じファイルを複数の画面で分担するために使う */
  fields: Field[];
  /** 一覧でグループ分けに使う項目 */
  groupBy?: string;
  intro?: string;
  /** 右に出すプレビューの行き先。編集中の内容が実際どう出るかを見せる */
  preview?: (id: string, data: Record<string, any>) => string;
}

/* ---------------------------------------------------------
   開催回（1ファイル）を3つの画面で分担する
   --------------------------------------------------------- */

const EVENT_FILE = "2026";

const eventBase = {
  dir: "src/content/event",
  media: "kv",
  singleton: EVENT_FILE,
  titleField: "edition",
  slug: { mode: "field" as const, field: "edition" },
};

export const collections: Record<string, CollectionDef> = {
  /* ---- トップページ ---- */
  top: {
    ...eventBase,
    key: "top",
    label: "トップページ",
    labelOne: "トップページ",
    hasBody: true,
    bodyLabel: "ABOUT の本文",
    intro: "KV・キャッチコピー・ゲスト・協賛が入ります。",
    preview: () => "/",
    fields: [
      { name: "edition", label: "開催回の名前", type: "text", placeholder: "AREA UNITE 2026" },
      {
        name: "dateLabel",
        label: "日付の表記",
        type: "text",
        placeholder: "2026.10.17 sat. - 10.18 sun.",
        help: "月日が大きくキーカラーで、年と曜日は小さく出ます",
      },
      { name: "date", label: "開催日（並び替え用）", type: "datetime" },

      { name: "hero", label: "KV画像", type: "image" },
      {
        name: "heroStyle",
        label: "KVの見せ方",
        type: "select",
        options: [
          { value: "split", label: "左に情報・右にKV（ロゴ入りのKV向け）" },
          { value: "band", label: "KVを丸ごと見せ、情報は下（ロゴ入りのKV向け）" },
          { value: "overlay", label: "KVに文字を重ねる（文字なしの写真向け）" },
        ],
        help: "KVにロゴやタイトルが描き込まれている場合、重ねると二重になります",
      },
      { name: "catch", label: "キャッチコピー", type: "textarea" },
      {
        name: "heroCta",
        label: "KV下の案内ボタン",
        type: "group",
        help: "空にすると出ません",
        fields: [
          { name: "note", label: "説明文", type: "text", placeholder: "入場にはチケットが必要です" },
          { name: "label", label: "ボタンの文字", type: "text", placeholder: "Ticket" },
          { name: "href", label: "リンク先", type: "text", placeholder: "/ticket/" },
        ],
      },
      {
        name: "afterMessage",
        label: "開催後のお礼メッセージ",
        type: "text",
        help: "書くとKVの下に告知帯が出ます。ふだんは空のまま",
      },
      { name: "guestsLabel", label: "ゲスト欄の見出し", type: "text", placeholder: "来場ライダー" },
      { name: "guests", label: "ゲストの名前", type: "lines", help: "1行に1名" },
      { name: "supportersLabel", label: "後援欄の見出し", type: "text", placeholder: "後援" },
      { name: "supporters", label: "後援・協力団体", type: "lines", help: "1行に1件" },

      { name: "current", label: "この開催回をサイトに出す", type: "boolean" },
    ],
  },

  /* ---- ABOUT ---- */
  about: {
    ...eventBase,
    key: "about",
    label: "アバウト",
    labelOne: "アバウト",
    hasBody: true,
    bodyLabel: "続きの文",
    intro:
      "冒頭の文はトップページのABOUTにも出ます。続きの文はアバウトページだけに出ます。",
    preview: () => "/about/",
    fields: [
      {
        name: "aboutLead",
        label: "冒頭の文",
        type: "textarea",
        help: "トップページのABOUTに出るのはここまでです",
      },
      {
        name: "prVideo",
        label: "PRムービー",
        type: "text",
        placeholder: "https://youtu.be/xxxxxxx",
        help: "YouTube / Vimeo のURL。トップページとアバウトページに埋め込まれます",
      },
    ],
  },

  /* ---- チケット ---- */
  ticket: {
    ...eventBase,
    key: "ticket",
    label: "チケット",
    labelOne: "チケット",
    hasBody: true,
    intro: "料金と注意事項です。KV下の案内ボタンはトップページで編集します。",
    preview: () => "/ticket/",
    fields: [
      {
        name: "tickets",
        label: "チケット料金",
        type: "rows",
        columns: [
          { name: "label", label: "券種", width: "2fr" },
          { name: "price", label: "料金", width: "1fr" },
          { name: "note", label: "補足", width: "2fr" },
        ],
      },
      {
        name: "ticketUrl",
        label: "チケット購入先URL",
        type: "text",
        help: "書くとチケットページに購入ボタンが出ます",
      },
      { name: "ticketUrlLabel", label: "購入ボタンの文字", type: "text", placeholder: "チケットを購入する" },
      { name: "ticketNotes", label: "注意事項", type: "lines", help: "1行に1件" },
    ],
  },

  /* ---- スケジュール ---- */
  schedule: {
    ...eventBase,
    key: "schedule",
    label: "スケジュール",
    labelOne: "スケジュール",
    hasBody: true,
    intro:
      "開催日ごとのプログラムです。上映作品や出演者は「コンテンツ」で登録した項目を差し込むので、ここに書き写す必要はありません。",
    preview: () => "/schedule/",
    fields: [{ name: "schedule", label: "開催日", type: "schedule" }],
  },

  /* ---- アクセス ---- */
  access: {
    ...eventBase,
    key: "access",
    label: "アクセス",
    labelOne: "アクセス",
    hasBody: true,
    intro: "会場の場所と行き方です。宿泊施設は「コンテンツ」から登録します。",
    preview: () => "/access/",
    fields: [
      { name: "venue", label: "会場名", type: "text", placeholder: "白馬五竜 HAKUBA GORYU" },
      { name: "address", label: "住所", type: "text" },
      {
        name: "mapUrl",
        label: "地図のリンク先",
        type: "text",
        help: "空にすると住所（なければ会場名）で検索した地図になります",
      },
      { name: "mapEmbed", label: "埋め込み地図のURL", type: "text", help: "同上" },
      { name: "accessNotes", label: "駐車場・行き方の案内", type: "lines", help: "1行に1件" },
    ],
  },

  /* ---- コンテンツ ---- */
  items: {
    key: "items",
    label: "コンテンツ",
    labelOne: "項目",
    dir: "src/content/items",
    media: "items",
    hasBody: true,
    bodyLabel: "紹介文",
    titleField: "title",
    order: "order",
    groupBy: "group",
    slug: { mode: "field", field: "title" },
    intro:
      "上映作品・出演者・出店・宿泊です。日と時刻を入れると、スケジュールにも自動で並びます。",
    preview: (id, data) =>
      data.group === "stay" ? "/access/#stay" : `/contents/#${id}`,
    fields: [
      { name: "group", label: "分類", type: "select", options: [] }, // 起動時に site.ts から埋める
      { name: "title", label: "名前・作品名", type: "text" },
      {
        name: "subtitle",
        label: "肩書き・制作者",
        type: "text",
        help: "作品なら制作チーム名、出店なら業種など。名前の上に小さく出ます",
      },
      { name: "day", label: "開催日", type: "select", options: [] }, // 起動時に開催回から埋める
      { name: "time", label: "開始時刻", type: "text", placeholder: "17:30", help: "入れるとスケジュールに並びます" },
      { name: "runtime", label: "上映時間", type: "text", placeholder: "10 min" },
      { name: "image", label: "画像", type: "image", help: "動画がある場合は、未指定でもYouTubeのサムネイルが使われます" },
      { name: "video", label: "動画", type: "text", placeholder: "https://youtu.be/xxxxxxx", help: "YouTube / Vimeo。入れると個別ページの主役になります" },
      { name: "gallery", label: "サブ画像", type: "images", help: "紹介文の下に並びます" },
      { name: "link", label: "外部リンク", type: "text", help: "公式サイトなど" },
      { name: "linkLabel", label: "リンクの文字", type: "text", placeholder: "公式サイトで予約" },
      { name: "featured", label: "トップページの「注目」に出す", type: "boolean" },
      { name: "draft", label: "下書き（公開しない）", type: "boolean" },
      { name: "order", label: "表示順", type: "hidden" },
    ],
  },

  /* ---- 協賛（トップページから開く） ---- */
  sponsors: {
    key: "sponsors",
    label: "協賛",
    labelOne: "協賛",
    dir: "src/content/sponsors",
    media: "sponsors",
    hasBody: false,
    titleField: "name",
    order: "order",
    slug: { mode: "field", field: "name" },
    intro: "ロゴは黒背景に合わせて白抜きで表示されます。ロゴが無いときは社名の文字で出ます。",
    preview: () => "/#sponsors",
    fields: [
      { name: "name", label: "社名・団体名", type: "text" },
      { name: "logo", label: "ロゴ画像", type: "image" },
      { name: "url", label: "リンク先", type: "text" },
      {
        name: "tier",
        label: "表示の大きさ",
        type: "select",
        options: [
          { value: "1", label: "大" },
          { value: "2", label: "中" },
          { value: "3", label: "小" },
        ],
      },
      { name: "order", label: "表示順", type: "hidden" },
    ],
  },
};

/** サイドメニューに出す順番 */
export const menu = [
  "top",
  "about",
  "schedule",
  "items",
  "ticket",
  "access",
] as const;
