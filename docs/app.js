function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function createFallbackImage(label, accent = "#4a6a8a") {
  const safeLabel = normalizeWhitespace(label) || "Feed";
  const initials = safeLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${safeLabel}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#f0d8b0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="64" fill="url(#g)" />
      <text x="80" y="690" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="700">${initials}</text>
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
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatter.format(date);
}

function createCard(entry, formatter, template) {
  const element = template.content.firstElementChild.cloneNode(true);
  const imageLink = element.querySelector(".podcast-image-link");
  const image = element.querySelector(".podcast-image");
  const source = element.querySelector(".podcast-source");
  const date = element.querySelector(".podcast-date");
  const title = element.querySelector(".podcast-title");
  const description = element.querySelector(".podcast-description");
  const audio = element.querySelector(".podcast-audio");
  const button = element.querySelector(".podcast-button");

  const titleText = normalizeWhitespace(entry.title) || "Ohne Titel";
  const sourceText = normalizeWhitespace(entry.sourceTitle || entry.source) || "Unbekannte Quelle";
  const url = normalizeWhitespace(entry.url);
  const audioUrl = normalizeWhitespace(entry.audio);
  const imageUrl = normalizeWhitespace(entry.image) || createFallbackImage(sourceText);

  if (url) {
    imageLink.href = url;
    button.href = url;
  } else {
    imageLink.removeAttribute("href");
    button.removeAttribute("href");
    button.classList.add("is-disabled");
    button.setAttribute("aria-disabled", "true");
  }

  image.src = imageUrl;
  image.alt = `Cover fuer ${titleText}`;
  source.textContent = sourceText;
  date.textContent = formatDate(entry.date, formatter);
  title.textContent = titleText;
  description.textContent = normalizeWhitespace(entry.summary) || "Keine Zusammenfassung verfuegbar.";

  if (audioUrl) {
    audio.src = audioUrl;
  } else {
    audio.remove();
  }

  return element;
}

async function loadLatest() {
  const response = await fetch("./api/latest.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`api/latest.json konnte nicht geladen werden (${response.status}).`);
  }

  const text = await response.text();
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (!Array.isArray(data)) {
    throw new Error("api/latest.json muss ein Array enthalten.");
  }

  return data;
}

async function init() {
  const list = document.querySelector("#entry-list");
  const status = document.querySelector("#status");
  const count = document.querySelector("#entry-count");
  const template = document.querySelector("#entry-card-template");
  const formatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

  setStatus(status, "Lade Eintraege ...");

  try {
    const entries = await loadLatest();
    count.textContent = String(entries.length);
    list.replaceChildren();

    if (!entries.length) {
      setStatus(status, "Noch keine Eintraege vorhanden. Fuege Quellen in docs/api/feeds.json hinzu und starte npm run update.", "empty");
      return;
    }

    setStatus(status, `Es werden ${entries.length} Eintraege aus der Content-API angezeigt.`);
    const fragment = document.createDocumentFragment();

    for (const entry of entries) {
      fragment.append(createCard(entry, formatter, template));
    }

    list.append(fragment);
  } catch (error) {
    console.error(error);
    count.textContent = "0";
    setStatus(status, "Die API-Daten konnten nicht geladen werden. Bitte docs/api/latest.json pruefen.", "error");
  }
}

await init();
