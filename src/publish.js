// Runs when an issue gets the "approve" label: publishes that draft to Instagram.
import { readdir } from "node:fs/promises";
import { POSTS_DIR } from "./config.js";
import { POST_ID_PATTERN } from "./draft.js";
import { publishImages } from "./instagram.js";

const CAPTION_MAX_CHARS = 2200; // Instagram limit
const HASHTAG_MAX = 30; // Instagram limit

/** Reads the post id and the (possibly edited) caption from the issue body. */
export function parseIssueBody(body) {
  const postId = body.match(/<!-- kumap-post:([^ ]+) -->/)?.[1];
  if (!postId || !POST_ID_PATTERN.test(postId)) throw new Error("Issue に投稿IDが見つかりません");

  const caption = body.replace(/\r\n/g, "\n").match(/```text\n([\s\S]*?)\n```/)?.[1]?.trim();
  if (!caption) throw new Error("Issue にキャプションが見つかりません");
  if ([...caption].length > CAPTION_MAX_CHARS) throw new Error(`キャプションが${CAPTION_MAX_CHARS}文字を超えています`);
  if ((caption.match(/#\S+/g) ?? []).length > HASHTAG_MAX) throw new Error(`ハッシュタグが${HASHTAG_MAX}個を超えています`);
  return { postId, caption };
}

async function main() {
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL が設定されていません");
  const { postId, caption } = parseIssueBody(process.env.ISSUE_BODY ?? "");

  const dir = `${POSTS_DIR}/${postId}`;
  const images = (await readdir(dir))
    .filter((f) => /^\d+\.jpg$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));
  const mediaId = await publishImages(images.map((f) => `${imageBaseUrl}/${dir}/${f}`), caption);
  console.info(`投稿しました: media_id=${mediaId}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("投稿に失敗:", err);
    process.exit(1);
  });
}
