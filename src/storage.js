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
  localStorage.setItem(key, JSON.stringify(value));
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

export function getTheme() {
  return read(THEME_KEY) ?? 'light';
}

export function setTheme(theme) {
  write(THEME_KEY, theme);
}
