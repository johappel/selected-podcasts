function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function createFallbackImage(label, accent = "#4a6a8a") {
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

function setStatus(status, message, mode = "info") {
  status.hidden = false;
  status.className = mode === "error" ? "status error-state" : mode === "empty" ? "status empty-state" : "status";
  status.textContent = message;
}

function formatDate(value, formatter) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? normalizeWhitespace(value) : formatter.format(date);
}

function createCard(podcast, formatter, template) {
  const element = template.content.firstElementChild.cloneNode(true);
  const imageLink = element.querySelector(".podcast-image-link");
  const image = element.querySelector(".podcast-image");
  const source = element.querySelector(".podcast-source");
  const date = element.querySelector(".podcast-date");
  const title = element.querySelector(".podcast-title");
  const description = element.querySelector(".podcast-description");
  const audio = element.querySelector(".podcast-audio");
  const button = element.querySelector(".podcast-button");

  const titleText = normalizeWhitespace(podcast.title) || "Ohne Titel";
  const sourceText = normalizeWhitespace(podcast.source) || "Unbekannte Quelle";
  const link = normalizeWhitespace(podcast.link);
  const audioUrl = normalizeWhitespace(podcast.audio);
  const imageUrl = normalizeWhitespace(podcast.image) || createFallbackImage(titleText);

  if (link) {
    imageLink.href = link;
    button.href = link;
  } else {
    imageLink.removeAttribute("href");
    button.removeAttribute("href");
    button.classList.add("is-disabled");
    button.setAttribute("aria-disabled", "true");
  }

  image.src = imageUrl;
  image.alt = `Cover fuer ${titleText}`;
  source.textContent = sourceText;
  date.textContent = formatDate(podcast.date, formatter);
  title.textContent = titleText;
  description.textContent = normalizeWhitespace(podcast.description) || "Keine Beschreibung verfuegbar.";

  if (audioUrl) {
    audio.src = audioUrl;
  } else {
    audio.remove();
  }

  return element;
}

async function loadPodcasts() {
  const response = await fetch("./podcasts.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`podcasts.json konnte nicht geladen werden (${response.status}).`);
  }

  const text = await response.text();
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (!Array.isArray(data)) {
    throw new Error("podcasts.json muss ein Array enthalten.");
  }

  return data;
}

async function init() {
  const list = document.querySelector("#podcast-list");
  const status = document.querySelector("#status");
  const count = document.querySelector("#podcast-count");
  const template = document.querySelector("#podcast-card-template");
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  setStatus(status, "Lade Episoden ...");

  try {
    const podcasts = await loadPodcasts();
    count.textContent = String(podcasts.length);
    list.replaceChildren();

    if (!podcasts.length) {
      setStatus(status, "Noch keine Episoden vorhanden. Fuege Feeds in docs/feeds.json hinzu und starte npm run update.", "empty");
      return;
    }

    setStatus(status, `Es werden ${podcasts.length} Episoden angezeigt.`);
    const fragment = document.createDocumentFragment();

    for (const podcast of podcasts) {
      fragment.append(createCard(podcast, formatter, template));
    }

    list.append(fragment);
  } catch (error) {
    console.error(error);
    count.textContent = "0";
    setStatus(status, "Die Daten konnten nicht geladen werden. Bitte docs/podcasts.json pruefen.", "error");
  }
}

await init();
