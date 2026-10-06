// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  // 本番URL（sitemap・OGの絶対URL用）。独自ドメイン確定後にここを差し替える
  site: "https://www.areaunite.jp",

  // 全ページをサーバー側で返す。静的に書き出したページはその場の判断ができないため。
  // ・公開前のパスワードゲート（ミドルウェア）
  // ・準備中のページを、一般の人には COMING SOON、管理者には中身で出し分ける
  // 一般公開後もこのままにする（"static" に戻すと準備中の切り替えが効かなくなる）
  output: "server",
  adapter: vercel({
    // SNS画像を作る satori が読むWASM。バンドルには入らないので明示的に運ぶ
    includeFiles: ["./node_modules/harfbuzzjs/hb.wasm"],
  }),

  integrations: [
    sitemap({
      // 管理画面とパスワードの入口は、検索結果に出す意味がないので載せない
      filter: (page) => !/\/(admin|gate)(\/|$)/.test(new URL(page).pathname),
    }),
  ],
});
