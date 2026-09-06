# 公開の手順

## 1. GitHubに置く

管理画面は、本番では**GitHubのファイルを書き換える**ことで保存する。
そのため置き場所としてGitHubのリポジトリが要る。

```bash
gh repo create areaunite --private --source=. --push
```

## 2. Vercelにつなぐ

Vercel で「Add New… → Project」からこのリポジトリを選ぶ。
フレームワークは Astro と自動で判別される。ビルド設定はそのままでよい。

## 3. 環境変数を入れる

Vercel の Settings → Environment Variables に入れる（Production と Preview の両方）。

| 変数 | 値 | 用途 |
|---|---|---|
| `SITE_PASSWORD` | 好きな合言葉 | **公開前の目隠し**。関係者に伝える |
| `ADMIN_PASSWORD` | 別の合言葉 | 管理画面のログイン |
| `AUTH_SECRET` | 長いランダム文字列 | ログインのクッキー署名 |
| `GITHUB_TOKEN` | GitHubの個人アクセストークン | 管理画面からの保存に使う |
| `GITHUB_REPO` | `owner/areaunite` | 同上 |

`GITHUB_TOKEN` は「Fine-grained personal access token」で、このリポジトリに対して
**Contents: Read and write** を付ける。ほかの権限は要らない。

## 4. 見せる

デプロイのURLを開くと、ブラウザがパスワードを聞く。

- ユーザー名 … `areaunite`（`SITE_USER` で変えられる）
- パスワード … `SITE_PASSWORD` に入れた値

管理画面は `/admin/` で、そこからさらに `ADMIN_PASSWORD` を聞かれる。

## 5. 一般公開するとき

1. Vercel から `SITE_PASSWORD` を消す（ゲートが外れる）
2. `astro.config.mjs` の `output` を `"server"` から `"static"` に戻す

2つ目は速さと費用のため。公開前はゲートを効かせるために全ページをサーバー側で
返しているが、ゲートを外すなら静的に書き出したほうが速く、費用もかからない。
（管理画面と保存API・画像APIは `prerender = false` なのでそのまま動く）

## ドメイン

独自ドメイン（areaunite.jp）をVercelに向けたら、`astro.config.mjs` の `site` は
すでにその値なのでそのままでよい。
