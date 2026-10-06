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
  /** SNSでシェアされたときの画像。空なら今のKVから自動で作る（/api/share.jpg） */
  ogImage: "",
  /** フッターのコピーライト表記 */
  copyright: "AREA UNITE",
  /** SNS画像のキャプションに付くハッシュタグの既定。
      ふだんは管理画面（トップページ）で入れたものが使われる */
  hashtags: [] as string[],
  /** お問い合わせ */
  contact: {
    /** フォームの送信先URL。空のあいだフォームは「未接続」表示になり、送信できない。
        Web3Forms（web3forms.com）を使っている。送信内容は accessKey を登録した
        メールアドレスに届く */
    endpoint: "https://api.web3forms.com/submit",
    /** Web3Forms のアクセスキー。HTMLに出る前提のもので、隠す必要はない。
        受信先を変えるときは Web3Forms 側で設定し、作り直したらここを差し替える */
    accessKey: "64c55b36-9006-4119-b08c-7099ecfae495",
  },
  // SNSのリンクと連絡先メールは、管理画面（トップページ）で入れる
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
  /** セクション冒頭のリード文。見出しから分かることは書かない。
      補足が要るときだけ入れる（例：入場に条件がある、など） */
  lead?: string;
  /** カード画像の比率 */
  ratio?: "16 / 9" | "4 / 3" | "1 / 1" | "3 / 4";
  /** カード1枚の最小幅。説明文が長い分類は広げる */
  cardMin?: string;
  /** 項目ごとに個別ページを持つ。持つとカードや一覧からそのページへ飛べる
      （画面上ではモーダルで開き、直接URLを叩けばページとして開く） */
  detail?: boolean;
  /** 映像を使う分類か。false なら動画を出さず、管理画面にも欄を出さない */
  video?: boolean;
  /** 所要時間に添えるラベル。ムービーなら Runtime、ライブなら Set など。
      既定は Runtime */
  runtimeLabel?: string;
  /** タイムテーブルでの名前の書き方。
      bracket … 制作者「作品名」（映画のように作り手を併記したいとき）
      plain   … 名前だけ（出演者のように名前で通じるとき。既定） */
  scheduleFormat?: "bracket" | "plain";
  /** 管理画面での欄の名前。分類ごとに呼び方が違うので、ここで決める。
      subtitle … タイトルの上に小さく出る文字 / title … 名前 */
  labels?: { subtitle?: string; title?: string };
  /** どの親ページに置くか */
  parent: Parent;
};

export const groups: Record<string, Group> = {
  movies: {
    labels: { subtitle: "制作者・チーム名", title: "作品タイトル" },
    label: "Movies",
    jp: "ムービー",
    ratio: "16 / 9",
    // 一覧では作品名と上映日時まで。紹介文は個別ページで読ませる
    cardMin: "300px",
    detail: true,
    runtimeLabel: "Runtime",
    scheduleFormat: "bracket",
    parent: "contents",
  },
  live: {
    labels: { subtitle: "ジャンル・肩書き", title: "アーティスト名" },
    label: "Live",
    jp: "ライブ",
    ratio: "16 / 9",
    cardMin: "300px",
    detail: true,
    runtimeLabel: "Set",
    parent: "contents",
  },
  talk: {
    labels: { subtitle: "登壇者", title: "トークのタイトル" },
    label: "Talk Show",
    jp: "トークショー",
    ratio: "16 / 9",
    cardMin: "300px",
    detail: true,
    runtimeLabel: "Duration",
    parent: "contents",
  },
  dj: {
    labels: { subtitle: "肩書き・拠点", title: "DJ名" },
    label: "DJ",
    jp: "DJ",
    ratio: "16 / 9",
    cardMin: "300px",
    detail: true,
    runtimeLabel: "Set",
    parent: "contents",
  },
  foods: {
    labels: { subtitle: "料理のジャンル", title: "店名" },
    video: false,
    label: "Foods",
    jp: "フード",
    ratio: "16 / 9",
    cardMin: "300px",
    detail: true,
    parent: "contents",
  },
  shops: {
    labels: { subtitle: "業種・ジャンル", title: "店名・ブース名" },
    video: false,
    label: "Shop & Booth",
    jp: "ショップ ＆ ブース",
    ratio: "16 / 9",
    cardMin: "300px",
    detail: true,
    parent: "contents",
  },
  stay: {
    label: "Stay",
    jp: "宿泊",
    ratio: "16 / 9",
    parent: "access",
  },
};

/** 指定した親ページに属する分類を、定義順で返す */
export function groupsOf(parent: Parent) {
  return Object.entries(groups).filter(([, g]) => g.parent === parent);
}
