# Meal Search Web App

A progressive web app for searching meals and discovering recipes. Users can search by name, browse by category, roll a random recipe, and save favorites — all powered by the [TheMealDB API](https://www.themealdb.com/api.php).

## Features

- **Search for meals** by name, with debounced live search as you type.
- **Browse by category** via clickable filter chips (Beef, Chicken, Seafood, ...).
- **Random meal** — one click for a surprise recipe.
- **Recipe modal** — full details (ingredients, instructions, category, origin) in a focused dialog.
- **Favorites** — save meals to `localStorage` from the grid or the modal; revisit them anytime, even offline.
- **Dark mode** toggle, persisted across visits.
- **Keyboard navigation** — arrow keys move through results, Enter/Space opens, Esc closes the modal.
- **Resilient** — loading spinner, friendly error messages with retry, in-memory response caching, and 429 rate-limit handling.
- **PWA** — installable, with a service worker that caches the app shell for offline use.

## Technologies

- **HTML / CSS / JavaScript (ES modules)**
- **Vite** for dev server and production builds
- **Vitest** + **jsdom** for unit tests
- **TheMealDB API** for meal data
- **Font Awesome** for icons
- **Poppins** + **Inter** for typography

## Project Structure

```
├── index.html              # App shell
├── src/
│   ├── main.js             # App logic, events, state
│   ├── api.js              # API client with caching + rate-limit handling
│   ├── storage.js          # localStorage helpers (favorites, theme)
│   ├── ui.js               # HTML rendering helpers (XSS-escaped)
│   └── styles/             # Modular stylesheets
│       ├── index.css       # Entry point (imports the layers below)
│       ├── base.css        # Reset, design tokens, theming
│       ├── layout.css      # App shell, header, footer
│       ├── components.css  # Search, chips, cards, pagination
│       ├── modal.css       # Recipe dialog
│       └── responsive.css  # Breakpoints + reduced motion
├── public/
│   ├── icons/              # App icons
│   ├── sw.js               # Service worker (offline app shell)
│   └── manifest.webmanifest
├── test/                   # Unit tests for api, storage, ui
├── vite.config.js
└── package.json
```

## Usage

```bash
npm install       # install dependencies
npm run dev       # start the dev server
npm run build     # create a production build in dist/
npm run preview   # preview the production build
npm test          # run the unit tests
```

Open the URL printed by `npm run dev` (default http://localhost:5173) in a browser.

## Notes

- An active internet connection is needed to fetch meal data from TheMealDB.
- TheMealDB's free tier is rate-limited; if you hit a 429 the app shows a friendly "wait and retry" message. In-memory caching helps avoid redundant requests.
- To use a personal API key, add `?apiKey=` support in `src/api.js`.

## Credits

Created by Hollali Kelvin.

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit). Feel free to contribute or report issues!
