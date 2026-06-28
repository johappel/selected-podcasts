# selected-podcasts

A static GitHub Pages site that aggregates selected podcast episodes from configurable RSS feeds.

The repository has no server-side logic. A GitHub Action refreshes `docs/podcasts.json`, and the site renders only the generated JSON.

## Project idea

- collect a curated list of podcast episodes from one or more feeds
- generate static JSON from RSS or Atom sources
- render everything as a lightweight GitHub Pages site
- keep the structure easy to extend for categories, tags, search, favorites, YouTube feeds, Atom feeds, and JSON feeds later

## Setup

1. Install Node.js 22 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Regenerate the podcast data:

   ```bash
   npm run update
   ```

4. Start the local web server:

   ```bash
   npm run dev
   ```

Open the site in the browser shown by the terminal output.

## GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings > Pages**.
3. Set the source to **Deploy from a branch**.
4. Choose the branch you want to publish from.
5. Set the folder to **/docs**.
6. Save.

The site is prepared for the Pages URL:

`https://johappel.github.io/selected-podcasts/`

## Adding a feed

Edit `docs/feeds.json` and add a new object with these fields:

```json
{
  "id": "my-feed",
  "title": "My Feed",
  "feed": "https://example.com/feed.xml",
  "count": 6,
  "enabled": true
}
```

Then run:

```bash
npm run update
```

The update script reads `docs/feeds.json`, downloads every enabled feed, parses the XML, merges the newest episodes, sorts them by date, and writes `docs/podcasts.json`.

## GitHub Action

`.github/workflows/update.yml` runs daily and can also be started manually.

It uses Node 22, installs dependencies with `npm install`, runs `npm run update`, and commits `docs/podcasts.json` only when that file changed.

## Data contract

The site reads only `docs/podcasts.json`.
Each item uses this shape:

```json
{
  "id": "...",
  "source": "...",
  "title": "...",
  "description": "...",
  "date": "...",
  "link": "...",
  "audio": "...",
  "image": "..."
}
```

## Notes on extension

The code is split into small modules so later work can add categories, tags, search, favorites, multiple feed types, YouTube feeds, Atom feeds, and JSON feeds without changing the site architecture.
