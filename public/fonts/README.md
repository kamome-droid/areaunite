# フォント置き場

いまのところ Webフォントはすべて Google Fonts から配信しているので、
このフォルダは空。ライセンスのあるフォントを持ち込むときだけ使う。

## DIN を使いたい場合

キャッチコピー（`Together, one in unity.`）は DIN 系の指定になっているが、
**DIN 本体は Google Fonts に無いため配信できない**。いまは代替として
Barlow Semi Condensed が当たっている。

本物の DIN に差し替える手順：

1. Webフォントとして使えるライセンスのファイル（.woff2）をここに置く
2. `src/styles/global.css` に `@font-face` を足す

   ```css
   @font-face {
     font-family: "DIN Web";
     src: url("/fonts/din.woff2") format("woff2");
     font-weight: 400;
     font-display: swap;
   }
   ```

3. `src/styles/theme.css` の `--font-tagline` の先頭に足す

   ```css
   --font-tagline: "DIN Web", "Barlow Semi Condensed", var(--font-display);
   ```

> macOS には `DIN Alternate` / `DIN Condensed` が入っているため、
> フォント指定に書くと自分の画面だけ本物の DIN で表示される。
> 他の環境の来訪者には出ないので、意図的に外している。
