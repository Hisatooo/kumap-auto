# kumap-auto

@kumap_info（熊大生向け情報アカウント）の投稿画像とキャプションを作り、Artifact「クマップ 投稿ストック」に追加する。投稿は人が手動で行う。

Artifact: https://claude.ai/artifact/YYrjDfjpEwhdysFHn9nbMF

## 「更新して」と言われたら
1. `npm run collect` — 熊大公式HPの学生向けお知らせから、未使用の記事を `work/candidates.json` に保存
2. `EDITING.md` のルールで記事を1つ選び、`work/post.json` を書く（形式は `src/schema.js`）。役立つ記事がなければ EDITING.md「熊大公式以外のネタ」に沿って Web で熊本の情報を調べて書く
3. `npm run build` — 形式チェック → `posts/<日時>/` に画像とキャプション → `site/index.html` を再生成。エラーなら post.json を直して再実行
4. 出力された画像を目で確認する（`sips -Z 540` で縮小して Read）
5. Artifact ツールで `site/index.html` を上の URL に publish。`files` には今回の新しい画像だけを `{"posts/<id>/N.jpg": "posts/<id>/N.jpg"}` で渡す（前の画像は残る）
6. `git add -A && git commit -m "feat: 投稿 <id>" && git push`（Hisatooo アカウント）

## 事実の扱い
日付・金額・対象者・場所は記事本文に書かれていることだけ。書かれていない情報（会場など）は載せない。
