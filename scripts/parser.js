import { escapeRegExp, normalizeWhitespace, parseDate, resolveMaybeUrl, stripHtml } from "./utils.js";

function blockPattern(tagName) {
  const name = escapeRegExp(tagName);
  return new RegExp(String.raw`<${name}\b[\s\S]*?<\/${name}>`, "gi");
}

function textPattern(tagName) {
  const name = escapeRegExp(tagName);
  return new RegExp(String.raw`<${name}\b[^>]*>([\s\S]*?)<\/${name}>`, "i");
}

function attributePattern(tagName, attributeName) {
  const name = escapeRegExp(tagName);
  const attribute = escapeRegExp(attributeName);
  return new RegExp(String.raw`<${name}\b([^>]*)\/?>`, "i");
}

function extractTextValue(block, tagNames) {
  for (const tagName of tagNames) {
    const match = block.match(textPattern(tagName));
    if (!match) {
      continue;
    }

    const value = stripHtml(match[1]);
    if (value) {
      return value;
    }
  }

  return "";
}

function extractAttributeValue(block, tagNames, attributeName) {
  for (const tagName of tagNames) {
    const tagMatch = block.match(attributePattern(tagName, attributeName));
    if (!tagMatch) {
      continue;
    }

    const attrs = tagMatch[1];
    const attrMatch = attrs.match(new RegExp(String.raw`${escapeRegExp(attributeName)}\s*=\s*(["'])(.*?)\1`, "i"));
    if (attrMatch) {
      return normalizeWhitespace(attrMatch[2]);
    }
  }

  return "";
}

function extractAtomLink(block, feedUrl) {
  const linkTags = block.match(/<link\b[^>]*\/?>/gi) ?? [];

  for (const tag of linkTags) {
    const relMatch = tag.match(/rel\s*=\s*(["'])(.*?)\1/i);
    const hrefMatch = tag.match(/href\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) {
      continue;
    }

    const rel = normalizeWhitespace(relMatch?.[2] ?? "");
    if (!rel || rel === "alternate") {
      return resolveMaybeUrl(feedUrl, hrefMatch[2]);
    }
  }

  for (const tag of linkTags) {
    const hrefMatch = tag.match(/href\s*=\s*(["'])(.*?)\1/i);
    if (hrefMatch) {
      return resolveMaybeUrl(feedUrl, hrefMatch[2]);
    }
  }

  return "";
}

function parseRssFeed(xml, feedUrl, configuredTitle) {
  const channelBlock = (xml.match(/<channel\b[\s\S]*?<\/channel>/i) ?? [xml])[0];
  const feedTitle = extractTextValue(channelBlock, ["title"]) || configuredTitle;
  const feedDescription = extractTextValue(channelBlock, ["description", "subtitle", "summary"]);
  const feedImage = resolveMaybeUrl(
    feedUrl,
    extractAttributeValue(channelBlock, ["itunes:image"], "href") || extractTextValue(channelBlock, ["image", "url", "logo", "icon"]),
  );

  const items = [...channelBlock.matchAll(blockPattern("item"))].map(([block]) => {
    const title = extractTextValue(block, ["title"]);
    const link = resolveMaybeUrl(feedUrl, extractTextValue(block, ["link"]));
    const description = extractTextValue(block, ["content:encoded", "description", "summary", "subtitle"]);
    const audio = resolveMaybeUrl(feedUrl, extractAttributeValue(block, ["enclosure"], "url") || extractAttributeValue(block, ["media:content"], "url"));
    const image = resolveMaybeUrl(
      feedUrl,
      extractAttributeValue(block, ["media:thumbnail", "media:content"], "url") || extractAttributeValue(block, ["itunes:image"], "href"),
    );
    const date = parseDate(extractTextValue(block, ["pubDate", "published", "updated", "dc:date"]));
    const guid = extractTextValue(block, ["guid"]);

    return {
      title,
      link,
      description,
      audio,
      image,
      date,
      id: guid || link || title,
    };
  });

  return {
    title: feedTitle,
    description: feedDescription,
    image: feedImage,
    items,
  };
}

function parseAtomFeed(xml, feedUrl, configuredTitle) {
  const feedBlock = (xml.match(/<feed\b[\s\S]*?<\/feed>/i) ?? [xml])[0];
  const feedTitle = extractTextValue(feedBlock, ["title"]) || configuredTitle;
  const feedDescription = extractTextValue(feedBlock, ["subtitle", "tagline", "summary"]);
  const feedImage = resolveMaybeUrl(feedUrl, extractTextValue(feedBlock, ["logo", "icon"]));

  const items = [...feedBlock.matchAll(blockPattern("entry"))].map(([block]) => {
    const title = extractTextValue(block, ["title"]);
    const summary = extractTextValue(block, ["summary", "content"]);
    const date = parseDate(extractTextValue(block, ["published", "updated", "issued"]));
    const link = extractAtomLink(block, feedUrl);
    const audio = resolveMaybeUrl(feedUrl, extractAttributeValue(block, ["enclosure"], "url"));
    const image = resolveMaybeUrl(feedUrl, extractAttributeValue(block, ["media:thumbnail", "media:content"], "url"));
    const id = extractTextValue(block, ["id"]) || link || title;

    return {
      title,
      link,
      description: summary,
      audio,
      image,
      date,
      id,
    };
  });

  return {
    title: feedTitle,
    description: feedDescription,
    image: feedImage,
    items,
  };
}

export function parseFeedXml(xml, feedUrl, configuredTitle = "") {
  const raw = String(xml ?? "").replace(/^\uFEFF/, "");
  const isAtom = /<feed\b/i.test(raw) && !/<rss\b/i.test(raw);

  return isAtom ? parseAtomFeed(raw, feedUrl, configuredTitle) : parseRssFeed(raw, feedUrl, configuredTitle);
}
