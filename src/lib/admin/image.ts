import sharp from "sharp";

/**
 * 上げてもらった画像を、置き場所ごとの決まった形にそろえる。
 *
 * バラバラの大きさのまま置くと、表示では切り抜かれるので見た目は保てるが、
 * 元のファイルがそのままリポジトリに入って重くなる。ここで先に整える。
 */
type Rule = {
  width: number;
  height?: number;
  format: "webp" | "png";
  /** 決まった形に収める方法。
      pad … 切らずに全部入れて、足りない辺を黒で埋める（カードが並んだときに形がそろう）
      crop … はみ出す部分を切り落とす */
  fit?: "pad" | "crop";
};

/** 置き場所（def.media）ごとの決まり */
const RULES: Record<string, Rule> = {
  // コンテンツの画像。YouTubeのサムネイルと同じ 16:9 にそろえる。
  // 縦長の写真でも切り落とさず、左右に黒い縁を付けて収める
  items: { width: 1280, height: 720, format: "webp", fit: "pad" },
  // ロゴ。形はそのまま、透過を残したいのでPNG
  sponsors: { width: 800, format: "png" },
  // KV。形はそのまま、大きすぎるものだけ縮める
  kv: { width: 2400, format: "webp" },
  // トップページのフォトギャラリー。横に並べるので 4:3 にそろえる
  photos: { width: 1600, height: 1200, format: "webp" },
};

/** 置き場所として使ってよい名前か（アップロード先を外から指定されるため） */
export const isMedia = (media: string) => Object.hasOwn(RULES, media);

export type Prepared = { buf: Buffer; ext: string };

export async function prepareImage(media: string, buf: Buffer): Promise<Prepared> {
  const rule = RULES[media];
  if (!rule) return { buf, ext: "" };

  try {
    const img = sharp(buf, { animated: false }).rotate();
    const resized = !rule.height
      ? // 形はそのまま、幅だけ抑える
        img.resize({ width: rule.width, withoutEnlargement: true })
      : rule.fit === "pad"
        ? // 全部入れて、余った辺を黒で埋める
          img.resize(rule.width, rule.height, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 1 },
          })
        : // 決まった形に切り抜く。中央ではなく、目を引くところを残す
          img.resize(rule.width, rule.height, { fit: "cover", position: "attention" });

    const out =
      rule.format === "png"
        ? await resized.png({ compressionLevel: 9 }).toBuffer()
        : await resized.webp({ quality: 82 }).toBuffer();

    return { buf: out, ext: `.${rule.format}` };
  } catch {
    // 画像として読めなければ、そのまま置く
    return { buf, ext: "" };
  }
}
