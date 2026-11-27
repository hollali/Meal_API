import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchMeals,
  fetchMealById,
  fetchRandomMeal,
  fetchCategories,
  fetchAreas,
  fetchIngredients,
  fetchMealsByCategory,
  fetchMealsByArea,
  fetchMealsByIngredient,
  fetchMealsAll,
  fetchMealsByAreaAll,
  fetchAreasAll,
  fetchMealByIdAll,
  clearCache,
  isAbortError,
} from '../src/api.js';

function mockFetch(json, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
    })
  );
}

describe('api', () => {
  beforeEach(() => {
    clearCache();
    vi.unstubAllGlobals();
  });

  it('returns meals for a search query', async () => {
    mockFetch({ meals: [{ idMeal: '1', strMeal: 'Pizza' }] });
    const meals = await fetchMeals('pizza');
    expect(meals).toHaveLength(1);
    expect(meals[0].strMeal).toBe('Pizza');
  });

  it('returns an empty array when the search has no results', async () => {
    mockFetch({ meals: null });
    const meals = await fetchMeals('not-a-real-dish-xyz');
    expect(meals).toEqual([]);
  });

  it('returns a single meal for an id lookup', async () => {
    mockFetch({ meals: [{ idMeal: '52795', strMeal: 'Chicken Handi' }] });
    const meal = await fetchMealById('52795');
    expect(meal.idMeal).toBe('52795');
  });

  it('returns the first meal from the random endpoint', async () => {
    mockFetch({ meals: [{ idMeal: '99', strMeal: 'Anything' }] });
    const meal = await fetchRandomMeal();
    expect(meal.strMeal).toBe('Anything');
  });

  it('lists categories, areas, and ingredients', async () => {
    mockFetch({ meals: [{ strCategory: 'Beef' }] });
    expect((await fetchCategories())[0].strCategory).toBe('Beef');
    mockFetch({ meals: [{ strArea: 'Italian' }] });
    expect((await fetchAreas())[0].strArea).toBe('Italian');
    mockFetch({ meals: [{ strIngredient: 'Chicken' }] });
    expect((await fetchIngredients())[0].strIngredient).toBe('Chicken');
  });

  it('filters meals by category, area, and ingredient', async () => {
    mockFetch({ meals: [{ idMeal: '2', strMeal: 'Burger' }] });
    expect((await fetchMealsByCategory('Beef'))).toHaveLength(1);
    mockFetch({ meals: [{ idMeal: '3', strMeal: 'Pasta' }] });
    expect((await fetchMealsByArea('Italian'))).toHaveLength(1);
    mockFetch({ meals: [{ idMeal: '4', strMeal: 'Soup' }] });
    expect((await fetchMealsByIngredient('Chicken'))).toHaveLength(1);
  });

  it('merges multi-source search and dedupes by name', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('themealdb.com')) {
        return { ok: true, status: 200, json: async () => ({ meals: [{ idMeal: '1', strMeal: 'Pizza' }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ recipes: [{ id: 2, name: 'Pizza' }, { id: 3, name: 'Pie' }] }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const meals = await fetchMealsAll('pilau');
    expect(meals.map((m) => m.strMeal)).toContain('Pizza');
    expect(meals.map((m) => m.strMeal)).toContain('Pilau');
  });

  it('merges African dishes when filtering by area', async () => {
    mockFetch({ meals: null });
    const meals = await fetchMealsByAreaAll('Nigeria');
    expect(meals.length).toBeGreaterThan(5);
    expect(meals.every((m) => m.strArea === 'Nigeria')).toBe(true);
  });

  it('merges African countries into the area list', async () => {
    mockFetch({ meals: [{ strArea: 'Italian', strCountry: 'Italy' }] });
    const areas = await fetchAreasAll();
    expect(areas.map((a) => a.strArea)).toContain('Italy');
    expect(areas.map((a) => a.strArea)).toContain('Nigeria');
  });

  it('looks up an African meal by its prefixed id', async () => {
    const meal = await fetchMealByIdAll('af-1');
    expect(meal.strMeal).toBe('Jollof Rice');
  });

  it('caches identical requests and only fetches once', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meals: [{ idMeal: '1', strMeal: 'Pizza' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await fetchMeals('pizza');
    await fetchMeals('pizza');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws a friendly message on rate limiting', async () => {
    mockFetch({}, 429);
    await expect(fetchMeals('pizza')).rejects.toThrow(/rate limit/i);
  });

  it('aborts an in-flight request when the signal is aborted', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchMeals('pizza', { signal: controller.signal });
    controller.abort();

    const error = await promise.catch((reason) => reason);
    expect(isAbortError(error)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('search.php'), {
      signal: controller.signal,
    });
  });

  it('throws when the response is not ok', async () => {
    mockFetch({}, 500);
    await expect(fetchMeals('pizza')).rejects.toThrow(/status 500/);
  });
});
