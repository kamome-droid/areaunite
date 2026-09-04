# 作品スチル・出演者・出店の画像置き場

`src/content/items/*.md` の `image:` から参照する。

```yaml
image: /images/items/maypril.jpg
```

カードは指定した比率で切り抜かれる（分類ごとに `src/config/site.ts` の `ratio` で指定）。
横1600px程度あれば足りる。
