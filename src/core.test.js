import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCaption, buildIssueBody } from "./draft.js";
import { PostSchema } from "./generate.js";
import { parseIssueBody } from "./publish.js";
import { buildSlidesHtml } from "./render.js";
import { htmlToText, parseFeed } from "./sources.js";

const samplePost = PostSchema.parse({
  skip: false,
  skip_reason: "",
  source_url: "https://www.kumamoto-u.ac.jp/example",
  tag: "お金",
  cover: { title: "授業料免除\\n申請はお早めに", subtitle: "後期の締切に注意" },
  slides: [{ heading: "対象", points: ["学部生 <全員>", "大学院生"] }],
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

test("issue body round-trips the post id and an edited caption", () => {
  const body = buildIssueBody("20261101-0700", samplePost, ["https://x/1.jpg"]);
  assert.deepEqual(parseIssueBody(body), { postId: "20261101-0700", caption: buildCaption(samplePost) });

  const edited = body.replace("授業料免除の申請が始まりました。", "編集済み").replace(/\n/g, "\r\n");
  assert.match(parseIssueBody(edited).caption, /^編集済み/);
});

test("parseIssueBody rejects path-like post ids", () => {
  assert.throws(() => parseIssueBody("<!-- kumap-post:../../etc -->\n```text\nx\n```"), /投稿ID/);
});

test("hashtags always get a single #", () => {
  assert.match(buildCaption(samplePost), /#熊本大学 #熊大生$/);
});

test("slides escape HTML and mark only the last page with the handle", () => {
  const pages = buildSlidesHtml(samplePost);
  assert.equal(pages.length, 2);
  assert.match(pages[0], /授業料免除<br>申請はお早めに/);
  assert.match(pages[1], /学部生 &lt;全員&gt;/);
  assert.match(pages[0], /Next page→/);
  assert.match(pages[1], /@kumap_info/);
});
