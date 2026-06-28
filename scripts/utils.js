export function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtmlEntities(value) {
  const text = String(value ?? "");
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

export function stripHtml(value) {
  const text = String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|section|article|blockquote|h[1-6])>/gi, " ")
    .replace(/<(p|div|li|section|article|blockquote|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return normalizeWhitespace(decodeHtmlEntities(text));
}

export function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function uniqueBy(items, getKey) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIsoDate(value) {
  const date = value instanceof Date ? value : parseDate(value);
  return date ? date.toISOString() : "";
}

export function resolveMaybeUrl(baseUrl, value) {
  const raw = normalizeWhitespace(value);
  if (!raw) {
    return "";
  }

  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return raw;
  }
}

export function createFallbackImage(label, accent = "#4a6a8a") {
  const safeLabel = normalizeWhitespace(label) || "Podcast";
  const initials = safeLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${safeLabel}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#f0d8b0" stop-opacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="72" fill="url(#g)" />
      <circle cx="960" cy="160" r="180" fill="rgba(255,255,255,0.14)" />
      <circle cx="180" cy="660" r="220" fill="rgba(255,255,255,0.09)" />
      <text x="84" y="710" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="700">${initials}</text>
      <text x="84" y="138" fill="#ffffff" fill-opacity="0.88" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="600">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function readJsonFile(filePath, fallbackValue) {
  const { readFile } = await import("node:fs/promises");

  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw error;
  }
}

export async function writeJsonFile(filePath, value) {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}


