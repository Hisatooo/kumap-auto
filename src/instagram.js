// Instagram API with Instagram Login — content publishing.
import { IG_API_BASE, IG_POLL_INTERVAL_MS, IG_POLL_MAX_TRIES } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function credentials() {
  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  if (!token || !userId) throw new Error("IG_ACCESS_TOKEN と IG_USER_ID を設定してください");
  return { token, userId };
}

async function call(method, path, params) {
  const { token } = credentials();
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${IG_API_BASE}/${path}?${body}` : `${IG_API_BASE}/${path}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    // Never log the token; the API error message does not include it.
    throw new Error(`Instagram API ${method} ${path} failed (HTTP ${res.status}): ${json.error?.message ?? "unknown error"}`);
  }
  return json;
}

async function waitUntilReady(containerId) {
  for (let i = 0; i < IG_POLL_MAX_TRIES; i++) {
    const { status_code } = await call("GET", containerId, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`メディアの処理に失敗しました (${status_code})`);
    await sleep(IG_POLL_INTERVAL_MS);
  }
  throw new Error("メディアの処理がタイムアウトしました");
}

/**
 * Publishes one image or a carousel. Image URLs must be public JPEGs.
 * @returns {Promise<string>} published media id
 */
export async function publishImages(imageUrls, caption) {
  const { userId } = credentials();
  if (imageUrls.length === 0) throw new Error("画像がありません");

  let creationId;
  if (imageUrls.length === 1) {
    ({ id: creationId } = await call("POST", `${userId}/media`, { image_url: imageUrls[0], caption }));
  } else {
    const children = [];
    for (const url of imageUrls) {
      const { id } = await call("POST", `${userId}/media`, { image_url: url, is_carousel_item: "true" });
      children.push(id);
    }
    await Promise.all(children.map(waitUntilReady));
    ({ id: creationId } = await call("POST", `${userId}/media`, { media_type: "CAROUSEL", children: children.join(","), caption }));
  }
  await waitUntilReady(creationId);
  const { id } = await call("POST", `${userId}/media_publish`, { creation_id: creationId });
  return id;
}

/** Long-lived tokens last 60 days; refreshing returns a new 60-day token. */
export async function refreshToken() {
  const { token } = credentials();
  const url = `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token })}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`トークン更新に失敗 (HTTP ${res.status}): ${json.error?.message ?? "unknown error"}`);
  return json.access_token;
}
