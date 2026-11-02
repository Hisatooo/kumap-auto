import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./config.js";
import { CATEGORIES } from "./schema.js";

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

// Covers V01–V09: the user's template PNG is the background; its placeholder text is painted over
// with the background colour and the real text is laid on top. Coordinates are in template pixels.
const COVER_IMG = Object.fromEntries(
  ["v01", "v02", "v03", "v04", "v05", "v06", "v07", "v08", "v09"].map((k) => [k, asset(`covers/${k}.png`)]),
);
const C = { bg: "#f3eee4", sand: "#e4ddcf", green: "#1d3a2c", red: "#c3282e", gold: "#f1d58c", white: "#fff", ink: "#1a1a1a" };
const mask = (x, y, w, h, color) => `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${color}"></div>`;
const text = (x, y, w, h, style, html) => `<div class="abs fit" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${style}">${html}</div>`;
const iconAt = (x, y, size) => (ASSETS.icon ? `<div class="abs icon" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;${iconStyle()}"></div>` : "");
const pageNo = ({ page, total }, color, bg, top = 1280) =>
  `${mask(880, top - 5, 150, 50, bg)}${text(860, top, 152, 40, `text-align:right;font:700 22px Arial,sans-serif;color:${color}`, `${page} / ${total}`)}`;
const titleHtml = (post, lastStyle = "") => {
  const ls = lines(post.cover.title);
  return ls.map((l, i) => (i === ls.length - 1 && lastStyle ? `<span style="${lastStyle}">${l}</span>` : l)).join("<br>");
};
const vol = (n) => `VOL.${String(n).padStart(2, "0")}`;
const categoryLabel = (post) => `${post.category} ${esc(CATEGORIES[post.category])}`;
const chip = (label, style) => `<span style="display:inline-block;height:56px;line-height:52px;padding:0 24px;font-weight:900;font-size:26px;margin-right:14px;${style}">${label}</span>`;
const sceneImg = (style) => (ASSETS.coverScene ? `<img class="abs" style="${style}" src="${ASSETS.coverScene}">` : "");

// Short labels for V03 points / V07 list: ranking names, else slide headings.
export function coverItems(post) {
  const ranking = post.slides.find((s) => s.type === "ranking");
  return ranking ? ranking.items.map((it) => it.name) : post.slides.map((s) => s.heading);
}

const COVERS = {
  v01: (post, o) => `${iconAt(58, 53, 68)}${mask(852, 60, 178, 50, C.ink)}${text(852, 66, 178, 40, "color:#fff;text-align:center;font:700 26px Arial,sans-serif", vol(o.vol))}
${mask(200, 360, 680, 100, C.sand)}${mask(60, 780, 300, 40, C.sand)}${sceneImg("left:0;top:352px;width:1080px")}${mask(60, 820, 300, 40, C.green)}
<div class="abs" style="left:75px;top:790px">${chip(categoryLabel(post), `background:${C.red};color:#fff`)}</div>
${mask(60, 862, 980, 262, C.green)}${text(75, 872, 930, 240, "color:#fff;font-weight:900;font-size:100px;line-height:1.18", titleHtml(post))}
${mask(60, 1126, 980, 64, C.green)}${text(75, 1134, 930, 46, `color:${C.sand};font-size:30px;white-space:nowrap`, esc(post.cover.lead))}`,

  v02: (post, o) => `${iconAt(70, 55, 80)}${mask(60, 195, 440, 80, C.bg)}
<div class="abs" style="left:75px;top:207px">${chip(categoryLabel(post), `background:${C.red};color:#fff`)}${chip(vol(o.vol), `border:2px solid ${C.ink};line-height:48px;font-family:Arial,sans-serif`)}</div>
${mask(60, 280, 620, 130, C.bg)}${text(75, 290, 600, 120, `color:${C.green};font-size:30px;line-height:1.65`, esc(post.cover.lead))}
${mask(700, 120, 360, 700, C.bg)}${text(720, 140, 320, 670, `writing-mode:vertical-rl;color:${C.green};font-weight:900;font-size:120px;line-height:1.25`, titleHtml(post, `background:linear-gradient(90deg,transparent 22%,${"#ebb9a2"} 22%,${"#ebb9a2"} 48%,transparent 48%)`))}
${pageNo(o, C.bg, C.green)}`,

  v03: (post, o) => {
    const items = coverItems(post);
    const boxes = [[75, 295], [390, 298], [707, 298]]
      .map(([x, w], i) => `${mask(x + 8, 1058, w - 16, 52, C.green)}${text(x + 22, 1062, w - 44, 42, "color:#fff;font-weight:900;font-size:26px;white-space:nowrap", esc(items[i] ?? "続きはスワイプ"))}`)
      .join("");
    return `${iconAt(70, 53, 80)}${mask(860, 65, 170, 55, C.green)}${text(820, 74, 192, 40, `text-align:right;color:${C.gold};font:700 30px Arial,sans-serif`, vol(o.vol))}
${mask(140, 222, 760, 54, C.green)}${text(152, 230, 740, 40, "color:#fff;font-weight:700;font-size:26px", categoryLabel(post))}
${mask(0, 370, 1080, 460, C.green)}<div class="abs" style="left:-20px;top:380px;font:900 240px Arial,sans-serif;color:rgba(243,238,228,.06);white-space:nowrap;letter-spacing:-.02em">${post.category}</div>
${text(75, 490, 930, 320, "color:#fff;font-weight:900;font-size:112px;line-height:1.2", titleHtml(post, `text-decoration:underline;text-decoration-color:${C.red};text-decoration-thickness:14px;text-underline-offset:10px`))}
${mask(60, 852, 980, 72, C.green)}${text(75, 862, 930, 50, `color:${C.sand};font-size:30px;white-space:nowrap`, esc(post.cover.lead))}
${boxes}${pageNo(o, C.bg, C.green)}`;
  },

  v04: (post, o) => {
    const [y, m, d] = o.date.split(".");
    const point = post.slides.find((s) => s.type === "point");
    const body = point ? `${point.body.slice(0, 50)}…` : "";
    return `${iconAt(122, 80, 130)}
${mask(60, 226, 440, 42, C.bg)}${text(75, 230, 200, 36, "font-weight:900;font-size:24px", `第${String(o.vol).padStart(2, "0")}号`)}${text(280, 230, 220, 36, "font-weight:900;font-size:24px", `${y}年${Number(m)}月${Number(d)}日`)}
${mask(60, 290, 805, 285, C.bg)}${text(75, 300, 790, 260, `color:${C.ink};font-weight:900;font-size:100px;line-height:1.2`, titleHtml(post))}
${sceneImg("left:78px;top:603px;width:489px;height:549px;object-fit:cover;object-position:center bottom")}
${mask(598, 585, 424, 125, C.bg)}${text(607, 595, 405, 110, "font-weight:900;font-size:30px;line-height:1.55", esc(post.cover.lead))}
${mask(598, 772, 424, 115, C.bg)}${text(607, 785, 405, 95, "color:#555;font-size:24px;line-height:1.6", esc(body))}
${pageNo(o, C.bg, C.green, 1293)}`;
  },

  v05: (post, o) => `${mask(860, 62, 170, 58, C.green)}${text(860, 70, 170, 42, `text-align:center;color:${C.bg};font:700 28px Arial,sans-serif`, vol(o.vol))}
${iconAt(398, 193, 90)}
${mask(150, 305, 780, 56, C.bg)}${text(150, 312, 780, 42, `text-align:center;color:${C.red};font-weight:700;font-size:28px`, `―― ${categoryLabel(post)} ――`)}
${mask(100, 365, 880, 282, C.bg)}${text(110, 380, 860, 262, `text-align:center;color:${C.green};font-weight:900;font-size:110px;line-height:1.22`, titleHtml(post))}
${mask(105, 650, 870, 72, C.bg)}${text(120, 660, 840, 50, `text-align:center;color:${C.green};font-size:30px;white-space:nowrap`, esc(post.cover.lead))}
${pageNo(o, C.bg, C.green)}`,

  v06: (post, o) => `${iconAt(70, 53, 80)}
${mask(548, 235, 495, 200, C.bg)}${text(562, 248, 460, 40, "color:#5b2a86;font-weight:900;font-size:26px", categoryLabel(post))}${text(562, 300, 460, 125, `color:${C.green};font-size:28px;line-height:1.5`, esc(post.cover.lead))}
${mask(108, 625, 875, 285, C.white)}${text(125, 640, 840, 255, `color:${C.green};font-weight:900;font-size:92px;line-height:1.25`, titleHtml(post))}
${mask(228, 1046, 640, 72, C.bg)}${text(250, 1060, 600, 46, `color:${C.green};font-weight:900;font-size:30px`, "答えはスワイプした先に")}
${pageNo(o, C.bg, C.green)}`,

  v07: (post, o) => {
    const items = coverItems(post).slice(0, 5);
    const rowH = 474 / items.length;
    const rows = items
      .map((it, i) => `<div class="abs" style="left:105px;top:${707 + i * rowH}px;width:865px;height:${rowH}px;display:flex;align-items:center;gap:26px;${i < items.length - 1 ? `border-bottom:2px solid ${C.ink}` : ""}">
<span style="flex:none;width:54px;height:54px;border-radius:50%;background:${i === items.length - 1 ? C.red : C.green};color:#fff;font:700 28px Arial,sans-serif;display:flex;align-items:center;justify-content:center">${i + 1}</span>
<span class="fit" style="font-weight:900;font-size:34px;white-space:nowrap;min-width:0;flex:1">${esc(it)}</span></div>`)
      .join("");
    return `${iconAt(70, 53, 80)}${mask(860, 65, 170, 55, C.bg)}${text(820, 74, 192, 40, `text-align:right;color:${C.ink};font:700 30px Arial,sans-serif`, vol(o.vol))}
${mask(60, 318, 540, 245, C.bg)}${mask(596, 260, 50, 260, C.bg)}${text(75, 330, 490, 225, `color:${C.green};font-weight:900;font-size:96px;line-height:1.15`, titleHtml(post))}
<div class="abs" style="left:598px;top:147px;width:442px;height:442px;border-radius:50%;background:${C.gold}"></div>
${text(615, 215, 300, 300, `text-align:center;color:${C.green};font:900 270px/300px Arial,sans-serif`, String(items.length))}
${text(905, 400, 110, 110, `color:${C.green};font-weight:900;font-size:90px`, "選")}
${mask(60, 568, 545, 110, C.bg)}${text(75, 585, 520, 85, `color:${C.green};font-size:28px;line-height:1.5`, esc(post.cover.lead))}
${mask(82, 704, 916, 480, C.white)}${rows}`;
  },

  v08: (post, o) => {
    const ev = post.cover.event;
    const rows = [762, 870, 982]
      .map((yc, i) => {
        const r = ev.rows[i];
        return `${mask(390, yc - 38, 585, 76, C.bg)}${r ? `${text(400, yc - 18, 115, 36, `color:${C.red};font-weight:900;font-size:24px;white-space:nowrap`, esc(r.label))}${text(520, yc - 24, 450, 48, "font-weight:900;font-size:32px;white-space:nowrap", esc(r.value))}` : ""}`;
      })
      .join("");
    return `${iconAt(70, 53, 80)}${mask(780, 55, 250, 75, C.green)}<div class="abs" style="right:70px;top:64px;height:54px;line-height:54px;padding:0 22px;background:${C.red};color:#fff;font-weight:900;font-size:24px">${esc(ev.tag)}</div>
${mask(60, 390, 965, 245, C.green)}${text(75, 400, 930, 225, "color:#fff;font-weight:900;font-size:96px;line-height:1.2", titleHtml(post))}
${mask(85, 690, 255, 372, C.red)}
${text(75, 720, 275, 50, "text-align:center;color:#fff;font:700 36px Arial,sans-serif", esc(ev.month))}
${text(75, 785, 275, 170, "text-align:center;color:#fff;font:900 150px/170px Arial,sans-serif", esc(ev.day))}
${text(75, 960, 275, 50, "text-align:center;color:#fff;font:700 36px Arial,sans-serif", esc(ev.weekday))}
${rows}${pageNo(o, C.bg, C.green)}`;
  },

  v09: (post, o) => `${iconAt(470, 120, 140)}
${mask(428, 375, 224, 55, C.bg)}${text(428, 382, 224, 40, `text-align:center;color:${C.red};font:700 26px Arial,sans-serif`, post.category)}
${mask(60, 440, 960, 262, C.bg)}${text(75, 452, 930, 240, `text-align:center;color:${C.green};font-weight:900;font-size:108px;line-height:1.2`, titleHtml(post))}
${mask(70, 712, 940, 70, C.bg)}${text(85, 722, 910, 48, `text-align:center;color:${C.green};font-size:30px;white-space:nowrap`, esc(post.cover.lead))}
${pageNo(o, C.ink, C.bg, 1252)}`,
};

/** Styles a post can use: V07 needs 3+ items, V08 needs cover.event, V06 (Q&A) only when chosen. */
export function availableCoverStyles(post) {
  return Object.keys(COVERS).filter((k) => {
    if (k === "v06") return post.cover.style === "v06";
    if (k === "v07") return coverItems(post).length >= 3;
    if (k === "v08") return Boolean(post.cover.event);
    return true;
  });
}

function coverPage(post, opts) {
  const style = COVERS[post.cover.style] ? post.cover.style : "v01";
  const bg = COVER_IMG[style] ? `<img class="abs" style="left:0;top:0;width:1080px;height:1350px" src="${COVER_IMG[style]}">` : "";
  return doc(bg + COVERS[style](post, { vol: 1, ...opts }));
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
<span class="fit" style="font-weight:700;font-size:26px;white-space:nowrap">${esc(post.source_name)}「${esc(post.source_title)}」</span></div>
<div class="abs" style="left:0;right:0;top:1254px;border-top:2px solid #2f5a43"></div>
<div class="abs" style="left:72px;bottom:32px;font:700 32px Arial,sans-serif">@kumap_info</div>
<div class="abs" style="right:90px;bottom:38px;font:700 22px Arial,sans-serif">${page} / ${total}</div>`,
    { dark: true },
  );
}

const SLIDE_RENDERERS = { point: pointPage, steps: stepsPage, info: infoPage, ranking: rankingPage };

/**
 * @param {object} post validated PostSchema output
 * @param {{date: string, vol?: number}} opts cover date ("2026.11.01") and issue number
 * @returns {string[]} one HTML document per page
 */
export function buildSlidesHtml(post, { date, vol = 1 }) {
  const total = post.slides.length + 2;
  let pointIndex = 0;
  const middle = post.slides.map((s, i) => {
    if (s.type === "point") pointIndex += 1;
    return SLIDE_RENDERERS[s.type](s, { page: i + 2, total, index: pointIndex });
  });
  return [coverPage(post, { page: 1, total, date, vol }), ...middle, lastPage(post, { page: total, total })];
}

/**
 * Renders each page to a JPEG (Instagram accepts JPEG only).
 * @returns {Promise<string[]>} written file paths
 */
export async function renderSlides(post, outDir, { date, vol = 1 }) {
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({ viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } });
    const files = [];
    for (const [i, html] of buildSlidesHtml(post, { date, vol }).entries()) {
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
