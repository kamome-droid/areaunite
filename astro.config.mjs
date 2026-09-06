// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  // 本番URL（sitemap・OGの絶対URL用）。独自ドメイン確定後にここを差し替える
  site: "https://www.areaunite.jp",

  // 公開ページは静的のまま。管理画面と保存用APIだけ、
  // 各ファイルで prerender = false にしてサーバー側で動かす
  output: "static",
  adapter: vercel(),

  integrations: [sitemap()],
});
