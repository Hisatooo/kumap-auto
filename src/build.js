// Step 2: work/post.json (written by Claude) → slides + caption in posts/<id>/ → Artifact page site/index.html.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { POSTS_DIR, SEEN_FILE } from "./config.js";
import { renderSlides } from "./render.js";
import { COVER_STYLES, PostSchema } from "./schema.js";
import { buildCaption, writeSite } from "./site.js";

const POST_FILE = "work/post.json";
const CANDIDATES_FILE = "work/candidates.json";

function jstStamp(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${jst.slice(0, 10).replace(/-/g, "")}-${jst.slice(11, 16).replace(":", "")}`;
}

async function loadPost() {
  const parsed = PostSchema.safeParse(JSON.parse(await readFile(POST_FILE, "utf8")));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`${POST_FILE} の形式が正しくありません:\n${issues}`);
  }
  const candidates = JSON.parse(await readFile(CANDIDATES_FILE, "utf8"));
  if (parsed.data.source_name === "熊本大学公式HP" && !candidates.some((c) => c.url === parsed.data.source_url)) {
    throw new Error(`source_url が候補にありません（${CANDIDATES_FILE} からそのまま写す）: ${parsed.data.source_url}`);
  }
  return parsed.data;
}

async function main() {
  const loaded = await loadPost();
  const postCount = (await readdir(POSTS_DIR).catch(() => [])).length;
  const style = loaded.cover.style ?? COVER_STYLES[postCount % COVER_STYLES.length];
  const post = { ...loaded, cover: { ...loaded.cover, style } };
  const postId = jstStamp();
  const dir = `${POSTS_DIR}/${postId}`;
  await mkdir(dir, { recursive: true });

  const date = `${postId.slice(0, 4)}.${postId.slice(4, 6)}.${postId.slice(6, 8)}`;
  const images = await renderSlides(post, dir, { date });
  await writeFile(`${dir}/post.json`, JSON.stringify(post, null, 2) + "\n");
  await writeFile(`${dir}/caption.txt`, buildCaption(post) + "\n");

  const { seen } = JSON.parse(await readFile(SEEN_FILE, "utf8"));
  await writeFile(SEEN_FILE, JSON.stringify({ seen: [...seen, post.source_url] }, null, 2) + "\n");

  await writeSite();
  // The new images must be published alongside site/index.html under the same paths.
  console.info(JSON.stringify({ postId, newImages: images }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
