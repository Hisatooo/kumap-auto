import assert from "node:assert/strict";
import { test } from "node:test";
import { PostSchema } from "./schema.js";
import { buildCaption, buildSiteHtml } from "./site.js";
import { availableCoverStyles, buildSlidesHtml } from "./render.js";
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

test("site page lists posts with image paths, escaped caption and a copy button", () => {
  const html = buildSiteHtml([{ id: "20261101-0700", post: samplePost, images: ["posts/20261101-0700/1.jpg", "posts/20261101-0700/2.jpg"] }]);
  assert.match(html, /<title>クマップ 投稿ストック<\/title>/);
  assert.match(html, /src="posts\/20261101-0700\/2\.jpg"/);
  assert.match(html, /2026\.11\.01/);
  assert.match(html, /授業料免除 申請はお早めに/);
  assert.ok(html.includes(buildCaption(samplePost).replace(/</g, "&lt;")));
  assert.match(html, /class="copy"/);
});

test("site page shows an empty state with no posts", () => {
  assert.match(buildSiteHtml([]), /まだ投稿案はありません/);
});

test("hashtags always get a single #", () => {
  assert.match(buildCaption(samplePost), /#熊本大学 #熊大生$/);
});

test("pages: cover + one per slide + closing page, with escaped text and page numbers", () => {
  const pages = buildSlidesHtml(samplePost, { date: "2026.11.01", vol: 7 });
  assert.equal(pages.length, 4);
  assert.match(pages[0], /授業料免除<br>申請はお早めに/);
  assert.match(pages[0], /VOL\.07/);
  assert.match(pages[0], /MONEY お金/);
  assert.match(pages[1], /学部生 &lt;全員&gt;/);
  assert.match(pages[2], /INFORMATION/);
  assert.doesNotMatch(pages[2], /DEADLINE/); // deadline: null hides the bar
  assert.match(pages[3], /熊本大学公式HP「授業料免除について」/);
  pages.slice(1).forEach((p, i) => assert.match(p, new RegExp(`${i + 2} / 4`))); // cover v01 shows SWIPE instead
});

test("sample post fixture still matches the schema", async () => {
  const { readFile } = await import("node:fs/promises");
  PostSchema.parse(JSON.parse(await readFile(new URL("../test/sample-post.json", import.meta.url), "utf8")));
});

test("cover styles: list cover needs 3+ items, event cover needs event data, Q&A only when chosen", () => {
  assert.deepEqual(availableCoverStyles(samplePost), ["v01", "v02", "v03", "v04", "v05", "v09"]);
  const event = { tag: "参加者募集中", month: "NOV", day: "21", weekday: "SAT", rows: [{ label: "場所", value: "黒髪" }] };
  const withEvent = PostSchema.parse({ ...samplePost, cover: { ...samplePost.cover, event, style: "v06" } });
  assert.ok(availableCoverStyles(withEvent).includes("v08"));
  assert.ok(availableCoverStyles(withEvent).includes("v06"));
  assert.match(buildSlidesHtml({ ...withEvent, cover: { ...withEvent.cover, style: "v08" } }, { date: "2026.11.01" })[0], /黒髪/);
});
