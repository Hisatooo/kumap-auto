import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CLAUDE_MODEL } from "./config.js";

// Cover category chip: key → Japanese label (rendered as "NEWS お知らせ").
export const CATEGORIES = {
  NEWS: "お知らせ",
  MONEY: "お金",
  CAREER: "就活",
  EVENT: "イベント",
  CAMPUS: "キャンパス",
  STUDY: "学び",
};

const PointSlide = z.object({
  type: z.literal("point"),
  subtitle: z.string().describe("見出しの上の小さな英語ラベル。例: ABOUT / SCHEDULE / TARGET"),
  heading: z.string().describe("10文字以内"),
  body: z.string().describe("本文。100〜120文字"),
  check: z.string().describe("CHECK欄のひとことポイント。30文字以内"),
});

const StepsSlide = z.object({
  type: z.literal("steps"),
  heading: z.string().describe("手順の見出し。14文字以内"),
  steps: z
    .array(z.object({ title: z.string().describe("16文字以内"), desc: z.string().describe("やること・時期・注意点。36文字以内") }))
    .min(2)
    .max(4),
  tips: z.string().describe("TIPS欄。つまずきやすい点。30文字以内"),
});

const InfoSlide = z.object({
  type: z.literal("info"),
  heading: z.string().describe("イベント名・情報のタイトル。20文字以内"),
  rows: z
    .array(z.object({ label: z.string().describe("日時/場所/対象/費用/申込 など2〜3文字"), value: z.string().describe("26文字以内") }))
    .min(2)
    .max(5),
  deadline: z.string().nullable().describe("締切。記事に締切がなければ null"),
});

const RankingSlide = z.object({
  type: z.literal("ranking"),
  heading: z.string().describe("ランキング・一覧の見出し。14文字以内"),
  items: z
    .array(z.object({ name: z.string().describe("20文字以内"), comment: z.string().describe("24文字以内。4位以下は表示されない") }))
    .min(3)
    .max(5),
  note: z.string().describe("順位の根拠・出典"),
});

export const PostSchema = z.object({
  skip: z.boolean().describe("どの記事も熊大生に役立たない場合だけ true"),
  skip_reason: z.string(),
  source_url: z.string().describe("選んだ記事のURL（候補の中からそのまま）"),
  source_title: z.string().describe("選んだ記事のタイトル（候補の中からそのまま）"),
  category: z.enum(Object.keys(CATEGORIES)),
  cover: z.object({
    title: z.string().describe("表紙の大見出し。1行8文字以内×最大2行。改行は\\n"),
    lead: z.string().describe("この投稿で何がわかるか。40文字以内"),
  }),
  slides: z.array(z.discriminatedUnion("type", [PointSlide, StepsSlide, InfoSlide, RankingSlide])).min(1).max(4),
  caption: z.string().describe("Instagramキャプション本文。ハッシュタグは含めない"),
  hashtags: z.array(z.string()).max(10),
});

const SYSTEM_PROMPT = `あなたは熊本大学の学生が運営するInstagram「クマップ(@kumap_info)」の編集者です。
熊大生のための学内情報プラットフォームとして、大学公式サイトの学生向けお知らせを、学生が保存・シェアしたくなるカルーセル投稿に作り直します。

## 記事の選び方
候補の中から「熊大生の役に立ち、反応（保存・シェア）が取れそうな記事」を1つ選ぶ。優先度の目安:
1. 締切・お金（授業料、免除、奨学金、給付）・休講/授業の扱いなど、知らないと損をする情報
2. 就活・キャリア・留学の募集
3. 学内イベント・学園祭
4. 研究成果や式典の報告など、学生の行動につながらない記事は避ける
どれも当てはまらなければ skip=true にする。

## 事実の扱い（最重要）
- 日付・金額・対象者・締切・手続きは記事本文に書かれたものだけを使い、推測で補わない。
- 本文に書かれていないことは書かない。不明な点は「詳しくは大学HPを確認」と書く。
- 大学の公式発表ではない言い回し（「確定」「必ず」など）で誇張しない。

## ページ構成
表紙と最終ページ（保存・フォローの呼びかけ）は自動で付く。中のページ（slides）を1〜4枚、内容に合う型で作る:
- point: ポイントを1つずつ解説する。見出し＋本文100〜120字＋CHECK。
- steps: 申請・手続きなど順番がある内容。2〜4ステップ＋TIPS。
- info: 日時・場所・対象・費用・申込などの開催情報や募集要項を表で。締切があれば deadline。
- ranking: 記事に順位や一覧が実際に書かれている場合だけ使う。順位を作り上げてはいけない。
「何のこと？」→「自分は対象？」→「いつまでに何をする？」の順に読めるように並べる。

## 文体
- 表紙: 一目で自分ごとだとわかる短い見出し。
- キャプション: 1行目で興味を引き、要点を3〜5行、最後に「保存して見返してね」と出典「出典：熊本大学公式HP」を入れる。絵文字は控えめに。
- ハッシュタグは #熊本大学 #熊大 #熊大生 を含め、内容に合うものを最大10個。`;

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY が設定されていません");
  client ??= new Anthropic();
  return client;
}

function formatCandidates(candidates) {
  return candidates
    .map((c, i) => `<article index="${i + 1}">\nURL: ${c.url}\nタイトル: ${c.title}\n公開日: ${c.published?.toISOString().slice(0, 10) ?? "不明"}\n本文:\n${c.body}\n</article>`)
    .join("\n\n");
}

/**
 * Picks the most useful article and writes a carousel post for it.
 * @param {{title: string, url: string, published: Date|null, body: string}[]} candidates
 * @returns {Promise<z.infer<typeof PostSchema>>}
 */
export async function generatePost(candidates) {
  const response = await getClient().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(PostSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `今日の候補記事です。1つ選んで投稿を作ってください。\n\n${formatCandidates(candidates)}` }],
  });

  if (response.stop_reason === "refusal") throw new Error(`Claude が生成を拒否しました: ${response.stop_details?.explanation ?? "理由不明"}`);
  if (response.stop_reason === "max_tokens") throw new Error("出力が上限で途切れました");
  const post = response.parsed_output;
  if (!post) throw new Error("Claude の出力を読み取れませんでした");

  // Claude must pick from the candidates, never invent a URL.
  if (!post.skip && !candidates.some((c) => c.url === post.source_url)) {
    throw new Error(`候補にないURLが返されました: ${post.source_url}`);
  }
  return post;
}
