const FAVORITES_KEY = 'meal-app-favorites';
const THEME_KEY = 'meal-app-theme';

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures (private mode/quota).
  }
}

export function getFavorites() {
  return read(FAVORITES_KEY) ?? {};
}

export function getFavoriteIds() {
  return Object.keys(getFavorites());
}

export function isFavorite(id) {
  return Object.prototype.hasOwnProperty.call(getFavorites(), String(id));
}

export function addFavorite(meal) {
  const favorites = getFavorites();
  favorites[String(meal.idMeal)] = meal;
  write(FAVORITES_KEY, favorites);
}

export function removeFavorite(id) {
  const favorites = getFavorites();
  delete favorites[String(id)];
  write(FAVORITES_KEY, favorites);
}

export function toggleFavorite(meal) {
  const id = String(meal.idMeal);
  if (isFavorite(id)) {
    removeFavorite(id);
    return false;
  }
  addFavorite(meal);
  return true;
}

export function clearFavorites() {
  write(FAVORITES_KEY, {});
}

export function replaceFavorites(favorites) {
  write(FAVORITES_KEY, favorites && typeof favorites === 'object' ? favorites : {});
}

export function getTheme() {
  const stored = read(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function setTheme(theme) {
  write(THEME_KEY, theme);
}
