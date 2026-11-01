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
**`assets/icon.png`（正方形のアカウントアイコン）を置くと、丸枠にアイコンが入る。** 置かなければ空の丸のまま。
見た目の確認: `node -e` で `test/sample-post.json` を描画（`src/render.js` の `renderSlides`）。
