const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();

export function clearCache() {
  cache.clear();
}

async function getJSON(endpoint) {
  const now = Date.now();
  const cached = cache.get(endpoint);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  if (inFlight.has(endpoint)) {
    return inFlight.get(endpoint);
  }

  const request = fetch(`${BASE_URL}/${endpoint}`)
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
    .finally(() => inFlight.delete(endpoint));

  inFlight.set(endpoint, request);
  return request;
}

export function fetchMeals(query) {
  return getJSON(`search.php?s=${encodeURIComponent(query)}`).then((data) => data.meals || []);
}

export function fetchMealById(id) {
  return getJSON(`lookup.php?i=${id}`).then((data) => data.meals[0]);
}

export function fetchRandomMeal() {
  return getJSON('random.php').then((data) => data.meals[0]);
}

export function fetchCategories() {
  return getJSON('list.php?c=list').then((data) => data.meals || []);
}

export function fetchMealsByCategory(category) {
  return getJSON(`filter.php?c=${encodeURIComponent(category)}`).then((data) => data.meals || []);
}
