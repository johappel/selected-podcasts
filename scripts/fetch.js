import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createFallbackImage, formatIsoDate, normalizeWhitespace, readJsonFile, uniqueBy, writeJsonFile } from "./utils.js";
import { parseFeedXml } from "./parser.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const docsDir = path.join(repoRoot, "docs");
const feedsPath = path.join(docsDir, "feeds.json");
const podcastsPath = path.join(docsDir, "podcasts.json");
const requestTimeoutMs = 20000;

function clampCount(value, fallback = 6) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) {
    return fallback;
  }

  return Math.trunc(count);
}

function pickNonEmpty(...values) {
  for (const value of values) {
    const text = normalizeWhitespace(value);
    if (text) {
      return text;
    }
  }

  return "";
}

function buildSampleFeedXml(feed) {
  const baseTitle = feed.title || feed.id || "Selected Podcast";
  const baseLink = feed.feed || "https://example.com/podcast";
  const now = Date.now();
  const episodes = Array.from({ length: Math.max(3, clampCount(feed.count, 3)) }, (_, index) => {
    const episodeDate = new Date(now - index * 86400000);
    const episodeNumber = index + 1;
    const episodeTitle = `${baseTitle} Episode ${episodeNumber}`;
    const episodeDescription = `Sample episode generated as an offline fallback for ${baseTitle}.`;

    return `
      <item>
        <title>${episodeTitle}</title>
        <link>${baseLink}/episodes/${episodeNumber}</link>
        <guid isPermaLink="false">${feed.id || "sample"}-${episodeNumber}</guid>
        <description><![CDATA[${episodeDescription}]]></description>
        <pubDate>${episodeDate.toUTCString()}</pubDate>
        <enclosure url="${baseLink}/audio/${episodeNumber}.mp3" type="audio/mpeg" length="123456" />
        <itunes:image href="${baseLink}/cover-${episodeNumber}.jpg" />
      </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <title>${baseTitle}</title>
        <link>${baseLink}</link>
        <description>Offline sample feed for ${baseTitle}</description>
        <image>
          <url>${baseLink}/cover.jpg</url>
          <title>${baseTitle}</title>
          <link>${baseLink}</link>
        </image>
        ${episodes}
      </channel>
    </rss>`;
}

async function readFeedSource(feed) {
  if (!feed.feed) {
    throw new Error(`Feed ${feed.id || feed.title || "unknown"} is missing the feed URL.`);
  }

  if (feed.feed.startsWith("file://")) {
    const { fileURLToPath } = await import("node:url");
    return await readFile(fileURLToPath(feed.feed), "utf8");
  }

  if (!/^https?:\/\//i.test(feed.feed)) {
    const localPath = path.isAbsolute(feed.feed) ? feed.feed : path.resolve(repoRoot, feed.feed);
    return await readFile(localPath, "utf8");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    const response = await fetch(feed.feed, {
      signal: controller.signal,
      headers: {
        "user-agent": "selected-podcasts/1.0 (+https://johappel.github.io/selected-podcasts/)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status} for ${feed.feed}`);
    }

    return await response.text();
  } catch (error) {
    console.warn(`Falling back to a generated sample feed for ${feed.id || feed.title || feed.feed}: ${error.message}`);
    return buildSampleFeedXml(feed);
  }
}

function normalizeEpisode(feed, parsedFeed, item, index) {
  const source = pickNonEmpty(feed.title, parsedFeed.title, feed.id, "Podcast");
  const title = pickNonEmpty(item.title, `${source} Episode ${index + 1}`);
  const description = pickNonEmpty(item.description, parsedFeed.description, `Episode from ${source}.`);
  const date = formatIsoDate(item.date) || new Date().toISOString();
  const link = pickNonEmpty(item.link, feed.feed);
  const audio = pickNonEmpty(item.audio);
  const image = pickNonEmpty(item.image, parsedFeed.image, createFallbackImage(source, "#4a6a8a"));
  const id = pickNonEmpty(item.id, `${feed.id || source}-${date}-${title}`);

  return {
    id,
    source,
    title,
    description,
    date,
    link,
    audio,
    image,
  };
}

function compareByDateDesc(left, right) {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

async function main() {
  const feeds = await readJsonFile(feedsPath, []);
  if (!Array.isArray(feeds)) {
    throw new Error("docs/feeds.json must contain an array of feed definitions.");
  }

  const enabledFeeds = feeds.filter((feed) => feed && feed.enabled !== false && feed.feed);
  const episodes = [];

  for (const feed of enabledFeeds) {
    const rawXml = await readFeedSource(feed);
    const parsedFeed = parseFeedXml(rawXml, feed.feed, feed.title);
    const limit = clampCount(feed.count, 6);
    const sortedItems = [...parsedFeed.items].sort(compareByDateDesc);

    for (const [index, item] of sortedItems.slice(0, limit).entries()) {
      episodes.push(normalizeEpisode(feed, parsedFeed, item, index));
    }
  }

  const uniqueEpisodes = uniqueBy(episodes, (episode) => episode.link || episode.id || `${episode.source}:${episode.title}:${episode.date}`)
    .sort(compareByDateDesc);

  await writeJsonFile(podcastsPath, uniqueEpisodes);
  console.log(`Wrote ${uniqueEpisodes.length} episodes to ${path.relative(repoRoot, podcastsPath)}`);
}

await main();
