# kumap-auto

@kumap_info の投稿画像とキャプションを自動で作る仕組み（投稿は手動）。

1. 毎朝7時、熊本大学「お知らせ[学生]」RSS から新しい記事を集める
2. Claude が熊大生に一番役立つ記事を選び、カルーセル画像とキャプションを作る
3. `posts/<日時>/` に画像（1.jpg〜）と `caption.txt` を保存し、GitHub Issue で知らせる
4. Issue の画像を保存し、キャプションをコピーして Instagram アプリから投稿する

## デザイン
「クマップ Instagramテンプレート」に合わせた構成。表紙と最終ページ（保存・シェア・フォロー）は毎回付き、間のページは Claude が内容に合わせて選ぶ。
- `point`（POINT：見出し＋本文＋CHECK）
- `steps`（HOW TO：最大4ステップ＋TIPS）
- `info`（INFORMATION：日時・場所などの表＋DEADLINE）
- `ranking`（RANKING：記事に順位がある時だけ）

表紙イラスト・葉・街並みはテンプレート画像から切り出したもの（`assets/`）。
**`assets/icon.png`（正方形のアカウントアイコン）を置くと、丸枠にアイコンが入る。** 置かなければ空の丸のまま。
見た目の確認: `node -e` で `test/sample-post.json` を描画（`src/render.js` の `renderSlides`）。

## 初回設定
GitHub の Settings → Secrets and variables → Actions に `ANTHROPIC_API_KEY`（console.anthropic.com で発行）を登録するだけ。

## 手動実行
- Actions →「投稿案をつくる」→ Run workflow
- ローカル: `ANTHROPIC_API_KEY=... IMAGE_BASE_URL=https://example.com npm run draft`
- テスト: `npm test`
