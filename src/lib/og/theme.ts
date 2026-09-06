import { readFile } from "node:fs/promises";
import path from "node:path";

/** SNS画像で使う色。theme.css を読んで拾うので、色の出どころは1か所のまま。 */
export type OgTheme = {
  brand: string;
  brandInk: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
};

let cache: OgTheme | null = null;

export async function ogTheme(): Promise<OgTheme> {
  if (cache) return cache;

  const css = await readFile(path.join(process.cwd(), "src/styles/theme.css"), "utf8");
  const pick = (name: string, fallback: string) =>
    css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim() ?? fallback;

  cache = {
    brand: pick("brand", "#e4b95f"),
    brandInk: pick("brand-ink", "#101010"),
    bg: pick("bg", "#0a0a0c"),
    surface: pick("surface", "#1a1a1f"),
    text: pick("text", "#f2f1ee"),
    // rgba のままだと satori が扱いにくいので、薄いグレーに置き換える
    muted: pick("text-muted", "#a0a0a6"),
  };
  return cache;
}
