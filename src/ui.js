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
  const thumb = safeHttpUrl(meal.strMealThumb);
  return `
    <div class="meal" data-mealid="${escapeHtml(meal.idMeal)}" tabindex="0" role="button"
         aria-label="View ${escapeHtml(meal.strMeal)}">
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(meal.strMeal)}" loading="lazy" decoding="async" onerror="this.style.display='none'">
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

export function mealSkeletonGrid(count = 8) {
  return Array.from({ length: count })
    .map(() => '<div class="meal meal--skeleton" aria-hidden="true"><div class="meal-skeleton-shimmer"></div></div>')
    .join('');
}

export function buildIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    if (!ingredient || !String(ingredient).trim()) {
      continue;
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
  if (!value) return '';
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
  const thumb = safeHttpUrl(meal.strMealThumb);
  const extraImage = safeHttpUrl(meal.strImageSource);
  const gallery = [thumb, extraImage].filter((src, index, arr) => src && arr.indexOf(src) === index);
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
  const shareUrl = `${location.origin}${location.pathname}#meal=${encodeURIComponent(String(meal.idMeal))}`;
  const shareText = encodeURIComponent(`Check out ${meal.strMeal}`);
  const shareFull = encodeURIComponent(`Check out ${meal.strMeal}: ${shareUrl}`);
  const encodedUrl = encodeURIComponent(shareUrl);
  return `
    <div class="single-meal">
      <div class="single-meal-media">
        ${gallery
          .map(
            (src, index) =>
              `<img src="${escapeHtml(src)}" alt="${escapeHtml(meal.strMeal)}${gallery.length > 1 ? ` (image ${index + 1})` : ''}" loading="lazy" onerror="this.remove()">`
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
        <div class="single-meal-tools">
          <button type="button" class="tool-btn" data-action="share-menu" aria-expanded="false" aria-controls="share-menu"><i class="fas fa-share-nodes"></i> Share</button>
          <button type="button" class="tool-btn" data-action="copy" data-url="${escapeHtml(shareUrl)}"><i class="fas fa-link"></i> Copy link</button>
          <button type="button" class="tool-btn" data-action="print"><i class="fas fa-print"></i> Print</button>
          <button type="button" class="tool-btn" data-action="shopping-menu" aria-expanded="false" aria-controls="shopping-menu"><i class="fas fa-list-check"></i> Shopping list</button>
        </div>
        <div id="share-menu" class="share-menu" hidden>
          <button type="button" class="share-option" data-action="native-share" data-url="${escapeHtml(shareUrl)}"><i class="fas fa-share-from-square"></i> Device share</button>
          <a class="share-option" href="https://wa.me/?text=${shareFull}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i> WhatsApp</a>
          <a class="share-option" href="https://t.me/share/url?url=${encodedUrl}&text=${shareText}" target="_blank" rel="noopener noreferrer"><i class="fab fa-telegram"></i> Telegram</a>
          <a class="share-option" href="https://x.com/intent/tweet?text=${shareFull}" target="_blank" rel="noopener noreferrer"><i class="fab fa-x-twitter"></i> X</a>
          <a class="share-option" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer"><i class="fab fa-facebook-f"></i> Facebook</a>
          <a class="share-option" href="mailto:?subject=${encodeURIComponent(meal.strMeal)}&body=${shareFull}"><i class="fas fa-envelope"></i> Email</a>
        </div>
        <div id="shopping-menu" class="share-menu" hidden>
          <button type="button" class="share-option" data-action="shopping-copy"><i class="fas fa-copy"></i> Copy list</button>
          <button type="button" class="share-option" data-action="shopping-share"><i class="fas fa-share-from-square"></i> Share list</button>
          <button type="button" class="share-option" data-action="shopping-download"><i class="fas fa-download"></i> Download .txt</button>
        </div>
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
          <p class="instructions">${escapeHtml(meal.strInstructions || '')}</p>
        </div>
        <button type="button" class="fav-btn${isFav ? ' fav-btn--active' : ''}">
          <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
          ${isFav ? 'Remove from favorites' : 'Save to favorites'}
        </button>
      </div>
    </div>`;
}
