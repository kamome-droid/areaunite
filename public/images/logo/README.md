# ロゴ置き場

| ファイル | 用途 |
|---|---|
| `logo.png` | サイトで表示しているもの（720×139・透明余白なし） |
| `logo-original.png` | 支給された原本（8243×2357・周囲に透明の余白あり） |

`src/config/site.ts` の `logo:` と `logoSize:` から参照する。

```ts
logo: "/images/logo/logo.png",
logoSize: { w: 720, h: 139 },   // 縦横比だけ使う。差し替えたら実寸に合わせる
```

## 差し替えるときの注意

**透明の余白は落としてから置くこと。** ヘッダーもフッターも「高さ」で
サイズを揃えているので、余白のあるファイルをそのまま入れると
ロゴ本体だけが小さく見える（原本は上下に3割ほど余白があった）。

余白を落として書き出す例：

```bash
python3 - <<'PY'
from PIL import Image
im = Image.open("logo-original.png").convert("RGBA")
im = im.crop(im.getchannel("A").getbbox())   # 透明部分を切り落とす
w = 720; h = round(im.height * w / im.width)
im.resize((w, h), Image.LANCZOS).save("logo.png", optimize=True)
print(w, h)   # この数字を site.ts の logoSize に書く
PY
```

色は単色のゴールドで、`theme.css` の `--brand` とほぼ同じ。
背景が明るいテーマに変える場合は、濃い色のロゴを別途もらう必要がある。
