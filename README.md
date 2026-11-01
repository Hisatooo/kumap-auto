# kumap-auto

@kumap_info の投稿を自動で作る仕組み。

1. 毎朝7時、熊本大学「お知らせ[学生]」RSS から新しい記事を集める
2. Claude が熊大生に一番役立つ記事を選び、カルーセル（表紙＋説明）とキャプションを作る
3. 画像を `posts/<日時>/` に保存し、承認用の GitHub Issue を作る
4. Issue に `approve` ラベルを付けると Instagram に投稿される（キャプションは Issue 上で編集できる）

## 初回設定

### GitHub Secrets
| 名前 | 中身 |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com で発行 |
| `IG_ACCESS_TOKEN` | Instagram 長期トークン（60日。自動更新あり） |
| `IG_USER_ID` | Instagram のユーザーID（数字） |
| `GH_PAT` | このリポジトリの Secrets を書ける fine-grained token（トークン自動更新用） |

### Instagram トークンの取り方
1. kumap_info をプロアカウント（ビジネス/クリエイター）にする
2. developers.facebook.com でアプリ作成 →「Instagram」製品を追加 →「Instagram ログインによる API 設定」
3. 「アクセストークンを生成」で kumap_info を追加してログイン → 表示されたトークンと、ユーザーIDをコピー
4. アプリは「開発モード」のままで OK（自分のアカウントにだけ投稿するため）

### ラベル
`draft` と `approve` を作っておく。

## 手動実行
- Actions →「投稿案をつくる」→ Run workflow
- ローカル: `ANTHROPIC_API_KEY=... IMAGE_BASE_URL=https://example.com npm run draft`
- テスト: `npm test`

## 全自動に切り替えるとき
`draft.yml` の最後で `gh issue edit --add-label approve` を足せば、承認なしで投稿される。
