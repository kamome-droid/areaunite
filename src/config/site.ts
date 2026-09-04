/* =========================================================
   SITE CONFIG — イベントごとに差し替える2枚目のファイル
   サイト名・SNS・「コンテンツの分類」をここで定義する。
   groups に1件足すと、その親ページにセクションが1つ増え、
   グローバルナビの子メニューにも自動で並ぶ。
   ========================================================= */

export const site = {
  /** イベント名（ヘッダーのロゴ代替・OG・タイトルに使う） */
  name: "AREA UNITE",
  /** 英字のキャッチ（KVとフッターに出る） */
  tagline: "Together, one in unity.",
  /** 日本語のひとこと説明（meta description の既定値） */
  description:
    "雪山や自然を愛する人々が集い、映像・音楽・対話を通じてカルチャーを共有する、体験型アウトドア・ムービーフェスティバル。",
  /** ロゴ画像（/public 起点）。空ならイベント名のテキストロゴになる。
      透明の余白を落としたものを置くこと（余白があるとヘッダーで小さく見える） */
  logo: "/images/logo/logo.png",
  /** ロゴ画像の実寸。縦横比だけ使うので、差し替えたら実寸に合わせる */
  logoSize: { w: 720, h: 139 },
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

/* ---------------------------------------------------------
   親ページ（グローバルナビの5項目）
   --------------------------------------------------------- */

export type Parent = "contents" | "access";

/** 親ページのパス。groups の parent はこのキーを指す */
export const parents: Record<Parent, { label: string; jp: string; href: string }> = {
  contents: { label: "Contents", jp: "コンテンツ", href: "/contents/" },
  access: { label: "Access", jp: "アクセス・宿泊", href: "/access/" },
};

/* ---------------------------------------------------------
   コンテンツの分類
   1件 = 親ページの中の1セクション ＝ ナビの子メニュー1つ
   --------------------------------------------------------- */

export type Group = {
  /** 英字見出し */
  label: string;
  /** 日本語の見出し（ナビに出るのはこちら） */
  jp: string;
  /** セクション冒頭のリード文 */
  lead?: string;
  /** カードの並べ方 */
  layout: "grid" | "list";
  /** カード画像の比率 */
  ratio?: "16 / 9" | "4 / 3" | "1 / 1" | "3 / 4";
  /** どの親ページに置くか */
  parent: Parent;
};

export const groups: Record<string, Group> = {
  movies: {
    label: "Movies",
    jp: "ムービー",
    lead: "夜の部で上映するフィルムのラインナップ。",
    layout: "list",
    ratio: "16 / 9",
    parent: "contents",
  },
  live: {
    label: "Live",
    jp: "ライブ",
    lead: "ライブアクトとDJのラインナップ。",
    layout: "grid",
    ratio: "1 / 1",
    parent: "contents",
  },
  talk: {
    label: "Talk Show",
    jp: "トークショー",
    lead: "昼の部のトークセッションとワークショップ。",
    layout: "grid",
    ratio: "4 / 3",
    parent: "contents",
  },
  foods: {
    label: "Foods",
    jp: "フード",
    lead: "会場に並ぶ飲食ブース。",
    layout: "grid",
    ratio: "4 / 3",
    parent: "contents",
  },
  shops: {
    label: "Shop & Booth",
    jp: "ショップ ＆ ブース",
    lead: "出店ブースとマーケット。",
    layout: "grid",
    ratio: "4 / 3",
    parent: "contents",
  },
  stay: {
    label: "Stay",
    jp: "宿泊",
    lead: "会場周辺のキャンプサイトと宿泊施設。",
    layout: "grid",
    ratio: "16 / 9",
    parent: "access",
  },
};

/** 指定した親ページに属する分類を、定義順で返す */
export function groupsOf(parent: Parent) {
  return Object.entries(groups).filter(([, g]) => g.parent === parent);
}
