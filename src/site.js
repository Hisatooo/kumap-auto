// Builds site/index.html: the Artifact page that lists every generated post (newest first).
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { POSTS_DIR } from "./config.js";
import { CATEGORIES } from "./schema.js";

export const SITE_FILE = "site/index.html";
const MAX_POSTS_ON_PAGE = 30;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function buildCaption(post) {
  const tags = post.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  return `${post.caption.trim()}\n\n${tags}`;
}

/** @returns {Promise<{id: string, post: object, images: string[]}[]>} newest first */
export async function listPosts(postsDir = POSTS_DIR) {
  if (!existsSync(postsDir)) return [];
  const ids = (await readdir(postsDir)).filter((d) => /^\d{8}-\d{4}$/.test(d)).sort().reverse();
  const posts = await Promise.all(
    ids.slice(0, MAX_POSTS_ON_PAGE).map(async (id) => {
      const dir = `${postsDir}/${id}`;
      if (!existsSync(`${dir}/post.json`)) return null;
      const post = JSON.parse(await readFile(`${dir}/post.json`, "utf8"));
      const images = (await readdir(dir))
        .filter((f) => /^\d+\.jpg$/.test(f))
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((f) => `${POSTS_DIR}/${id}/${f}`);
      return { id, post, images };
    }),
  );
  return posts.filter(Boolean);
}

const formatDate = (id) => `${id.slice(0, 4)}.${id.slice(4, 6)}.${id.slice(6, 8)}`;

function postSection({ id, post, images }) {
  const title = esc(post.cover.title).replace(/\\n|\n/g, " ");
  const slides = images
    .map(
      (src, i) => `<figure class="slide"><img src="${src}" alt="${title} ${i + 1}枚目" loading="lazy" width="1080" height="1350">
<figcaption><span>${i + 1} / ${images.length}</span><button type="button" class="save" data-src="${src}" data-name="kumap-${id}-${i + 1}.jpg" hidden>保存</button></figcaption></figure>`,
    )
    .join("");
  return `<article class="post" id="p${id}">
<header class="post-head">
  <div class="meta"><time>${formatDate(id)}</time><span class="chip">${esc(post.category)} ${esc(CATEGORIES[post.category] ?? "")}</span></div>
  <h2>${title}</h2>
  <p class="lead">${esc(post.cover.lead)}</p>
  <a class="source" href="${esc(post.source_url)}" target="_blank" rel="noopener">出典：${esc(post.source_title)} ↗</a>
</header>
<div class="slides" tabindex="0" aria-label="投稿画像（横にスクロール）">${slides}</div>
<div class="caption">
  <div class="caption-bar"><span>キャプション</span><button type="button" class="copy">コピー</button></div>
  <pre>${esc(buildCaption(post))}</pre>
</div>
</article>`;
}

/** @param {{id: string, post: object, images: string[]}[]} posts newest first */
export function buildSiteHtml(posts, { iconDataUri = null } = {}) {
  const body = posts.length
    ? posts.map(postSection).join("\n")
    : `<p class="empty">まだ投稿案はありません。「更新して」と頼むと、ここに画像とキャプションが追加されます。</p>`;
  return `<title>クマップ 投稿ストック</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap">
<style>
/* Layout: one column of post cards; each card = meta, swipeable slide strip, caption to copy. Colors from the クマップ templates. */
:root {
  --bg:#f3eee4; --surface:#fbf8f2; --ink:#1b1b1b; --muted:#5d6b61; --line:#d9d1c1;
  --green:#1d3a2c; --red:#c3282e; --chip-fg:#ffffff; --code:#efe8da;
  --font:"Noto Sans JP","Hiragino Sans","Yu Gothic",sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg:#13241b; --surface:#1d3a2c; --ink:#f3eee4; --muted:#a9b8ad; --line:#2f5a43;
  --green:#f3eee4; --red:#e0484e; --chip-fg:#ffffff; --code:#173026; color-scheme:dark } }
:root[data-theme="dark"] {
  --bg:#13241b; --surface:#1d3a2c; --ink:#f3eee4; --muted:#a9b8ad; --line:#2f5a43;
  --green:#f3eee4; --red:#e0484e; --chip-fg:#ffffff; --code:#173026; color-scheme:dark }
body { background:var(--bg); color:var(--ink); font-family:var(--font); font-size:15px; line-height:1.6; }
.wrap { max-width:760px; margin:0 auto; padding-block:24px 64px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); display:flex; flex-direction:column; gap:28px; }
.top { display:flex; align-items:center; gap:14px; }
.top img { width:56px; height:56px; border-radius:50%; flex:none; }
.top h1 { margin:0; font-size:24px; font-weight:900; color:var(--green); text-wrap:balance; }
.top p { margin:2px 0 0; color:var(--muted); font-size:13px; }
.post { background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:20px; display:flex; flex-direction:column; gap:16px; min-width:0; }
.meta { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--muted); font-variant-numeric:tabular-nums; }
.chip { background:var(--red); color:var(--chip-fg); font-weight:700; font-size:12px; padding:2px 10px; letter-spacing:.04em; }
.post h2 { margin:8px 0 4px; font-size:22px; font-weight:900; color:var(--green); line-height:1.35; text-wrap:balance; }
.lead { margin:0 0 6px; }
.source { color:var(--muted); font-size:13px; word-break:break-all; }
.slides { display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:6px; }
.slides:focus-visible { outline:2px solid var(--red); outline-offset:4px; }
.slide { margin:0; flex:none; width:min(62vw, 260px); scroll-snap-align:start; display:flex; flex-direction:column; gap:6px; }
.slide img { width:100%; height:auto; aspect-ratio:4/5; display:block; border:1px solid var(--line); background:var(--code); }
.slide figcaption { display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; }
button { font:inherit; font-size:13px; font-weight:700; color:var(--green); background:transparent; border:1.5px solid var(--green); border-radius:4px; padding:3px 12px; cursor:pointer; }
button:hover { background:var(--green); color:var(--surface); }
button:focus-visible { outline:2px solid var(--red); outline-offset:2px; }
.caption { border-top:1px solid var(--line); padding-top:12px; display:flex; flex-direction:column; gap:8px; }
.caption-bar { display:flex; justify-content:space-between; align-items:center; font-size:13px; font-weight:700; letter-spacing:.06em; color:var(--muted); }
.caption pre { margin:0; white-space:pre-wrap; word-break:break-word; font-family:var(--font); font-size:14px; background:var(--code); padding:14px; border-radius:4px; }
.empty { color:var(--muted); }
.toast { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(20px + env(safe-area-inset-bottom, 0px)); background:var(--green); color:var(--surface); padding:8px 16px; border-radius:4px; font-size:13px; font-weight:700; }
@media (prefers-reduced-motion: no-preference) { .slides { scroll-behavior:smooth; } }
</style>
<div class="wrap">
<header class="top">
  ${iconDataUri ? `<img src="${iconDataUri}" alt="クマップ">` : ""}
  <div><h1>クマップ 投稿ストック</h1><p>熊大公式のお知らせや、熊本の熊大生向け情報（学割・制度・お店など）から作った投稿案。画像を保存し、キャプションをコピーして Instagram に投稿。</p></div>
</header>
${body}
</div>
<div class="toast" role="status" hidden></div>
<script>
(() => {
  const toast = document.querySelector(".toast");
  let timer;
  const notify = (msg) => { toast.textContent = msg; toast.hidden = false; clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 2200); };

  document.querySelectorAll(".copy").forEach((btn) => btn.addEventListener("click", () => {
    const pre = btn.closest(".caption").querySelector("pre");
    navigator.clipboard.writeText(pre.textContent).then(() => notify("キャプションをコピーしました"), () => {
      const range = document.createRange(); range.selectNodeContents(pre);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      notify("選択しました。長押しまたは ⌘C でコピーしてください");
    });
  }));

  const ready = window.claude && window.claude.use ? window.claude.use("downloads") : Promise.resolve(null);
  ready.then((downloads) => {
    if (!downloads) return; // no save support here: long-press the image instead
    document.querySelectorAll(".save").forEach((btn) => {
      btn.hidden = false;
      btn.addEventListener("click", async () => {
        try {
          const blob = await (await fetch(btn.dataset.src)).blob();
          await downloads.save({ filename: btn.dataset.name, data: blob });
          notify("保存しました");
        } catch (err) {
          if (err && err.code === "declined") return;
          notify(err && err.code === "rate_limited" ? "前の保存が終わってからもう一度押してください" : "保存できませんでした。画像を長押しして保存してください");
        }
      });
    });
  });
})();
</script>`;
}

export async function writeSite() {
  const icon = existsSync("assets/icon.png") ? `data:image/png;base64,${readFileSync("assets/icon.png").toString("base64")}` : null;
  await mkdir("site", { recursive: true });
  await writeFile(SITE_FILE, buildSiteHtml(await listPosts(), { iconDataUri: icon }));
}
