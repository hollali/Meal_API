# Meal Search Web App

A progressive web app for searching and discovering recipes, powered by [TheMealDB](https://www.themealdb.com/api.php) with [DummyJSON Recipes](https://dummyjson.com/docs/recipes) as a secondary source.

## Features

- **Search** by name with debounced live search.
- **Browse/filters** by category chips, area, and ingredient.
- **Random meal** from combined sources.
- **Deep links** for search/category/area/ingredient/favorites and `#meal=<id>` modal links; browser back/forward supported.
- **Recipe modal** with ingredients, instructions, tags, external links, share/copy link, print, shopping list copy, and focus trap.
- **Favorites+** save/remove, export/import JSON, clear all, persisted in `localStorage`.
- **Dark mode** persisted and system-aware on first load.
- **Keyboard/a11y**: grid arrow navigation, Enter/Space open, Esc close, focus restore.
- **Resilient**: loading states, friendly retry errors, stale-request aborts, in-memory caching, multi-source fallback.
- **PWA**: installable; service worker caches app shell and same-origin assets, with network fallback for runtime requests.

## Technologies

- **HTML / CSS / JavaScript (ES modules)**
- **Vite** build/dev
- **Vitest + jsdom** tests
- **TheMealDB + DummyJSON** data sources
- **Font Awesome**, **Poppins + Inter**

## Project Structure

```
├── index.html
├── src/
│   ├── main.js             # App state, events, routing, UI orchestration
│   ├── api.js              # TheMealDB/DummyJSON clients, cache, merge/dedupe
│   ├── storage.js          # favorites/theme localStorage helpers
│   ├── ui.js               # escaped HTML rendering helpers
│   └── styles/             # base/layout/components/modal/responsive
├── public/
│   ├── icons/
│   ├── sw.js               # service worker
│   └── manifest.webmanifest
├── test/                   # api, storage, ui tests
├── .github/workflows/deploy.yml
└── package.json
```

## Usage

```bash
npm install       # install dependencies
npm run dev       # start the dev server
npm run lint      # syntax-check core JS/service worker
npm test          # run unit tests
npm run build     # create a production build in dist/
npm run check     # lint + test + build
npm run preview   # preview the production build
```

Open the URL printed by `npm run dev` (default http://localhost:5173) in a browser.

## Notes

- Internet is required for fresh recipe data; favorites and app shell can work offline after first load.
- TheMealDB can return 429; the app shows a friendly retry message and uses in-memory caching.
- API sources are merged and deduped by meal name where applicable; DummyJSON items use `dj-<id>` IDs.

## Credits

Created by Hollali Kelvin.

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit). Feel free to contribute or report issues!
