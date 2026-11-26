const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();

export function clearCache() {
  cache.clear();
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
  return getJSON(`lookup.php?i=${id}`, options).then((data) => data.meals[0]);
}

export function fetchRandomMeal(options) {
  return getJSON('random.php', options).then((data) => data.meals[0]);
}

export function fetchCategories(options) {
  return getJSON('list.php?c=list', options).then((data) => data.meals || []);
}

export function fetchMealsByCategory(category, options) {
  return getJSON(`filter.php?c=${encodeURIComponent(category)}`, options).then(
    (data) => data.meals || []
  );
}
