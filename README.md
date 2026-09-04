# AREA UNITE / 汎用イベントサイト・テンプレート

スノーボード・アウトドア系のイベントサイトを想定した汎用テンプレート。
第1号の実装として AREA UNITE の内容を入れている。

**設計の前提**：このサイトはエリアユナイト専用のオリジナルデザインではなく、
**他のイベントにも使い回せるテンプレート**として作っている。
見出しやレイアウトに固有の癖をつけず、「見やすさ」と「差し替えやすさ」を優先する。

---

## 別のイベントに転用する手順

差し替えるのは次の3つだけ。ページやコンポーネントに手を入れる必要はない。

| # | ファイル | 変えるもの |
|---|---|---|
| 1 | `src/styles/theme.css` | ブランドカラー・背景・フォント・角丸（サイト全体の色が入れ替わる） |
| 2 | `src/config/site.ts` | イベント名・キャッチ・SNS・ナビ・一覧ページの種類（`groups`） |
| 3 | `public/images/kv/` + `src/content/` | KV画像と中身 |

### 1. 色を変える

`src/styles/theme.css` の `--brand` を変えるだけで、ボタン・見出しの罫・
時刻・リンクなど、アクセントが入るところがすべて追従する。
ライトテーマにしたい場合は `--bg` / `--surface` / `--text` を反転させる。

### 2. 一覧ページを増やす／減らす

`src/config/site.ts` の `groups` に1件足すと、

- `/そのキー/` の一覧ページ
- グローバルナビの項目
- トップページ CONTENTS の導線

が自動で増える。減らすときは消すだけ。

```ts
workshop: {
  label: "Workshop",
  jp: "ワークショップ",
  lead: "当日開催する体験プログラム。",
  layout: "grid",   // grid = カード格子 / list = 時刻つきの1列
  ratio: "4 / 3",
  inNav: true,
},
```

### 3. KVを差し替える

`public/images/kv/hero.jpg` を置き、`src/content/event/2025.md` の `hero:` に
パスを書く。指定が空のあいだは、構図確認用のグラデーションが表示される。

---

## コンテンツの入れ方

すべて `src/content/` 以下の Markdown。将来の管理画面はこのファイルを
読み書きするだけで成立するよう、項目を最小限にしている。

### `src/content/event/` — 開催回の基本情報（1開催 = 1ファイル）

日付・会場・タイムテーブル・チケット料金・注意事項・来場ゲストなど。
`current: true` の回がサイトの主役になる。翌年は `2026.md` を足して
前年の `current` を `false` にする。

### `src/content/items/` — カードで並ぶものすべて

`group:` に `movies` / `daytime` / `music` / `foods` / `shops` / `stay` の
どれかを書くと、その一覧ページに出る。

```yaml
---
group: movies
title: "作品タイトル"
subtitle: "制作・監督名"      # タイトルの上に小さく出る
time: "17:30"                # あると時刻順に並び、サムネイルに時刻が乗る
image: /images/items/xxx.jpg
link: https://example.com    # 任意
featured: true               # トップページのダイジェストに出す
draft: true                  # 下書き。本番ビルドには出ない
---
本文（任意）。
```

### `src/content/sponsors/` — 協賛ロゴ

`tier: 1`（大）〜`3`（小）で表示サイズが決まる。
`logo:` がなければ社名テキストで表示される。
ロゴ画像は黒背景に合わせて白抜きに変換して表示している
（`SponsorGrid.astro` の `filter`）。単色ロゴ前提なので、
多色ロゴを原色のまま出したい場合はここを外す。

---

## 開発

```bash
npm install
npm run dev      # http://localhost:4340（.claude/launch.json 経由）
npm run build    # dist/ に静的書き出し
```

`draft: true` の項目は `npm run dev` では見えるが、`npm run build` では消える。

---

## いまの状態と、これから

**できていること**
- トップ／一覧ページ6種／チケット／アクセス／お問い合わせ
- ダークテーマ・レスポンシブ・キーボード操作・OG設定
- コンテンツはすべて Markdown 管理

**未着手（素材待ち）**
- KV画像・ロゴデータ・各作品のスチル・協賛ロゴ
- MOVIES 以外のラインナップ（DAY TIME / MUSIC / FOODS / SHOP & BOOTH）は
  レイアウト確認用のサンプルを `draft: true` で入れてある。本番ビルドには出ない。

**次の段階**
- お問い合わせフォームの送信先接続（`site.contact.endpoint`）。
  未接続のあいだ、フォームは入力できない見本として表示され、
  問い合わせが消えないようにしてある。
- 管理画面（`/admin`）。Astro を SSR に切り替え、
  上記3つのコレクションを編集する画面を足す。
