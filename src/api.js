const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();
const DUMMYJSON_BASE = 'https://dummyjson.com';
const dummyCache = new Map();
const dummyInFlight = new Map();

export function clearCache() {
  cache.clear();
  dummyCache.clear();
}

export function isAbortError(error) {
  return Boolean(error) && error.name === 'AbortError';
}

async function getJSON(endpoint, { signal } = {}) {
  const now = Date.now();
  const cached = cache.get(endpoint);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  if (signal?.aborted) {
    throw new DOMException('Request aborted', 'AbortError');
  }

  if (inFlight.has(endpoint)) {
    return inFlight.get(endpoint);
  }

  const request = fetch(`${BASE_URL}/${endpoint}`, signal ? { signal } : undefined)
    .then(async (res) => {
      if (res.status === 429) {
        throw new Error('Rate limit reached. Please wait a moment before searching again.');
      }
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      cache.set(endpoint, { data, time: Date.now() });
      return data;
    })
    .finally(() => {
      if (inFlight.get(endpoint) === request) {
        inFlight.delete(endpoint);
      }
    });

  inFlight.set(endpoint, request);
  return request;
}

export function fetchMeals(query, options) {
  return getJSON(`search.php?s=${encodeURIComponent(query)}`, options).then(
    (data) => data.meals || []
  );
}

export function fetchMealById(id, options) {
  return getJSON(`lookup.php?i=${id}`, options).then((data) => {
    const meal = data.meals?.[0];
    if (!meal) {
      throw new Error('Meal not found.');
    }
    return meal;
  });
}

export function fetchRandomMeal(options) {
  return getJSON('random.php', options).then((data) => {
    const meal = data.meals?.[0];
    if (!meal) {
      throw new Error('Meal not found.');
    }
    return meal;
  });
}

export function fetchCategories(options) {
  return getJSON('list.php?c=list', options).then((data) => data.meals || []);
}

export function fetchAreas(options) {
  return getJSON('list.php?a=list', options).then((data) => data.meals || []);
}

export function fetchIngredients(options) {
  return getJSON('list.php?i=list', options).then((data) => data.meals || []);
}

export function fetchMealsByCategory(category, options) {
  return getJSON(`filter.php?c=${encodeURIComponent(category)}`, options).then(
    (data) => data.meals || []
  );
}

export function fetchMealsByArea(area, options) {
  return getJSON(`filter.php?a=${encodeURIComponent(area)}`, options).then(
    (data) => data.meals || []
  );
}

export function fetchMealsByIngredient(ingredient, options) {
  return getJSON(`filter.php?i=${encodeURIComponent(ingredient)}`, options).then(
    (data) => data.meals || []
  );
}

async function getDummyJSON(endpoint, { signal } = {}) {
  const cacheKey = `dj:${endpoint}`;
  const now = Date.now();
  const cached = dummyCache.get(cacheKey);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  if (signal?.aborted) {
    throw new DOMException('Request aborted', 'AbortError');
  }

  if (dummyInFlight.has(cacheKey)) {
    return dummyInFlight.get(cacheKey);
  }

  const request = fetch(`${DUMMYJSON_BASE}${endpoint}`, signal ? { signal } : undefined)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      dummyCache.set(cacheKey, { data, time: Date.now() });
      return data;
    })
    .finally(() => {
      if (dummyInFlight.get(cacheKey) === request) {
        dummyInFlight.delete(cacheKey);
      }
    });

  dummyInFlight.set(cacheKey, request);
  return request;
}



function toDummyMeal(recipe) {
  const meal = {
    idMeal: `dj-${recipe.id}`,
    strMeal: recipe.name,
    strMealThumb: recipe.image,
    strCategory: (Array.isArray(recipe.mealType) && recipe.mealType[0]) || (Array.isArray(recipe.tags) && recipe.tags[0]) || '',
    strArea: recipe.cuisine || '',
    strInstructions: Array.isArray(recipe.instructions) ? recipe.instructions.join('\n') : String(recipe.instructions || ''),
    strTags: Array.isArray(recipe.tags) ? recipe.tags.join(',') : '',
    strSource: '',
    strYoutube: '',
    strImageSource: '',
  };

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredients.forEach((ingredient, index) => {
    meal[`strIngredient${index + 1}`] = ingredient;
    meal[`strMeasure${index + 1}`] = '';
  });

  return meal;
}

function dedupeMeals(meals) {
  const seen = new Set();
  return meals.filter((meal) => {
    const key = String(meal.strMeal || '').trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function fetchMealsAll(query, options = {}) {
  const results = await Promise.allSettled([
    fetchMeals(query, options),
    getDummyJSON(`/recipes/search?q=${encodeURIComponent(query)}&limit=30`, options).then(
      (data) => (data.recipes || []).map(toDummyMeal)
    ),
  ]);

  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  if (fulfilled.length === 0) {
    throw results[0].reason;
  }

  return dedupeMeals(fulfilled.flatMap((result) => result.value));
}

export async function fetchMealByIdAll(id, options = {}) {
  if (String(id).startsWith('dj-')) {
    const recipe = await getDummyJSON(`/recipes/${encodeURIComponent(String(id).slice(3))}`, options);
    return toDummyMeal(recipe);
  }
  return fetchMealById(id, options);
}

export async function fetchMealsByCategoryAll(category, options = {}) {
  const results = await Promise.allSettled([
    fetchMealsByCategory(category, options),
    getDummyJSON(`/recipes/tag/${encodeURIComponent(category)}`, options).then((data) =>
      (data.recipes || []).map(toDummyMeal)
    ),
  ]);

  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  if (fulfilled.length === 0) {
    throw results[0].reason;
  }

  return dedupeMeals(fulfilled.flatMap((result) => result.value));
}

export async function fetchRandomMealAll(options = {}) {
  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 50);
    try {
      return await fetchMealByIdAll(`dj-${id}`, options);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      // Fall back to the primary source when the secondary source is unavailable.
    }
  }
  return fetchRandomMeal(options);
}
