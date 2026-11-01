import { chromium } from "playwright";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./config.js";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const withBreaks = (s) => escapeHtml(s).replace(/\\n|\n/g, "<br>");

const STYLE = `
:root { --purple:#5b2a86; --purple-light:#d9b8f0; --yellow:#ffe14d; --red:#e8262b; --ink:#1a1a1a; }
* { box-sizing:border-box; margin:0; padding:0; }
body { width:${SLIDE_WIDTH}px; height:${SLIDE_HEIGHT}px; font-family:"Noto Sans JP",sans-serif; background:#fff; color:var(--ink); position:relative; overflow:hidden; }
.corner { position:absolute; top:0; left:0; width:0; height:0; border-top:110px solid var(--purple); border-right:110px solid transparent; }
.frame { position:absolute; inset:110px 70px 230px; border:10px solid var(--purple); padding:70px 60px; display:flex; flex-direction:column; }
.tag { position:absolute; top:-34px; left:40px; background:var(--yellow); font-weight:900; font-size:40px; padding:6px 36px; }
.cover-title { margin:auto 0 0; text-align:center; color:var(--red); font-weight:900; font-size:96px; line-height:1.3; }
.cover-sub { margin:60px 0 auto; text-align:center; font-weight:700; font-size:44px; line-height:1.5; }
.heading { color:var(--purple); font-weight:900; font-size:64px; line-height:1.3; border-bottom:6px solid var(--purple-light); padding-bottom:24px; margin-bottom:40px; }
ul { list-style:none; display:flex; flex-direction:column; gap:30px; }
li { font-size:42px; font-weight:700; line-height:1.5; padding-left:56px; position:relative; }
li::before { content:""; position:absolute; left:0; top:18px; width:28px; height:28px; background:var(--red); border-radius:50%; }
.footer { position:absolute; left:0; right:0; bottom:0; height:150px; background:var(--purple); color:#fff; display:flex; align-items:center; justify-content:space-between; padding:0 50px; }
.source { font-size:30px; }
.next { font-size:44px; font-weight:700; }
.handle { font-size:40px; font-weight:900; }
`;

function page(inner, { tag, isLast }) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=block" rel="stylesheet">
<style>${STYLE}</style></head><body>
<div class="corner"></div>
<div class="frame"><div class="tag">${escapeHtml(tag)}</div>${inner}</div>
<div class="footer"><span class="source">熊本大学公式HPより</span>${isLast ? '<span class="handle">@kumap_info</span>' : '<span class="next">Next page→</span>'}</div>
</body></html>`;
}

/** @returns {string[]} one HTML document per slide */
export function buildSlidesHtml(post) {
  const total = post.slides.length + 1;
  const cover = page(
    `<h1 class="cover-title">${withBreaks(post.cover.title)}</h1><p class="cover-sub">${withBreaks(post.cover.subtitle)}</p>`,
    { tag: post.tag, isLast: total === 1 },
  );
  const details = post.slides.map((s, i) =>
    page(
      `<h2 class="heading">${withBreaks(s.heading)}</h2><ul>${s.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`,
      { tag: post.tag, isLast: i + 2 === total },
    ),
  );
  return [cover, ...details];
}

/**
 * Renders each slide to a JPEG (Instagram accepts JPEG only).
 * @returns {Promise<string[]>} written file paths
 */
export async function renderSlides(post, outDir) {
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({ viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } });
    const files = [];
    for (const [i, html] of buildSlidesHtml(post).entries()) {
      await tab.setContent(html, { waitUntil: "networkidle" });
      await tab.evaluate(() => document.fonts.ready);
      const file = `${outDir}/${i + 1}.jpg`;
      await tab.screenshot({ path: file, type: "jpeg", quality: 92 });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}
