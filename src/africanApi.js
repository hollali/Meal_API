import { africanMeals } from './data/africanMeals.js';

const normalize = (value) => String(value || '').trim().toLowerCase();

function matchesArea(meal, area) {
  const value = normalize(area);
  return [meal.strArea, meal.strCountry, meal.strRegion].some((field) => normalize(field) === value);
}

export function searchAfricanMeals(query) {
  const value = normalize(query);
  if (!value) return [];
  return africanMeals.filter((meal) => {
    const haystack = [meal.strMeal, meal.strArea, meal.strRegion, meal.strCategory, meal.strTags, meal.strInstructions];
    return haystack.some((field) => normalize(field).includes(value));
  });
}

export function getAfricanMealById(id) {
  return africanMeals.find((meal) => meal.idMeal === String(id)) || null;
}

export function getAfricanMealsByArea(area) {
  return africanMeals.filter((meal) => matchesArea(meal, area));
}

export function getAfricanMealsByCategory(category) {
  const value = normalize(category);
  return africanMeals.filter((meal) => normalize(meal.strCategory) === value);
}

export function getAfricanAreas() {
  const seen = new Set();
  const areas = [];
  for (const meal of africanMeals) {
    const country = meal.strCountry;
    if (seen.has(country)) continue;
    seen.add(country);
    areas.push({ strArea: country, strCountry: country, strRegion: meal.strRegion });
  }
  return areas;
}

export function getRandomAfricanMeal() {
  return africanMeals[Math.floor(Math.random() * africanMeals.length)];
}
