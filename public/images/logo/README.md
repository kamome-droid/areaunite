# ロゴ置き場

`logo.svg`（できればSVG、なければ透過PNG・横1000px以上）を置いて、
`src/config/site.ts` の `logo:` にパスを書く。

```ts
logo: "/images/logo/logo.svg",
```

空のあいだはイベント名のテキストロゴが出る。
ヘッダーでは高さ30pxで表示されるので、横長の一色ロゴが扱いやすい。
