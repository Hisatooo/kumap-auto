import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./config.js";
import { CATEGORIES } from "./generate.js";

// Illustrations are cut straight from the design templates (assets/*.png).
const ASSET_DIR = new URL("../assets/", import.meta.url);
const asset = (name) => {
  const file = new URL(name, ASSET_DIR);
  return existsSync(file) ? `data:image/png;base64,${readFileSync(file).toString("base64")}` : null;
};
const ASSETS = {
  coverScene: asset("cover-scene.png"),
  skyline: asset("skyline.png"),
  leaf: asset("leaf.png"),
  leavesDarkTl: asset("leaves-dark-tl.png"),
  leavesDarkR: asset("leaves-dark-r.png"),
  icon: asset("icon.png"), // optional: the account icon; a plain circle is drawn without it
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lines = (s) => String(s ?? "").split(/\\n|\n/).map(esc);

const STYLE = `
:root { --bg:#f3eee4; --green:#1d3a2c; --red:#c3282e; --peach:#ebb9a2; --sand:#e4ddcf; --ink:#1b1b1b; --gold:#f0d78c; }
* { box-sizing:border-box; margin:0; padding:0; }
body { width:${SLIDE_WIDTH}px; height:${SLIDE_HEIGHT}px; font-family:"Noto Sans JP",sans-serif; background:var(--bg); color:var(--ink); position:relative; overflow:hidden; }
.abs { position:absolute; }
.icon { border-radius:50%; border:2px solid var(--ink); background:var(--sand) center/cover no-repeat; }
.logo { font-weight:900; color:var(--ink); text-shadow:3px 3px 0 var(--red); letter-spacing:.02em; }
.label { font-family:Arial,sans-serif; font-weight:700; font-size:22px; letter-spacing:.02em; }
.footer { left:0; right:0; bottom:0; height:80px; background:var(--green); color:var(--bg); display:flex; align-items:center; justify-content:space-between; padding:0 72px; font-family:Arial,sans-serif; font-weight:700; font-size:26px; }
.footer .page { font-size:22px; }
.title { color:var(--green); font-weight:900; line-height:1.2; }
.fit { overflow:hidden; }
/* cover */
.chip { display:inline-block; height:52px; line-height:48px; padding:0 22px; border:2px solid var(--ink); font-weight:900; font-size:24px; margin-right:12px; }
.chip.red { background:var(--red); border-color:var(--red); color:#fff; }
.hl { background:linear-gradient(transparent 62%, var(--peach) 62%, var(--peach) 92%, transparent 92%); padding-right:.4em; }
/* point */
.num { color:var(--red); font-family:Arial,sans-serif; font-weight:900; font-size:190px; line-height:1; letter-spacing:-.04em; }
.box { border:3px solid var(--ink); background:var(--sand); }
.check { border-top:2px solid var(--ink); border-bottom:2px solid var(--ink); display:flex; align-items:center; gap:22px; padding:16px 0; }
.check b { background:var(--red); color:#fff; font-family:Arial,sans-serif; font-size:24px; padding:8px 22px; flex:none; }
/* steps */
.step { display:flex; gap:32px; align-items:flex-start; }
.dot { width:96px; height:96px; flex:none; border-radius:50%; background:var(--red); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:Arial,sans-serif; font-weight:700; }
.dot small { font-size:15px; } .dot span { font-size:38px; line-height:1; }
.step:last-child .dot { background:var(--green); }
.rail { left:119px; width:3px; background:var(--ink); }
.darkbar { background:var(--ink); color:#fff; display:flex; align-items:center; padding:0 32px; gap:24px; font-weight:900; font-size:28px; }
.darkbar i { font-style:normal; font-family:Arial,sans-serif; font-size:26px; padding-right:24px; border-right:2px solid #fff; }
/* info */
.row { display:flex; border-bottom:2px solid var(--ink); align-items:center; min-height:112px; padding:16px 0; }
.row .k { width:220px; padding-left:30px; color:var(--red); font-weight:900; font-size:28px; flex:none; }
.row .v { font-weight:900; font-size:34px; line-height:1.4; }
/* ranking */
.rank { display:flex; align-items:center; gap:0; border:3px solid var(--ink); padding:20px 30px; margin-bottom:20px; }
.rank .n { width:126px; flex:none; font-family:Arial,sans-serif; font-weight:700; font-size:80px; color:var(--red); line-height:1; }
.rank.top { background:var(--green); border-color:var(--green); color:var(--bg); padding:30px; } .rank.top .n { color:var(--gold); font-size:96px; }
.rank.minor { border:none; border-bottom:2px solid var(--ink); margin:0; padding:22px 30px; } .rank.minor .n { color:var(--ink); font-size:52px; }
.rank .name { font-weight:900; font-size:36px; } .rank .c { font-size:24px; margin-top:6px; }
/* last page */
body.dark { background:var(--green); color:var(--bg); }
.cta { width:296px; height:150px; border:2px solid var(--bg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-weight:900; font-size:28px; }
.cta.red { background:var(--red); border-color:var(--red); }
`;

// Shrinks every .fit element's font until its content fits its box.
const FIT_SCRIPT = `for (const el of document.querySelectorAll(".fit")) {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && size > 16) { size -= 2; el.style.fontSize = size + "px"; }
}`;

function doc(body, { dark = false } = {}) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=block" rel="stylesheet">
<style>${STYLE}</style></head><body class="${dark ? "dark" : ""}">${body}</body></html>`;
}

// The logo has its own purple ring, so the template's thin black ring is hidden unless asked to keep it.
const iconStyle = ({ keepBorder = false } = {}) =>
  ASSETS.icon ? `background-image:url(${ASSETS.icon});${keepBorder ? "" : "border-color:transparent;"}` : "";
const footer = (page, total) => `<div class="abs footer"><span>@kumap_info</span><span class="page">${page} / ${total}</span></div>`;
const header = (label) => `
<div class="abs icon" style="left:72px;top:44px;width:64px;height:64px;${iconStyle()}"></div>
<div class="abs logo" style="left:154px;top:50px;font-size:34px">クマップ</div>
<div class="abs label" style="right:72px;top:60px">${label}</div>`;

function coverPage(post, { page, total, date }) {
  const titleLines = lines(post.cover.title);
  const last = titleLines.length - 1;
  const title = titleLines.map((l, i) => (i === last ? `<span class="hl">${l}</span>` : l)).join("<br>");
  return doc(`
<div class="abs icon" style="left:72px;top:52px;width:96px;height:96px;${iconStyle()}"></div>
<div class="abs logo" style="left:190px;top:56px;font-size:52px">クマップ</div>
<div class="abs label" style="left:190px;top:124px;font-size:17px">KUMAMOTO UNIV. CAMPUS MEDIA</div>
<div class="abs label" style="right:96px;top:78px;font-size:32px">${esc(date)}</div>
<div class="abs" style="left:72px;right:72px;top:170px;border-top:3px solid var(--ink)"></div>
<div class="abs" style="left:72px;top:206px"><span class="chip red">${post.category} ${esc(CATEGORIES[post.category])}</span><span class="chip">#熊大</span><span class="chip">#クマップ</span></div>
<div class="abs title fit" style="left:72px;width:936px;top:290px;height:260px;font-size:112px;line-height:1.08">${title}</div>
<div class="abs fit" style="left:72px;width:936px;top:572px;height:100px;font-size:32px;line-height:1.5;color:var(--green)">${esc(post.cover.lead)}</div>
${ASSETS.coverScene ? `<img class="abs" style="left:0;top:700px;width:1080px" src="${ASSETS.coverScene}">` : ""}
<div class="abs" style="left:0;right:0;top:1168px;bottom:0;background:var(--green)"></div>
<div class="abs" style="left:72px;bottom:42px;color:var(--bg);font:700 32px Arial,sans-serif">@kumap_info</div>
<div class="abs" style="right:90px;bottom:46px;color:var(--bg);font:700 22px Arial,sans-serif">${page} / ${total}</div>`);
}

function pointPage(s, { page, total, index }) {
  return doc(`${header(`<span style="color:var(--red)">●</span> POINT`)}
<div class="abs num" style="left:64px;top:150px">${String(index).padStart(2, "0")}</div>
<div class="abs label" style="left:330px;top:196px">${esc(s.subtitle)}</div>
<div class="abs title fit" style="left:330px;width:678px;top:230px;height:100px;font-size:80px">${esc(s.heading)}</div>
${ASSETS.leaf ? `<img class="abs" style="left:878px;top:308px;width:120px" src="${ASSETS.leaf}">` : ""}
<div class="abs box fit" style="left:72px;width:936px;top:370px;height:560px;padding:56px 60px;font-size:44px;font-weight:700;line-height:1.75;color:var(--green)">${esc(s.body)}</div>
<div class="abs check" style="left:72px;width:936px;top:980px"><b>CHECK</b><span class="fit" style="font-weight:900;font-size:30px;white-space:nowrap">${esc(s.check)}</span></div>
${ASSETS.skyline ? `<img class="abs" style="left:0;bottom:80px;width:1080px" src="${ASSETS.skyline}">` : ""}
${footer(page, total)}`);
}

function stepsPage(s, { page, total }) {
  const gap = s.steps.length === 4 ? 190 : 230;
  const steps = s.steps
    .map(
      (st, i) => `<div class="abs step" style="left:72px;right:72px;top:${270 + i * gap}px">
<div class="dot"><small>STEP</small><span>${i + 1}</span></div>
<div style="padding-top:8px;min-width:0"><div class="fit" style="font-weight:900;font-size:40px;white-space:nowrap">${esc(st.title)}</div><div style="font-size:26px;margin-top:6px;line-height:1.45">${esc(st.desc)}</div></div></div>`,
    )
    .join("");
  return doc(`${header("HOW TO")}
<div class="abs title fit" style="left:72px;width:936px;top:136px;height:100px;font-size:76px;white-space:nowrap">${esc(s.heading)}</div>
<div class="abs rail" style="top:318px;height:${(s.steps.length - 1) * gap}px"></div>
${steps}
<div class="abs darkbar" style="left:72px;width:936px;top:1050px;height:96px"><i>TIPS</i><span class="fit" style="white-space:nowrap">${esc(s.tips)}</span></div>
${footer(page, total)}`);
}

function infoPage(s, { page, total }) {
  const rows = s.rows.map((r) => `<div class="row"><div class="k">${esc(r.label)}</div><div class="v">${esc(r.value)}</div></div>`).join("");
  return doc(`${header("INFORMATION")}
<div class="abs title fit" style="left:72px;width:936px;top:136px;height:200px;font-size:76px">${esc(s.heading)}</div>
<div class="abs" style="left:72px;width:936px;top:350px;border-top:3px solid var(--ink)">${rows}</div>
${s.deadline ? `<div class="abs darkbar" style="left:72px;width:936px;top:${350 + s.rows.length * 112 + 50}px;height:100px;justify-content:space-between"><span style="font-family:Arial,sans-serif;font-size:30px">DEADLINE</span><span class="fit" style="font-size:38px;white-space:nowrap">${esc(s.deadline)}</span></div>` : ""}
${footer(page, total)}`);
}

function rankingPage(s, { page, total }) {
  const items = s.items
    .map((it, i) => {
      const cls = i === 0 ? "top" : i < 3 ? "" : "minor";
      const comment = i < 3 ? `<div class="c">${esc(it.comment)}</div>` : "";
      return `<div class="rank ${cls}"><div class="n">${i + 1}</div><div><div class="name">${esc(it.name)}</div>${comment}</div></div>`;
    })
    .join("");
  return doc(`${header("RANKING")}
<div class="abs title fit" style="left:72px;width:936px;top:136px;height:200px;font-size:76px">${esc(s.heading)}</div>
<div class="abs" style="left:72px;width:936px;top:350px">${items}</div>
<div class="abs" style="left:72px;width:936px;top:1050px;font-size:22px;color:var(--green)">${esc(s.note)}</div>
${footer(page, total)}`);
}

function lastPage(post, { page, total }) {
  const svg = (d) => `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${d}</svg>`;
  return doc(
    `${ASSETS.leavesDarkTl ? `<img class="abs" style="left:10px;top:20px" src="${ASSETS.leavesDarkTl}">` : ""}
${ASSETS.leavesDarkR ? `<img class="abs" style="left:945px;top:405px" src="${ASSETS.leavesDarkR}">` : ""}
<div class="abs icon" style="left:370px;top:80px;width:340px;height:340px;border:10px solid var(--bg);${iconStyle({ keepBorder: true })}"></div>
<div class="abs logo" style="left:0;right:0;top:456px;text-align:center;font-size:42px;color:var(--bg)">熊大生の毎日に、使える情報を。</div>
<div class="abs" style="left:0;right:0;top:524px;text-align:center;font-size:76px;font-weight:900">保存して、あとで見返そう。</div>
<div class="abs" style="left:72px;top:680px;display:flex;gap:24px">
<div class="cta">${svg('<path d="M6 3h12v18l-6-5-6 5z"/>')}保存</div>
<div class="cta">${svg('<path d="M21 3 3 10l7 3 3 7z"/><path d="m10 13 4-4"/>')}友だちにシェア</div>
<div class="cta red">${svg('<circle cx="12" cy="7" r="4" fill="currentColor"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6z" fill="currentColor"/>')}フォロー</div></div>
<div class="abs" style="left:72px;width:936px;top:880px;height:84px;background:var(--bg);color:var(--ink);display:flex;align-items:center;padding:0 28px;gap:24px">
<span style="color:var(--red);font:700 26px Arial,sans-serif;padding-right:24px;border-right:2px solid var(--ink)">SOURCE</span>
<span class="fit" style="font-weight:700;font-size:26px;white-space:nowrap">熊本大学公式HP「${esc(post.source_title)}」</span></div>
<div class="abs" style="left:0;right:0;top:1254px;border-top:2px solid #2f5a43"></div>
<div class="abs" style="left:72px;bottom:32px;font:700 32px Arial,sans-serif">@kumap_info</div>
<div class="abs" style="right:90px;bottom:38px;font:700 22px Arial,sans-serif">${page} / ${total}</div>`,
    { dark: true },
  );
}

const SLIDE_RENDERERS = { point: pointPage, steps: stepsPage, info: infoPage, ranking: rankingPage };

/**
 * @param {object} post validated PostSchema output
 * @param {{date: string}} opts date shown on the cover, e.g. "2026.11.01"
 * @returns {string[]} one HTML document per page
 */
export function buildSlidesHtml(post, { date }) {
  const total = post.slides.length + 2;
  let pointIndex = 0;
  const middle = post.slides.map((s, i) => {
    if (s.type === "point") pointIndex += 1;
    return SLIDE_RENDERERS[s.type](s, { page: i + 2, total, index: pointIndex });
  });
  return [coverPage(post, { page: 1, total, date }), ...middle, lastPage(post, { page: total, total })];
}

/**
 * Renders each page to a JPEG (Instagram accepts JPEG only).
 * @returns {Promise<string[]>} written file paths
 */
export async function renderSlides(post, outDir, { date }) {
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({ viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } });
    const files = [];
    for (const [i, html] of buildSlidesHtml(post, { date }).entries()) {
      await tab.setContent(html, { waitUntil: "networkidle" });
      await tab.evaluate(() => document.fonts.ready);
      await tab.evaluate(FIT_SCRIPT);
      const file = `${outDir}/${i + 1}.jpg`;
      await tab.screenshot({ path: file, type: "jpeg", quality: 92 });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}
