// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  // 本番URL（sitemap・OGの絶対URL用）。独自ドメイン確定後にここを差し替える
  site: "https://www.areaunite.jp",

  // 公開前はサイト全体をパスワードで隠したいので、全ページをサーバー側で返す。
  // （静的に書き出したページはミドルウェアを通らず、ゲートが効かないため）
  // 一般公開してゲートを外すときは "static" に戻すと速くて安い
  output: "server",
  adapter: vercel({
    // SNS画像を作る satori が読むWASM。バンドルには入らないので明示的に運ぶ
    includeFiles: ["./node_modules/harfbuzzjs/hb.wasm"],
  }),

  integrations: [sitemap()],
});
