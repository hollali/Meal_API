import './styles/index.css';
import {
  fetchMealsAll as fetchMeals,
  fetchMealByIdAll as fetchMealById,
  fetchRandomMealAll as fetchRandomMeal,
  fetchCategories,
  fetchMealsByCategoryAll as fetchMealsByCategory,
  fetchAreas,
  fetchIngredients,
  fetchMealsByArea,
  fetchMealsByIngredient,
  isAbortError,
} from './api.js';
import {
  getFavoriteIds,
  isFavorite,
  toggleFavorite,
  getFavorites,
  getTheme,
  setTheme,
  clearFavorites,
  replaceFavorites,
} from './storage.js';
import { mealCardGrid, renderModalBody, escapeHtml, paginate, buildIngredients } from './ui.js';

const search = document.getElementById('search');
const submit = document.getElementById('submit');
const random = document.getElementById('random');
const favoritesBtn = document.getElementById('favorites');
const themeToggle = document.getElementById('theme-toggle');
const categoriesEl = document.getElementById('categories');
const areaFilter = document.getElementById('area-filter');
const ingredientFilter = document.getElementById('ingredient-filter');
const clearFiltersBtn = document.getElementById('clear-filters');
const exportFavoritesBtn = document.getElementById('export-favorites');
const importFavoritesBtn = document.getElementById('import-favorites-btn');
const importFavoritesInput = document.getElementById('import-favorites');
const clearFavoritesBtn = document.getElementById('clear-favorites');
const toastEl = document.getElementById('toast');
const resultHeading = document.getElementById('meal-result-heading');
const mealsEl = document.getElementById('meals');
const loader = document.getElementById('loader');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

const PAGE_SIZE = 12;

const state = {
  lastSearch: null,
  currentCategory: null,
  currentArea: null,
  currentIngredient: null,
  viewingFavorites: false,
  page: 1,
};

let mealsById = new Map();
let currentModalMeal = null;
let currentResults = [];
let listController = null;
let detailController = null;
let toastTimer = null;
let lastFocusBeforeModal = null;

function beginListRequest() {
  if (listController) {
    listController.abort();
  }
  listController = new AbortController();
  return listController.signal;
}

function abortListRequest() {
  if (listController) {
    listController.abort();
    listController = null;
  }
}

function beginDetailRequest() {
  if (detailController) {
    detailController.abort();
  }
  detailController = new AbortController();
  return detailController.signal;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.innerHTML =
    theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function setLoading(isLoading) {
  loader.hidden = !isLoading;
  mealsEl.hidden = isLoading;
  if (isLoading) {
    pagination.hidden = true;
  }
}

function setHeading(message) {
  resultHeading.textContent = message;
}

function showError(message, retry) {
  resultHeading.textContent = '';
  resultHeading.appendChild(document.createTextNode(message));
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'retry-btn';
    button.textContent = 'Try again';
    button.addEventListener('click', retry);
    resultHeading.appendChild(button);
  }
}

function handleError(error, retry) {
  const isRateLimit = error && /rate limit/i.test(error.message);
  showError(
    isRateLimit
      ? 'Rate limit reached. Please wait a moment and try again.'
      : 'Something went wrong. Please check your connection and try again.',
    retry
  );
  console.error(error);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

function updateUrl(params, { replace = false } = {}) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (replace) history.replaceState(null, '', next);
  else history.pushState(null, '', next);
}

function currentUrlParams() {
  return {
    q: state.lastSearch,
    category: state.currentCategory,
    area: state.currentArea,
    ingredient: state.currentIngredient,
    favorites: state.viewingFavorites ? '1' : '',
  };
}

function renderMeals(meals, heading) {
  currentResults = meals;
  mealsById = new Map(meals.map((meal) => [String(meal.idMeal), meal]));
  setHeading(heading);
  renderPage();
  mealsEl.hidden = false;
}

function renderPage() {
  const { items, page, totalPages, hasPrev, hasNext } = paginate(
    currentResults,
    state.page,
    PAGE_SIZE
  );
  state.page = page;
  mealsEl.innerHTML = mealCardGrid(items, getFavoriteIds());
  pagination.hidden = !(currentResults.length > 0 && totalPages > 1);
  prevPageBtn.disabled = !hasPrev;
  nextPageBtn.disabled = !hasNext;
  pageInfo.textContent = `Page ${page} of ${totalPages}`;
}

function clearResults() {
  currentResults = [];
  mealsById = new Map();
  mealsEl.innerHTML = '';
  pagination.hidden = true;
}

async function searchMeals(query, { syncUrl = true } = {}) {
  const item = query.trim();
  if (!item) return;
  const signal = beginListRequest();
  state.lastSearch = item;
  state.viewingFavorites = false;
  state.page = 1;
  resetFilters();
  clearResults();
  setHeading('');
  setLoading(true);
  if (syncUrl) updateUrl({ q: item });
  try {
    const meals = await fetchMeals(item, { signal });
    if (signal.aborted) return;
    setLoading(false);
    if (meals.length === 0) {
      setHeading(`Oops !! No result for "${item}"`);
      return;
    }
    renderMeals(meals, `Search result for "${item}" (${meals.length})`);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return;
    setLoading(false);
    handleError(error, () => searchMeals(item, { syncUrl: false }));
  }
}

async function showCategory(category, { syncUrl = true } = {}) {
  const signal = beginListRequest();
  state.currentCategory = category;
  state.lastSearch = null;
  state.viewingFavorites = false;
  state.page = 1;
  resetFilters({ keepCategory: true });
  setCategoryActive(category);
  clearResults();
  setHeading('');
  setLoading(true);
  if (syncUrl) updateUrl({ category });
  try {
    const meals = await fetchMealsByCategory(category, { signal });
    if (signal.aborted) return;
    setLoading(false);
    if (meals.length === 0) {
      setHeading(`No meals found in "${category}"`);
      return;
    }
    renderMeals(meals, `${category} (${meals.length} meals)`);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return;
    setLoading(false);
    handleError(error, () => showCategory(category, { syncUrl: false }));
  }
}

async function showArea(area, { syncUrl = true } = {}) {
  const signal = beginListRequest();
  state.currentArea = area;
  state.lastSearch = null;
  state.viewingFavorites = false;
  state.page = 1;
  resetFilters({ keepArea: true });
  areaFilter.value = area;
  clearResults();
  setHeading('');
  setLoading(true);
  if (syncUrl) updateUrl({ area });
  try {
    const meals = await fetchMealsByArea(area, { signal });
    if (signal.aborted) return;
    setLoading(false);
    if (meals.length === 0) {
      setHeading(`No meals found in "${area}"`);
      return;
    }
    renderMeals(meals, `${area} cuisine (${meals.length} meals)`);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return;
    setLoading(false);
    handleError(error, () => showArea(area, { syncUrl: false }));
  }
}

async function showIngredient(ingredient, { syncUrl = true } = {}) {
  const signal = beginListRequest();
  state.currentIngredient = ingredient;
  state.lastSearch = null;
  state.viewingFavorites = false;
  state.page = 1;
  resetFilters({ keepIngredient: true });
  ingredientFilter.value = ingredient;
  clearResults();
  setHeading('');
  setLoading(true);
  if (syncUrl) updateUrl({ ingredient });
  try {
    const meals = await fetchMealsByIngredient(ingredient, { signal });
    if (signal.aborted) return;
    setLoading(false);
    if (meals.length === 0) {
      setHeading(`No meals found with "${ingredient}"`);
      return;
    }
    renderMeals(meals, `Ingredient: ${ingredient} (${meals.length} meals)`);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return;
    setLoading(false);
    handleError(error, () => showIngredient(ingredient, { syncUrl: false }));
  }
}

function showFavorites({ syncUrl = true } = {}) {
  abortListRequest();
  state.viewingFavorites = true;
  state.lastSearch = null;
  state.page = 1;
  resetFilters();
  setLoading(false);
  if (syncUrl) updateUrl({ favorites: '1' });
  const meals = Object.values(getFavorites());
  if (meals.length === 0) {
    clearResults();
    setHeading('No favorites yet. Click the heart on any meal to save it.');
    return;
  }
  renderMeals(meals, `Your favorites (${meals.length})`);
}

async function openMeal(mealId, { syncUrl = true } = {}) {
  const signal = beginDetailRequest();
  setLoading(true);
  try {
    const meal = await fetchMealById(mealId, { signal });
    if (signal.aborted) return;
    setLoading(false);
    openModal(meal, { syncUrl });
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return;
    setLoading(false);
    handleError(error);
  }
}

async function getRandomMeal() {
  abortListRequest();
  const signal = beginDetailRequest();
  state.lastSearch = null;
  state.viewingFavorites = false;
  state.page = 1;
  resetFilters();
  clearResults();
  setHeading('');
  setLoading(true);
  updateUrl({});
  try {
    const meal = await fetchRandomMeal({ signal });
    if (signal.aborted) return;
    setLoading(false);
    openModal(meal);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return;
    setLoading(false);
    handleError(error);
  }
}

function setCategoryActive(category) {
  categoriesEl.querySelectorAll('.category-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });
}

function resetFilters({ keepCategory = false, keepArea = false, keepIngredient = false } = {}) {
  if (!keepCategory) state.currentCategory = null;
  if (!keepArea) state.currentArea = null;
  if (!keepIngredient) state.currentIngredient = null;
  if (!keepCategory) setCategoryActive(null);
  if (!keepArea) areaFilter.value = '';
  if (!keepIngredient) ingredientFilter.value = '';
}

async function loadCategories() {
  try {
    const categories = await fetchCategories();
    categoriesEl.innerHTML = categories
      .map(
        (category) =>
          `<button type="button" class="category-chip" data-category="${escapeHtml(category.strCategory)}">${escapeHtml(category.strCategory)}</button>`
      )
      .join('');
  } catch (error) {
    console.error('Failed to load categories', error);
    categoriesEl.innerHTML = '';
  }
}

async function loadFilters() {
  try {
    const [areas, ingredients] = await Promise.all([fetchAreas(), fetchIngredients()]);
    areaFilter.innerHTML =
      '<option value="">All areas</option>' +
      areas.map((a) => `<option value="${escapeHtml(a.strArea)}">${escapeHtml(a.strArea)}</option>`).join('');
    ingredientFilter.innerHTML =
      '<option value="">All ingredients</option>' +
      ingredients
        .slice(0, 120)
        .map((i) => `<option value="${escapeHtml(i.strIngredient)}">${escapeHtml(i.strIngredient)}</option>`)
        .join('');
  } catch (error) {
    console.error('Failed to load filters', error);
  }
}

function openModal(meal, { syncUrl = true } = {}) {
  currentModalMeal = meal;
  lastFocusBeforeModal = document.activeElement;
  modalBody.innerHTML = renderModalBody(meal, isFavorite(meal.idMeal));
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  if (syncUrl) {
    const url = new URL(location.href);
    url.hash = `meal=${encodeURIComponent(String(meal.idMeal))}`;
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  modalClose.focus();
}

function closeModal({ syncUrl = true } = {}) {
  modal.hidden = true;
  document.body.style.overflow = '';
  currentModalMeal = null;
  if (syncUrl) {
    const url = new URL(location.href);
    url.hash = '';
    history.replaceState(null, '', `${url.pathname}${url.search}`);
  }
  if (lastFocusBeforeModal && typeof lastFocusBeforeModal.focus === 'function') {
    lastFocusBeforeModal.focus();
  }
}

function toggleModalFavorite() {
  if (!currentModalMeal) return;
  const isNowFav = toggleFavorite(currentModalMeal);
  const button = modalBody.querySelector('.fav-btn');
  button.classList.toggle('fav-btn--active', isNowFav);
  button.innerHTML = isNowFav
    ? '<i class="fas fa-heart"></i> Remove from favorites'
    : '<i class="far fa-heart"></i> Save to favorites';
  showToast(isNowFav ? 'Saved to favorites' : 'Removed from favorites');
}

function toggleCardFavorite(id) {
  const meal = mealsById.get(String(id));
  if (!meal) {
    return;
  }
  const isNowFav = toggleFavorite(meal);
  const chip = mealsEl.querySelector(`.fav-chip[data-id="${id}"]`);
  if (chip) {
    chip.classList.toggle('fav-chip--active', isNowFav);
    chip.innerHTML = isNowFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
  }
  if (state.viewingFavorites && !isNowFav) {
    showFavorites();
  }
}

function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounce((query) => {
  const item = query.trim();
  if (item) {
    searchMeals(item);
  }
});

submit.addEventListener('submit', (e) => {
  e.preventDefault();
  const item = search.value.trim();
  if (!item) {
    showError('Please input a meal name.');
    return;
  }
  searchMeals(item);
  search.value = '';
});

search.addEventListener('input', (e) => debouncedSearch(e.target.value));

random.addEventListener('click', getRandomMeal);

favoritesBtn.addEventListener('click', () => showFavorites());

areaFilter.addEventListener('change', (e) => {
  const value = e.target.value;
  if (value) showArea(value);
});

ingredientFilter.addEventListener('change', (e) => {
  const value = e.target.value;
  if (value) showIngredient(value);
});

clearFiltersBtn.addEventListener('click', () => {
  resetFilters();
  clearResults();
  setHeading('Filters cleared.');
  updateUrl({});
});

exportFavoritesBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getFavorites(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'meal-favorites.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Favorites exported');
});

importFavoritesBtn.addEventListener('click', () => importFavoritesInput.click());
importFavoritesInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid');
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, meal]) => meal && typeof meal === 'object' && meal.idMeal && meal.strMeal)
    );
    replaceFavorites(cleaned);
    showToast('Favorites imported');
    if (state.viewingFavorites) showFavorites({ syncUrl: false });
  } catch {
    showToast('Invalid favorites file');
  } finally {
    importFavoritesInput.value = '';
  }
});

clearFavoritesBtn.addEventListener('click', () => {
  clearFavorites();
  showToast('Favorites cleared');
  if (state.viewingFavorites) showFavorites({ syncUrl: false });
});

prevPageBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    renderPage();
    mealsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

nextPageBtn.addEventListener('click', () => {
  const { hasNext } = paginate(currentResults, state.page, PAGE_SIZE);
  if (hasNext) {
    state.page += 1;
    renderPage();
    mealsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  applyTheme(next);
});

categoriesEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.category-chip');
  if (chip) {
    showCategory(chip.dataset.category);
  }
});

mealsEl.addEventListener('click', (e) => {
  const favChip = e.target.closest('.fav-chip');
  if (favChip) {
    toggleCardFavorite(favChip.dataset.id);
    return;
  }
  const meal = e.target.closest('.meal');
  if (meal) {
    openMeal(meal.dataset.mealid);
  }
});

mealsEl.addEventListener('keydown', (e) => {
  const meals = [...mealsEl.querySelectorAll('.meal')];
  const index = meals.indexOf(document.activeElement);
  if (index === -1) {
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openMeal(meals[index].dataset.mealid);
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    meals[(index + 1) % meals.length].focus();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    meals[(index - 1 + meals.length) % meals.length].focus();
  }
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

modalBody.addEventListener('click', async (e) => {
  if (e.target.closest('.fav-btn')) {
    toggleModalFavorite();
    return;
  }
  const tool = e.target.closest('[data-action]');
  if (!tool || !currentModalMeal) return;
  const action = tool.dataset.action;
  if (action === 'print') {
    window.print();
    return;
  }
  if (action === 'shopping') {
    const items = buildIngredients(currentModalMeal).map((i) => `${i.name}${i.measure ? ` - ${i.measure}` : ''}`);
    const text = `${currentModalMeal.strMeal}\n\n${items.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Shopping list copied');
    } catch {
      showToast('Could not copy shopping list');
    }
    return;
  }
  if (action === 'copy' || action === 'share') {
    const url = tool.dataset.url;
    if (action === 'share' && navigator.share) {
      try {
        await navigator.share({ title: currentModalMeal.strMeal, url });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      showToast('Could not copy link');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) {
    closeModal();
    return;
  }
  if (e.key === 'Tab' && !modal.hidden) {
    const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = [...focusables].filter((el) => !el.disabled && el.offsetParent !== null);
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

async function hydrateFromUrl() {
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const mealId = hash.get('meal');
  const q = params.get('q');
  const category = params.get('category');
  const area = params.get('area');
  const ingredient = params.get('ingredient');
  const favorites = params.get('favorites') === '1';

  if (q) {
    search.value = q;
    await searchMeals(q, { syncUrl: false });
  } else if (category) {
    await showCategory(category, { syncUrl: false });
  } else if (area) {
    await showArea(area, { syncUrl: false });
  } else if (ingredient) {
    await showIngredient(ingredient, { syncUrl: false });
  } else if (favorites) {
    showFavorites({ syncUrl: false });
  }

  if (mealId) {
    openMeal(mealId, { syncUrl: false });
  }
}

window.addEventListener('popstate', () => {
  closeModal({ syncUrl: false });
  hydrateFromUrl();
});

applyTheme(getTheme());
loadCategories();
loadFilters();
hydrateFromUrl();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
