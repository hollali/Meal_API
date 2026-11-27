import './styles/index.css';
import {
  fetchMealsAll as fetchMeals,
  fetchMealByIdAll as fetchMealById,
  fetchRandomMealAll as fetchRandomMeal,
  fetchCategories,
  fetchMealsByCategoryAll as fetchMealsByCategory,
  isAbortError,
} from './api.js';
import {
  getFavoriteIds,
  isFavorite,
  toggleFavorite,
  getFavorites,
  getTheme,
  setTheme,
} from './storage.js';
import { mealCardGrid, renderModalBody, escapeHtml, paginate } from './ui.js';

const search = document.getElementById('search');
const submit = document.getElementById('submit');
const random = document.getElementById('random');
const favoritesBtn = document.getElementById('favorites');
const themeToggle = document.getElementById('theme-toggle');
const categoriesEl = document.getElementById('categories');
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
  viewingFavorites: false,
  page: 1,
};

let mealsById = new Map();
let currentModalMeal = null;
let currentResults = [];
let listController = null;

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
  mealsEl.innerHTML = '';
  pagination.hidden = true;
}

async function searchMeals(query) {
  const item = query.trim();
  if (!item) {
    return;
  }
  const signal = beginListRequest();
  state.lastSearch = item;
  state.currentCategory = null;
  state.viewingFavorites = false;
  state.page = 1;
  setCategoryActive(null);
  clearResults();
  setHeading('');
  setLoading(true);
  try {
    const meals = await fetchMeals(item, { signal });
    if (signal.aborted) {
      return;
    }
    setLoading(false);
    if (meals.length === 0) {
      setHeading(`Oops !! No result for "${item}"`);
      return;
    }
    renderMeals(meals, `Search result for "${item}" (${meals.length})`);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) {
      return;
    }
    setLoading(false);
    handleError(error, () => searchMeals(item));
  }
}

async function showCategory(category) {
  const signal = beginListRequest();
  state.currentCategory = category;
  state.lastSearch = null;
  state.viewingFavorites = false;
  state.page = 1;
  setCategoryActive(category);
  clearResults();
  setHeading('');
  setLoading(true);
  try {
    const meals = await fetchMealsByCategory(category, { signal });
    if (signal.aborted) {
      return;
    }
    setLoading(false);
    if (meals.length === 0) {
      setHeading(`No meals found in "${category}"`);
      return;
    }
    renderMeals(meals, `${category} (${meals.length} meals)`);
  } catch (error) {
    if (isAbortError(error) || signal.aborted) {
      return;
    }
    setLoading(false);
    handleError(error, () => showCategory(category));
  }
}

function showFavorites() {
  abortListRequest();
  state.viewingFavorites = true;
  state.lastSearch = null;
  state.currentCategory = null;
  state.page = 1;
  setCategoryActive(null);
  setLoading(false);
  const meals = Object.values(getFavorites());
  if (meals.length === 0) {
    clearResults();
    setHeading('No favorites yet. Click the heart on any meal to save it.');
    return;
  }
  renderMeals(meals, `Your favorites (${meals.length})`);
}

async function openMeal(mealId) {
  setLoading(true);
  try {
    const meal = await fetchMealById(mealId);
    setLoading(false);
    openModal(meal);
  } catch (error) {
    setLoading(false);
    handleError(error);
  }
}

async function getRandomMeal() {
  abortListRequest();
  state.lastSearch = null;
  state.currentCategory = null;
  state.viewingFavorites = false;
  state.page = 1;
  setCategoryActive(null);
  clearResults();
  setHeading('');
  setLoading(true);
  try {
    const meal = await fetchRandomMeal();
    setLoading(false);
    openModal(meal);
  } catch (error) {
    setLoading(false);
    handleError(error);
  }
}

function setCategoryActive(category) {
  categoriesEl.querySelectorAll('.category-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });
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

function openModal(meal) {
  currentModalMeal = meal;
  modalBody.innerHTML = renderModalBody(meal, isFavorite(meal.idMeal));
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  currentModalMeal = null;
}

function toggleModalFavorite() {
  if (!currentModalMeal) {
    return;
  }
  const isNowFav = toggleFavorite(currentModalMeal);
  const button = modalBody.querySelector('.fav-btn');
  button.classList.toggle('fav-btn--active', isNowFav);
  button.innerHTML = isNowFav
    ? '<i class="fas fa-heart"></i> Remove from favorites'
    : '<i class="far fa-heart"></i> Save to favorites';
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

favoritesBtn.addEventListener('click', showFavorites);

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

modalBody.addEventListener('click', (e) => {
  if (e.target.closest('.fav-btn')) {
    toggleModalFavorite();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) {
    closeModal();
  }
});

applyTheme(getTheme());
loadCategories();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
