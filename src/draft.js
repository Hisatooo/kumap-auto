// Daily job: collect news → Claude writes a post → render slides → write an approval issue body.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { POSTS_DIR, SEEN_FILE } from "./config.js";
import { generatePost } from "./generate.js";
import { renderSlides } from "./render.js";
import { collectCandidates } from "./sources.js";

export function buildCaption(post) {
  const tags = post.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  return `${post.caption.trim()}\n\n${tags}`;
}

export function buildIssueBody(post, imageUrls) {
  const images = imageUrls.map((u, i) => `<a href="${u}"><img src="${u}" width="270" alt="${i + 1}枚目"></a>`).join(" ");
  const downloads = imageUrls.map((u, i) => `[${i + 1}枚目](${u})`).join(" ・ ");
  return `**出典**: [${post.source_title}](${post.source_url})

${images}

**画像（この順番で投稿）**: ${downloads}

## キャプション（右上のボタンでコピー）
\`\`\`text
${buildCaption(post)}
\`\`\`

---
- 日付・金額・対象者は必ず出典と見比べてから投稿してください
- 投稿したら、または見送るならこの Issue を閉じる
`;
}

function jstStamp(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${jst.slice(0, 10).replace(/-/g, "")}-${jst.slice(11, 16).replace(":", "")}`;
}

async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function main() {
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL が設定されていません");

  const state = JSON.parse(await readFile(SEEN_FILE, "utf8"));
  const candidates = await collectCandidates(state.seen);
  if (candidates.length === 0) {
    console.info("新しい記事がないので今日は投稿案を作りません");
    return;
  }

  const post = await generatePost(candidates);
  if (post.skip) {
    console.info(`今日は見送り: ${post.skip_reason}`);
    return;
  }

  const postId = jstStamp();
  const dir = `${POSTS_DIR}/${postId}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/post.json`, JSON.stringify(post, null, 2));
  const date = `${postId.slice(0, 4)}.${postId.slice(4, 6)}.${postId.slice(6, 8)}`;
  const files = await renderSlides(post, dir, { date });

  const imageUrls = files.map((f) => `${imageBaseUrl}/${f}`);
  await writeFile(`${dir}/caption.txt`, buildCaption(post) + "\n");
  await writeFile(`${dir}/issue.md`, buildIssueBody(post, imageUrls));
  await writeFile(SEEN_FILE, JSON.stringify({ seen: [...state.seen, post.source_url] }, null, 2) + "\n");

  await setOutput("post_id", postId);
  await setOutput("title", post.cover.title.replace(/\\n|\n/g, " "));
  console.info(`投稿案を作成: ${dir} (${files.length}枚)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("投稿案の作成に失敗:", err);
    process.exit(1);
  });
}
