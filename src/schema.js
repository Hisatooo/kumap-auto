import { z } from "zod";

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
  source_name: z.string().default("熊本大学公式HP").describe("出典の名前（例: 熊本市公式HP、店舗公式サイト）"),
  category: z.enum(Object.keys(CATEGORIES)),
  cover: z.object({
    title: z.string().describe("表紙の大見出し。1行8文字以内×最大2行。改行は\\n"),
    lead: z.string().describe("この投稿で何がわかるか。40文字以内"),
  }),
  slides: z.array(z.discriminatedUnion("type", [PointSlide, StepsSlide, InfoSlide, RankingSlide])).min(1).max(4),
  caption: z.string().describe("Instagramキャプション本文。ハッシュタグは含めない"),
  hashtags: z.array(z.string()).max(10),
});
