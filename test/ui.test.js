import { describe, it, expect } from 'vitest';
import { escapeHtml, mealCard, mealCardGrid, renderModalBody, paginate } from '../src/ui.js';

describe('ui', () => {
  it('escapes HTML in user and API data', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('Pizza & "Soda"')).toBe('Pizza &amp; &quot;Soda&quot;');
  });

  it('renders a meal card with escaped fields', () => {
    const html = mealCard({ idMeal: '1', strMeal: '<b>Pizza</b>', strMealThumb: 'pic.jpg' });
    expect(html).toContain('data-mealid="1"');
    expect(html).toContain('&lt;b&gt;Pizza&lt;/b&gt;');
    expect(html).toContain('pic.jpg');
    expect(html).toContain('tabindex="0"');
  });

  it('marks favorite cards with the active heart', () => {
    const html = mealCard({ idMeal: '1', strMeal: 'Pizza', strMealThumb: 'pic.jpg' }, true);
    expect(html).toContain('fav-chip--active');
    expect(html).toContain('fas fa-heart');
  });

  it('builds a grid, highlighting saved favorites by id', () => {
    const meals = [
      { idMeal: '1', strMeal: 'Pizza', strMealThumb: 'a.jpg' },
      { idMeal: '2', strMeal: 'Burger', strMealThumb: 'b.jpg' },
    ];
    const html = mealCardGrid(meals, ['1']);
    expect(html.match(/class="meal"/g)).toHaveLength(2);
    expect(html.match(/fav-chip--active/g)).toHaveLength(1);
    expect(html.match(/class="fav-chip"/g)).toHaveLength(1);
  });

  it('collects up to 20 ingredients into the modal body', () => {
    const meal = {
      idMeal: '1',
      strMeal: 'Test Meal',
      strCategory: 'Beef',
      strArea: 'USA',
      strMealThumb: 'pic.jpg',
      strInstructions: 'Step one.\nStep two.',
      strIngredient1: 'Flour',
      strMeasure1: '2 cups',
      strIngredient2: '',
    };
    const html = renderModalBody(meal, true);
    expect(html).toContain('Test Meal');
    expect(html).toContain('Flour - 2 cups');
    expect(html).toContain('Step one.\nStep two.');
    expect(html).toContain('Remove from favorites');
  });

  it('renders tags, source, and video links from the meal data', () => {
    const meal = {
      idMeal: '1',
      strMeal: 'Test Meal',
      strMealThumb: 'pic.jpg',
      strInstructions: 'Cook.',
      strTags: 'Spicy, Dinner ,',
      strSource: 'https://example.com/recipe?x=1&y=2',
      strYoutube: 'https://www.youtube.com/watch?v=abc123',
    };
    const html = renderModalBody(meal);
    expect(html).toContain('Spicy');
    expect(html).toContain('Dinner');
    expect(html).toContain('https://example.com/recipe?x=1&amp;y=2');
    expect(html).toContain('https://www.youtube.com/watch?v=abc123');
    expect(html).toContain('Watch video');
    expect(html).toContain('Original recipe');
  });

  it('drops unsafe source and video urls', () => {
    const html = renderModalBody({
      idMeal: '1',
      strMeal: 'Test Meal',
      strMealThumb: 'pic.jpg',
      strInstructions: 'Cook.',
      strSource: 'javascript:alert(1)',
      strYoutube: 'not a valid url',
    });
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('Watch video');
    expect(html).not.toContain('Original recipe');
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => `meal${i + 1}`);

  it('returns the first page slice by default', () => {
    const result = paginate(items, 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toBe('meal1');
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(true);
  });

  it('returns the slice for the requested page', () => {
    const result = paginate(items, 2, 10);
    expect(result.items[0]).toBe('meal11');
    expect(result.start).toBe(10);
    expect(result.end).toBe(20);
  });

  it('reports hasNext on intermediate and hasNext=false on the last page', () => {
    expect(paginate(items, 2, 10).hasNext).toBe(true);
    expect(paginate(items, 3, 10).hasNext).toBe(false);
  });

  it('clamps an out-of-range page to the last page', () => {
    const result = paginate(items, 99, 10);
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(5);
    expect(result.hasNext).toBe(false);
  });

  it('handles empty and single-page lists', () => {
    expect(paginate([], 1, 10).totalPages).toBe(1);
    expect(paginate(['only'], 1, 10).items[0]).toBe('only');
    expect(paginate(['only'], 1, 10).hasNext).toBe(false);
  });
});
