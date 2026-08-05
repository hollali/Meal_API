import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavorites,
  getFavoriteIds,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getTheme,
  setTheme,
} from '../src/storage.js';

const meal = { idMeal: '52795', strMeal: 'Chicken Handi' };

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no favorites', () => {
    expect(getFavorites()).toEqual({});
    expect(getFavoriteIds()).toEqual([]);
  });

  it('adds and retrieves a favorite', () => {
    addFavorite(meal);
    expect(isFavorite('52795')).toBe(true);
    expect(getFavoriteIds()).toEqual(['52795']);
    expect(getFavorites()['52795'].strMeal).toBe('Chicken Handi');
  });

  it('removes a favorite', () => {
    addFavorite(meal);
    removeFavorite('52795');
    expect(isFavorite('52795')).toBe(false);
  });

  it('toggles a favorite on and off', () => {
    expect(toggleFavorite(meal)).toBe(true);
    expect(isFavorite('52795')).toBe(true);
    expect(toggleFavorite(meal)).toBe(false);
    expect(isFavorite('52795')).toBe(false);
  });

  it('persists across reads (localStorage round-trip)', () => {
    addFavorite(meal);
    expect(JSON.parse(localStorage.getItem('meal-app-favorites'))['52795'].idMeal).toBe('52795');
  });

  it('defaults the theme to light', () => {
    expect(getTheme()).toBe('light');
  });

  it('stores the chosen theme', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
  });
});
