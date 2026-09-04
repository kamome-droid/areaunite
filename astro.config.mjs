// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // 本番URL（sitemap・OGの絶対URL用）。独自ドメイン確定後にここを差し替える
  site: "https://www.areaunite.jp",
  integrations: [sitemap()],
});
