# kumap-auto

@kumap_info の投稿画像とキャプションを作り、Artifact「クマップ 投稿ストック」に追加する（投稿は手動）。
手順は `CLAUDE.md`。Claude Code でこのフォルダを開いて「更新して」と言えば動く。

- `npm run collect` 記事を集める → Claude が `work/post.json` を書く（`EDITING.md`）→ `npm run build` 画像・キャプション・ページを作る
- `npm test` テスト

## デザイン
「クマップ Instagramテンプレート」に合わせた構成。表紙と最終ページ（保存・シェア・フォロー）は毎回付き、間のページは Claude が内容に合わせて選ぶ。
- `point`（POINT：見出し＋本文＋CHECK）
- `steps`（HOW TO：最大4ステップ＋TIPS）
- `info`（INFORMATION：日時・場所などの表＋DEADLINE）
- `ranking`（RANKING：記事に順位がある時だけ）

表紙イラスト・葉・街並みはテンプレート画像から切り出したもの（`assets/`）。
表紙には毎回、熊大・熊本の写真（`assets/photos/`：五高記念館・図書館・熊本城・市電）をモノクロに加工して全面に透かす。号数（VOL）ごとに順番に切り替わる（`src/render.js` の `COVER_PHOTOS`）。写真を足すときは `assets/photos/<名前>.jpg` を置いて `COVER_PHOTOS` に名前を追加。五高記念館・図書館の写真は大学・撮影者の権利確認が必要、熊本城・市電は AI 生成の水彩画。
**`assets/icon.png`（正方形のアカウントアイコン）を置くと、丸枠にアイコンが入る。** 置かなければ空の丸のまま。
見た目の確認: `node -e` で `test/sample-post.json` を描画（`src/render.js` の `renderSlides`）。
