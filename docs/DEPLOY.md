# 公開の手順

## 1. GitHubに置く

管理画面は、本番では**GitHubのファイルを書き換える**ことで保存する。
そのため置き場所としてGitHubのリポジトリが要る。

`gh` コマンドが入っていない場合は、github.com/new から空のプライベート
リポジトリ（名前は `areaunite`、READMEなどは付けない）を作ってから、

```bash
git remote add origin https://github.com/<owner>/areaunite.git
git push -u origin main
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

デプロイのURLを開くとパスワードの入力画面が出る。入れるのは `SITE_PASSWORD` の値だけ。
一度入れると30日は聞かれない。

管理画面は `/admin/` で、そこで `ADMIN_PASSWORD` を聞かれる。
2つを同じ値にしておけば、覚えるのは1つで済む。

## 5. 一般公開するとき

Vercel から `SITE_PASSWORD` を消す（ゲートが外れる）。それだけでよい。

**`output` は `"server"` のままにする。** ページごとの公開・非公開
（非公開のページは一般の人に COMING SOON、管理画面にログインした人には中身を出す）は、
見ている人がログインしているかをその場で見て出し分けるので、静的に書き出すと効かない。
ビルド中の `getStaticPaths() ignored in dynamic page` の警告はそのためで、害はない。

## ドメイン

独自ドメイン（areaunite.jp）をVercelに向けたら、`astro.config.mjs` の `site` は
すでにその値なのでそのままでよい。
