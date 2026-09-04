/* =========================================================
   SITE CONFIG — イベントごとに差し替える2枚目のファイル
   サイト名・ナビ・SNS・「一覧ページの種類」をここで定義する。
   groups に1件足すと、その一覧ページとナビが自動で増える。
   ========================================================= */

export const site = {
  /** イベント名（ヘッダーのロゴ代替・OG・タイトルに使う） */
  name: "AREA UNITE",
  /** 英字のキャッチ（KVとヘッダー上部の細い帯に出る） */
  tagline: "Together, one in unity.",
  /** 日本語のひとこと説明（meta description の既定値） */
  description:
    "雪山や自然を愛する人々が集い、映像・音楽・対話を通じてカルチャーを共有する、体験型アウトドア・ムービーフェスティバル。",
  /** ロゴ画像（/public 起点）。空ならイベント名のテキストロゴになる。
      本番のロゴデータを受け取ったら "/images/logo.svg" のように指定する */
  logo: "",
  /** SNSでシェアされたときの画像 */
  ogImage: "/images/kv/og.jpg",
  /** フッターのコピーライト表記 */
  copyright: "AREA UNITE",
  sns: {
    instagram: "https://www.instagram.com/areaunite_film_festival/",
    x: "",
    youtube: "",
  },
  /** お問い合わせ */
  contact: {
    /** フォームの送信先URL。空のあいだフォームは「未接続」表示になり、送信できない */
    endpoint: "",
    /** 連絡先メールアドレス（任意） */
    email: "",
  },
  /** ヘッダー右のCTAボタン。不要なら null */
  headerCta: { label: "Ticket", href: "/ticket/" } as {
    label: string;
    href: string;
  } | null,
} as const;

/** 一覧ページ（カードが並ぶページ）の定義 */
export type Group = {
  /** 英字見出し */
  label: string;
  /** 日本語の副題 */
  jp: string;
  /** ページ冒頭のリード文 */
  lead?: string;
  /** カードの並べ方 */
  layout: "grid" | "list";
  /** カード画像の比率 */
  ratio?: "16 / 9" | "4 / 3" | "1 / 1" | "3 / 4";
  /** グローバルナビに出すか */
  inNav: boolean;
};

export const groups: Record<string, Group> = {
  movies: {
    label: "Movies",
    jp: "上映作品",
    lead: "夜の部で上映するフィルムのラインナップ。",
    layout: "list",
    ratio: "16 / 9",
    inNav: true,
  },
  daytime: {
    label: "Day Time",
    jp: "トークショー ＆ ライブ",
    lead: "昼の部のトークショー、ライブ、ワークショップ。",
    layout: "grid",
    ratio: "4 / 3",
    inNav: true,
  },
  music: {
    label: "Music",
    jp: "アーティスト ＆ DJ",
    lead: "アフターパーティに登場するアーティストとDJ。",
    layout: "grid",
    ratio: "1 / 1",
    inNav: true,
  },
  foods: {
    label: "Foods",
    jp: "フード ＆ ドリンク",
    lead: "会場に並ぶ飲食店。",
    layout: "grid",
    ratio: "4 / 3",
    inNav: true,
  },
  shops: {
    label: "Shop & Booth",
    jp: "ショップ ＆ ブース",
    lead: "出店ブースとマーケット。",
    layout: "grid",
    ratio: "4 / 3",
    inNav: true,
  },
  stay: {
    label: "Stay",
    jp: "泊まる",
    lead: "会場周辺のキャンプサイトと宿泊施設。",
    layout: "grid",
    ratio: "16 / 9",
    inNav: true,
  },
};

export type NavItem = { label: string; jp?: string; href: string };

/** グローバルナビ（groups から自動生成し、固定ページを前後に足す） */
export const nav: NavItem[] = [
  { label: "About", jp: "エリアユナイトとは", href: "/#about" },
  { label: "Ticket", jp: "チケット", href: "/ticket/" },
  ...Object.entries(groups)
    .filter(([, g]) => g.inNav)
    .map(([key, g]) => ({ label: g.label, jp: g.jp, href: `/${key}/` })),
  { label: "Access", jp: "アクセス", href: "/access/" },
  { label: "Contact", jp: "お問い合わせ", href: "/contact/" },
];
