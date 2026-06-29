### GitHub Actions

Bei GitHub-Workflow-Dateien muss der Schlüssel

```yaml
"on":
```

anstelle von

```yaml
on:
```

verwendet werden.

Grund:
Einige YAML-Parser und KI-Editoren interpretieren `on` nach YAML 1.1 als Boolean und erzeugen dadurch ungültige Workflows. Die Anführungszeichen vermeiden dieses Problem zuverlässig.
## Projektstruktur (standardisiert)

- JSON-API liegt im Root unter `api/` (nicht mehr `docs/api`); auf GitHub Pages: `.../selected-podcasts/api/...`.
- Eingabe-Quellen werden in `config/feeds.json` gepflegt; `scripts/fetch.js` schreibt die öffentliche Liste als `api/feeds.json`.
- Frontend liegt in `app/` und ist das einzige UI; relative API-URL `../api/latest-20.json` für lokal und Pages.
- GitHub Pages deployt aus dem Repo-Root (`/`). `.nojekyll` verhindert Jekyll-Filterung der JSON-Ordner.
- Root-`index.html` ist nur eine Weiterleitung auf `app/`. `scripts/dev-server.js` serviert das Repo-Root.

## Barrierefreiheit (Zielgruppe: ältere Nutzer)

- Große, runde Bedienelemente (Themen + Play/Stop), hohe Schriftkontraste, wenig Information auf einmal.
- Multimodales Feedback: kurzer Klick-/Stopp-Ton via Web Audio; AudioContext erst bei User-Geste starten/resumen.
- Klare Rücksprung-Möglichkeit (Zurück-Button) aus dem Detailbereich.
