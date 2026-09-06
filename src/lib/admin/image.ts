import sharp from "sharp";

/**
 * 上げてもらった画像を、置き場所ごとの決まった形にそろえる。
 *
 * バラバラの大きさのまま置くと、表示では切り抜かれるので見た目は保てるが、
 * 元のファイルがそのままリポジトリに入って重くなる。ここで先に整える。
 */
type Rule = { width: number; height?: number; format: "webp" | "png" };

/** 置き場所（def.media）ごとの決まり */
const RULES: Record<string, Rule> = {
  // コンテンツの画像。YouTubeのサムネイルと同じ 16:9 に切り抜く
  items: { width: 1280, height: 720, format: "webp" },
  // ロゴ。形はそのまま、透過を残したいのでPNG
  sponsors: { width: 800, format: "png" },
  // KV。形はそのまま、大きすぎるものだけ縮める
  kv: { width: 2400, format: "webp" },
};

export type Prepared = { buf: Buffer; ext: string };

export async function prepareImage(media: string, buf: Buffer): Promise<Prepared> {
  const rule = RULES[media];
  if (!rule) return { buf, ext: "" };

  try {
    const img = sharp(buf, { animated: false }).rotate();
    const resized = rule.height
      ? // 決まった形に切り抜く。中央を残す
        img.resize(rule.width, rule.height, { fit: "cover", position: "attention" })
      : // 形はそのまま、幅だけ抑える
        img.resize({ width: rule.width, withoutEnlargement: true });

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
