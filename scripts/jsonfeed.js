import { normalizeWhitespace, parseDate, resolveMaybeUrl, stripHtml } from "./utils.js";

export function parseJsonFeed(raw, feedUrl) {
  const feed = typeof raw === "string" ? JSON.parse(raw.replace(/^\uFEFF/, "")) : raw;
  const items = Array.isArray(feed.items) ? feed.items : [];

  return items.map((item) => ({
    id: normalizeWhitespace(item.id || item.url || item.external_url || item.title),
    title: normalizeWhitespace(item.title),
    summary: stripHtml(item.summary || item.content_text || item.content_html),
    date: parseDate(item.date_published || item.date_modified),
    url: resolveMaybeUrl(feedUrl, item.url || item.external_url),
    audio: resolveMaybeUrl(feedUrl, item.attachments?.find((attachment) => String(attachment.mime_type || "").startsWith("audio/"))?.url),
    image: resolveMaybeUrl(feedUrl, item.image || item.banner_image || feed.icon || feed.favicon),
    tags: Array.isArray(item.tags) ? item.tags : [],
    category: [],
  }));
}
