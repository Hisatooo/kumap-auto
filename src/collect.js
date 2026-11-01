// Step 1: save unseen recent articles to work/candidates.json for Claude to choose from.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SEEN_FILE } from "./config.js";
import { collectCandidates } from "./sources.js";

const CANDIDATES_FILE = "work/candidates.json";

async function main() {
  const { seen } = JSON.parse(await readFile(SEEN_FILE, "utf8"));
  const candidates = await collectCandidates(seen);
  await mkdir("work", { recursive: true });
  await writeFile(CANDIDATES_FILE, JSON.stringify(candidates, null, 2));
  console.info(`${candidates.length}件の候補を ${CANDIDATES_FILE} に保存しました`);
  for (const c of candidates) console.info(`- ${c.published?.toISOString().slice(0, 10) ?? "日付不明"} ${c.title}`);
}

main().catch((err) => {
  console.error("記事の収集に失敗:", err);
  process.exit(1);
});
