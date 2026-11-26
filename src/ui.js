export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function mealCard(meal, isFav = false) {
  const heart = isFav ? 'fas' : 'far';
  return `
    <div class="meal" data-mealid="${escapeHtml(meal.idMeal)}" tabindex="0" role="button"
         aria-label="View ${escapeHtml(meal.strMeal)}">
      <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy" decoding="async">
      <div class="meal-info">
        <h3>${escapeHtml(meal.strMeal)}</h3>
      </div>
      <button type="button" class="fav-chip${isFav ? ' fav-chip--active' : ''}" data-id="${escapeHtml(meal.idMeal)}"
              aria-label="${isFav ? 'Remove from' : 'Save to'} favorites">
        <i class="${heart} fa-heart"></i>
      </button>
    </div>`;
}

export function paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    page: safePage,
    totalPages,
    start,
    end: start + pageItems.length,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function mealCardGrid(meals, favoriteIds = []) {
  const favorites = new Set(favoriteIds.map(String));
  return meals.map((meal) => mealCard(meal, favorites.has(String(meal.idMeal)))).join('');
}

function buildIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    if (!ingredient || !String(ingredient).trim()) {
      break;
    }
    const measure = meal[`strMeasure${i}`];
    ingredients.push({
      name: String(ingredient).trim(),
      measure: measure ? String(measure).trim() : '',
    });
  }
  return ingredients;
}

function ingredientImageUrl(name) {
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(name)}.png`;
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function renderModalBody(meal, isFav = false) {
  const ingredients = buildIngredients(meal);
  const tags = parseTags(meal.strTags);
  const source = safeHttpUrl(meal.strSource);
  const video = safeHttpUrl(meal.strYoutube);
  const extraImage = safeHttpUrl(meal.strImageSource);
  const gallery =
    extraImage && extraImage !== meal.strMealThumb ? [meal.strMealThumb, extraImage] : [meal.strMealThumb];
  const links = [
    source
      ? `<a class="action-link" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Original recipe
        </a>`
      : '',
    video
      ? `<a class="action-link action-link--video" href="${escapeHtml(video)}" target="_blank" rel="noopener noreferrer">
          <i class="fab fa-youtube" aria-hidden="true"></i> Watch video
        </a>`
      : '',
  ]
    .filter(Boolean)
    .join('');
  return `
    <div class="single-meal">
      <div class="single-meal-media">
        ${gallery
          .map(
            (src, index) =>
              `<img src="${escapeHtml(src)}" alt="${escapeHtml(meal.strMeal)}${gallery.length > 1 ? ` (image ${index + 1})` : ''}" loading="lazy">`
          )
          .join('')}
      </div>
      <div class="single-meal-content">
        <div class="single-meal-info">
          ${meal.strCategory ? `<span class="tag">${escapeHtml(meal.strCategory)}</span>` : ''}
          ${meal.strArea ? `<span class="tag">${escapeHtml(meal.strArea)}</span>` : ''}
        </div>
        <h1 id="modal-title">${escapeHtml(meal.strMeal)}</h1>
        ${
          tags.length
            ? `<div class="single-meal-tags">${tags
                .map((tag) => `<span class="tag tag--soft">${escapeHtml(tag)}</span>`)
                .join('')}</div>`
            : ''
        }
        ${links ? `<div class="single-meal-actions">${links}</div>` : ''}
        <div class="main">
          <h2>Ingredients</h2>
          <ul class="ingredients">
            ${ingredients
              .map(
                (ing) => `<li class="ingredient">
              <img class="ingredient-img" src="${escapeHtml(ingredientImageUrl(ing.name))}" alt="${escapeHtml(ing.name)}" loading="lazy" onerror="this.remove()">
              <span class="ingredient-text">${escapeHtml(ing.name)}${ing.measure ? ` - ${escapeHtml(ing.measure)}` : ''}</span>
            </li>`
              )
              .join('')}
          </ul>
          <h2>Instructions</h2>
          <p class="instructions">${escapeHtml(meal.strInstructions)}</p>
        </div>
        <button type="button" class="fav-btn${isFav ? ' fav-btn--active' : ''}">
          <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
          ${isFav ? 'Remove from favorites' : 'Save to favorites'}
        </button>
      </div>
    </div>`;
}
