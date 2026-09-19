// 管理画面のフィールド定義。フォームの描画と保存（frontmatter生成）の両方をここが決める。
//
// サイトの「ページ」単位で画面を分けている。開催回の情報は1ファイルに入っているが、
// トップページ・スケジュール・アクセスの3画面に分けて出す（editable で担当を決める）。

export type Field =
  | {
      name: string;
      label: string;
      type: "text" | "textarea";
      placeholder?: string;
      help?: string;
      /** この分類のときは出さない */
      hideFor?: string[];
    }
  | { name: string; label: string; type: "image"; help?: string }
  | { name: string; label: string; type: "images"; help?: string; /** 置き場所を変える。省略するとこの画面の既定 */ media?: string }
  | { name: string; label: string; type: "boolean"; help?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; help?: string }
  /** select と同じだが、押して選ぶボタンの並びで出す */
  | { name: string; label: string; type: "pills"; options: { value: string; label: string }[]; help?: string }
  /** 本文。置いた位置に出す（省略すると一番下） */
  | { name: string; label: string; type: "body" }
  /** 別コレクションの項目を、この画面の中で直接編集する */
  | {
      name: string;
      label: string;
      type: "sub";
      collection: string;
      addLabel?: string;
      /** その場で中身まで編集する。項目が少ないものはこちら */
      inline?: boolean;
      /** 1件を1行に収める。ロゴ一覧のように件数が多いとき */
      layout?: "line";
    }
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
  /** 開催日そのもの（日付と時間帯）。ここに1件足すと DAY が1日増える */
  | { name: string; label: string; type: "days"; help?: string }
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
  /** 同じフォルダを複数の画面で分け合うときの絞り込み */
  filter?: (data: Record<string, any>) => boolean;
  /** 新規作成のときに入れておく値 */
  defaults?: Record<string, any>;
  /** 「一覧へ戻る」の行き先。別の画面に属している項目のため */
  backTo?: string;
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
    hasBody: false,
    preview: () => "/",
    // 並びはトップページの見た目と同じ順（上から順に画面へ出る）
    fields: [
      {
        name: "notice",
        label: "お知らせの帯（全ページの一番上）",
        type: "group",
        fields: [
          { name: "text", label: "文言", type: "text", placeholder: "アンケートにご協力ください" },
          { name: "label", label: "ボタンの文字", type: "text", placeholder: "回答する" },
          { name: "href", label: "リンク先", type: "text" },
        ],
      },
      { name: "hero", label: "KV画像", type: "image" },
      {
        name: "tagline",
        label: "KVの英字キャッチ",
        type: "text",
        placeholder: "Together, one in unity.",
        help: "KVの上とフッター、SNS画像に出ます",
      },
      { name: "edition", label: "開催回の名前", type: "text", placeholder: "AREA UNITE 2026" },
      { name: "catch", label: "キャッチコピー", type: "textarea" },
      {
        name: "heroCta",
        label: "KV下の案内ボタン",
        type: "group",
        fields: [
          { name: "note", label: "説明文", type: "text", placeholder: "入場にはチケットが必要です" },
          { name: "label", label: "ボタンの文字", type: "text", placeholder: "Ticket" },
          { name: "href", label: "リンク先", type: "text", placeholder: "/ticket/" },
        ],
      },
      {
        name: "photos",
        label: "フォトギャラリー",
        type: "images",
        media: "photos",
        help: "ABOUTのムービーの下に、横スクロールで並びます",
      },
      { name: "schedule", label: "開催日", type: "days" },
      { name: "guests", label: "ゲストの名前", type: "lines", help: "1行に1人ずつ。改行で区切ってください" },
      {
        name: "sponsors",
        label: "協賛",
        type: "sub",
        collection: "sponsors",
        addLabel: "＋ 協賛を追加",
        inline: true,
        layout: "line",
      },
      { name: "supporters", label: "後援・協力団体", type: "lines", help: "1行に1つずつ。改行で区切ってください" },

      // ここから下は、ページの一番下（フッター）とサイト全体に効くもの
      {
        name: "sns",
        label: "SNSのリンク",
        type: "group",
        help: "入れたものだけ、ヘッダー・フッター・お問い合わせにアイコンが出ます",
        fields: [
          { name: "instagram", label: "Instagram", type: "text", placeholder: "https://www.instagram.com/…" },
          { name: "x", label: "X", type: "text", placeholder: "https://x.com/…" },
          { name: "youtube", label: "YouTube", type: "text", placeholder: "https://www.youtube.com/@…" },
        ],
      },
      { name: "contactEmail", label: "お問い合わせのメールアドレス", type: "text", help: "お問い合わせページに出ます" },
      {
        name: "hashtags",
        label: "SNS投稿のハッシュタグ",
        type: "lines",
        help: "1行に1つずつ。SNS画像ダウンロードのキャプションに付きます",
      },
      {
        name: "description",
        label: "検索やシェアで出る説明文",
        type: "textarea",
        help: "Google の検索結果や、LINE・X でURLを送ったときに出ます",
      },

      // 画面には出さない。開催回が増えたとき、どれが新しいかを決めるためだけの値
      { name: "date", label: "開催日", type: "hidden" },
      // 画面には出さない。開催回が1つしか無いあいだは意味が無く、
      // 増えたときは日付の新しいものが自動で選ばれる
      { name: "current", label: "この開催回をサイトに出す", type: "hidden" },
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
    preview: () => "/about/",
    // 並びはアバウトページの見た目と同じ順
    fields: [
      { name: "aboutLead", label: "冒頭の文（トップページにも出ます）", type: "textarea" },
      { name: "body", label: "続きの文", type: "body" },
      {
        name: "prVideo",
        label: "PRムービーのリンク",
        type: "text",
        placeholder: "https://youtu.be/xxxxxxx",
      },
    ],
  },

  /* ---- チケット ---- */
  ticket: {
    ...eventBase,
    key: "ticket",
    label: "チケット",
    labelOne: "チケット",
    hasBody: false,
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
      { name: "ticketUrl", label: "チケット購入先URL", type: "text" },
      { name: "ticketNotes", label: "注意事項", type: "lines" },
      { name: "ticketMessage", label: "一番下に添える文", type: "textarea", placeholder: "応援チケットの販売もしています。" },
    ],
  },

  /* ---- スケジュール ---- */
  schedule: {
    ...eventBase,
    key: "schedule",
    label: "スケジュール",
    labelOne: "スケジュール",
    hasBody: false,
    preview: () => "/schedule/",
    fields: [{ name: "schedule", label: "開催日", type: "schedule" }],
  },

  /* ---- アクセス ---- */
  access: {
    ...eventBase,
    key: "access",
    label: "アクセス",
    labelOne: "アクセス",
    hasBody: false,
    preview: () => "/access/",
    fields: [
      { name: "venue", label: "会場名", type: "text", placeholder: "白馬五竜 HAKUBA GORYU" },
      { name: "address", label: "住所", type: "text" },
      { name: "mapEmbed", label: "地図のURL", type: "text" },
      { name: "accessNotes", label: "駐車場・行き方の案内", type: "lines" },
      { name: "stay", label: "宿泊", type: "sub", collection: "stay", addLabel: "＋ 宿泊先を追加" },
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
    // 宿泊はアクセス画面から編集するので、ここには出さない
    filter: (data) => data.group !== "stay",
    // 個別ページと見比べられるようにする
    preview: (id, data) => (data.group ? `/${data.group}/${id}/` : `/contents/#${id}`),
    // 並びは個別ページの見た目と同じ順にしてある（上から順に画面へ出る）
    fields: [
      { name: "group", label: "分類", type: "pills", options: [] }, // 起動時に site.ts から埋める
      { name: "video", label: "動画", type: "text", placeholder: "https://youtu.be/xxxxxxx", hideFor: ["foods", "shops"] },
      { name: "image", label: "画像", type: "image" },
      { name: "subtitle", label: "制作者・チーム名", type: "text" },
      { name: "title", label: "作品タイトル", type: "text" },
      { name: "day", label: "開催日", type: "select", options: [] }, // 起動時に開催回から埋める
      { name: "time", label: "開始時刻", type: "text", placeholder: "17:30", help: "入れると[スケジュール](/admin/schedule/)に並びます" },
      { name: "runtime", label: "所要時間", type: "text", placeholder: "10 min" },
      { name: "body", label: "紹介文", type: "body" },
      { name: "gallery", label: "キャプチャ画像", type: "images" },
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
    // 協賛はトップページ画面から開く
    backTo: "/admin/top/2026",
    preview: () => "/#sponsors",
    fields: [
      // 社名は打たせない。ロゴの画像ファイル名から自動で入れて、
      // 画像の代替テキストとファイル名にだけ使う
      { name: "name", label: "社名・団体名", type: "hidden" },
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

  /* ---- 宿泊（アクセスページに出る） ---- */
  stay: {
    key: "stay",
    label: "宿泊",
    labelOne: "宿泊施設",
    dir: "src/content/items",
    media: "items",
    hasBody: true,
    bodyLabel: "紹介文",
    titleField: "title",
    order: "order",
    slug: { mode: "field", field: "title" },
    filter: (data) => data.group === "stay",
    defaults: { group: "stay" },
    // 宿泊はアクセス画面から開く
    backTo: "/admin/access/2026",
    preview: () => "/access/#stay",
    fields: [
      { name: "group", label: "分類", type: "hidden" },
      { name: "title", label: "施設名", type: "text" },
      { name: "subtitle", label: "エリア・種別", type: "text" },
      { name: "image", label: "画像", type: "image" },
      { name: "body", label: "紹介文", type: "body" },
      { name: "link", label: "外部リンク", type: "text" },
      { name: "linkLabel", label: "リンクの文字", type: "text", placeholder: "公式サイトで予約" },
      { name: "draft", label: "下書き（公開しない）", type: "boolean" },
      { name: "order", label: "表示順", type: "hidden" },
    ],
  },
};

/** コレクションではないが、メニューに並べる画面 */
export const tools = [{ key: "share", label: "SNS画像ダウンロード", href: "/admin/share/" }] as const;

/** サイドメニューに出す順番 */
export const menu = [
  "top",
  "about",
  "schedule",
  "items",
  "ticket",
  "access",
] as const;
