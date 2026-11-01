import { FEEDS, MAX_ARTICLE_AGE_DAYS, MAX_ARTICLE_CHARS, MAX_CANDIDATES, USER_AGENT } from "./config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  return res.text();
}

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

// ponytail: regex RSS parsing — the feed is a fixed Plone RSS 1.0 format; switch to an XML parser if it changes.
export function parseFeed(xml) {
  const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  return items.flatMap((item) => {
    const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    const date = item.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1];
    if (!title || !link) return [];
    // "2026/10/27 12:49:00 GMT+9" → Date
    const published = date ? new Date(date.replace(/\//g, "-").replace(" GMT+9", "+09:00").replace(" ", "T")) : null;
    return [{ title: decodeEntities(title.trim()), url: link.trim(), published }];
  });
}

export function htmlToText(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  return decodeEntities(
    main
      .replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/g, " ")
      .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/g, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t　]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

// Returns recent, unseen articles with their body text.
export async function collectCandidates(seenUrls, now = new Date()) {
  const seen = new Set(seenUrls);
  const feeds = await Promise.all(FEEDS.map(fetchText));
  const fresh = feeds
    .flatMap(parseFeed)
    .filter((it) => !seen.has(it.url))
    .filter((it) => !it.published || now - it.published < MAX_ARTICLE_AGE_DAYS * DAY_MS)
    .slice(0, MAX_CANDIDATES);

  const withBodies = await Promise.all(
    fresh.map(async (it) => {
      try {
        const body = htmlToText(await fetchText(it.url)).slice(0, MAX_ARTICLE_CHARS);
        return { ...it, body };
      } catch (err) {
        console.warn(`本文の取得に失敗したのでスキップ: ${it.url} (${err.message})`);
        return null;
      }
    }),
  );
  return withBodies.filter(Boolean);
}
