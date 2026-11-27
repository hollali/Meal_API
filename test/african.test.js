import { describe, it, expect } from 'vitest';
import { africanMeals } from '../src/data/africanMeals.js';
import {
  searchAfricanMeals,
  getAfricanMealById,
  getAfricanMealsByArea,
  getAfricanMealsByCategory,
  getAfricanAreas,
  getRandomAfricanMeal,
} from '../src/africanApi.js';

describe('african meals source', () => {
  it('contains dishes from many African countries', () => {
    expect(africanMeals.length).toBeGreaterThan(40);
    expect(getAfricanAreas().length).toBeGreaterThan(15);
    expect(africanMeals.every((meal) => meal.idMeal.startsWith('af-'))).toBe(true);
  });

  it('searches by name, country and tag', () => {
    expect(searchAfricanMeals('jollof').map((m) => m.strMeal)).toContain('Jollof Rice');
    expect(searchAfricanMeals('morocco').length).toBeGreaterThan(0);
    expect(searchAfricanMeals('')).toEqual([]);
  });

  it('looks up by id and filters by area and category', () => {
    expect(getAfricanMealById('af-1').strMeal).toBe('Jollof Rice');
    expect(getAfricanMealById('af-999')).toBeNull();
    expect(getAfricanMealsByArea('Nigeria').length).toBeGreaterThan(5);
    expect(getAfricanMealsByArea('West Africa').length).toBeGreaterThan(10);
    expect(getAfricanMealsByCategory('Chicken').length).toBeGreaterThan(3);
  });

  it('returns a random meal from the dataset', () => {
    expect(africanMeals).toContain(getRandomAfricanMeal());
  });
});
