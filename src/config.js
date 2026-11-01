// Settings that rarely change. Secrets come from environment variables.

export const FEEDS = [
  // 熊本大学「お知らせ[学生]」RSS. Add more student-relevant feeds here.
  "https://www.kumamoto-u.ac.jp/whatsnew/news_gakusei/rss",
];

export const MAX_ARTICLE_AGE_DAYS = 30;
export const MAX_CANDIDATES = 8; // articles sent to Claude per run
export const MAX_ARTICLE_CHARS = 4000; // per article, keeps the prompt small

export const CLAUDE_MODEL = "claude-opus-5-5";

export const IG_API_BASE = "https://graph.instagram.com/v26.0";
export const IG_POLL_INTERVAL_MS = 10_000;
export const IG_POLL_MAX_TRIES = 30; // 5 minutes

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350; // 4:5 portrait

export const POSTS_DIR = "posts";
export const SEEN_FILE = "state/seen.json";
export const USER_AGENT = "kumap-auto (+https://www.instagram.com/kumap_info/)";
