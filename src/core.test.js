import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCaption, buildIssueBody } from "./draft.js";
import { PostSchema } from "./generate.js";
import { buildSlidesHtml } from "./render.js";
import { htmlToText, parseFeed } from "./sources.js";

const samplePost = PostSchema.parse({
  skip: false,
  skip_reason: "",
  source_url: "https://www.kumamoto-u.ac.jp/example",
  source_title: "授業料免除について",
  category: "MONEY",
  cover: { title: "授業料免除\\n申請はお早めに", lead: "後期の締切に注意" },
  slides: [
    { type: "point", subtitle: "TARGET", heading: "対象", body: "学部生 <全員>", check: "確認しよう" },
    { type: "info", heading: "基本情報", rows: [{ label: "対象", value: "学部生" }, { label: "申込", value: "HPから" }], deadline: null },
  ],
  caption: "授業料免除の申請が始まりました。\n保存して見返してね",
  hashtags: ["熊本大学", "#熊大生"],
});

test("parseFeed reads title, link and JST date from the Plone RSS", () => {
  const xml = `<item rdf:about="x"><title>【重要】授業料 &amp; 免除</title><link>https://www.kumamoto-u.ac.jp/a</link><dc:date>2026/10/27 12:49:00 GMT+9</dc:date></item>`;
  const [item] = parseFeed(xml);
  assert.equal(item.title, "【重要】授業料 & 免除");
  assert.equal(item.url, "https://www.kumamoto-u.ac.jp/a");
  assert.equal(item.published.toISOString(), "2026-10-27T03:49:00.000Z");
});

test("htmlToText keeps only the main content", () => {
  const html = `<nav>menu</nav><main><h1>題</h1><p>本文&nbsp;です</p><script>x()</script></main><footer>f</footer>`;
  assert.equal(htmlToText(html), "題\n本文 です");
});

test("issue body has every image link in order and the caption in a copyable block", () => {
  const body = buildIssueBody(samplePost, ["https://x/1.jpg", "https://x/2.jpg"]);
  assert.match(body, /\[1枚目\]\(https:\/\/x\/1\.jpg\) ・ \[2枚目\]\(https:\/\/x\/2\.jpg\)/);
  assert.ok(body.includes("```text\n" + buildCaption(samplePost) + "\n```"));
  assert.match(body, /\[授業料免除について\]\(https:\/\/www\.kumamoto-u\.ac\.jp\/example\)/);
});

test("hashtags always get a single #", () => {
  assert.match(buildCaption(samplePost), /#熊本大学 #熊大生$/);
});

test("pages: cover + one per slide + closing page, with escaped text and page numbers", () => {
  const pages = buildSlidesHtml(samplePost, { date: "2026.11.01" });
  assert.equal(pages.length, 4);
  assert.match(pages[0], /授業料免除<br><span class="hl">申請はお早めに<\/span>/);
  assert.match(pages[0], /MONEY お金/);
  assert.match(pages[1], /学部生 &lt;全員&gt;/);
  assert.match(pages[2], /INFORMATION/);
  assert.doesNotMatch(pages[2], /DEADLINE/); // deadline: null hides the bar
  assert.match(pages[3], /熊本大学公式HP「授業料免除について」/);
  pages.forEach((p, i) => assert.match(p, new RegExp(`${i + 1} / 4`)));
});

test("sample post fixture still matches the schema", async () => {
  const { readFile } = await import("node:fs/promises");
  PostSchema.parse(JSON.parse(await readFile(new URL("../test/sample-post.json", import.meta.url), "utf8")));
});
