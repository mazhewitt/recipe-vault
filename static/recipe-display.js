/**
 * Recipe Display Module
 * Handles recipe rendering, navigation, and index views
 */

import { escapeHtml } from './utils.js';
import { getCachedRecipe, prefetchAdjacent, animatePageTurn } from './page-transitions.js';
import { applyStepHighlight } from './timer.js';
import { setActiveTab } from './page-tabs.js';
import { getSpreadMode, setSpreadMode } from './spread-modes.js';

// Import global state accessors (these will be set by app.js)
export let state = null;

export function initializeState(appState) {
    state = appState;
}

export function isMobile() {
    return window.matchMedia('(max-width: 600px)').matches;
}

// The recipe lives on the right page; the left page holds the contents and is
// never cleared by the loading or error states.
export function showRecipeLoading() {
    const rightContent = document.getElementById('page-right-content');

    // SAFE: Static HTML, no user data
    rightContent.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
    `;
}

export function showRecipeError(message) {
    const rightContent = document.getElementById('page-right-content');
    // There is no recipe on the page to split across the spread, so cook mode
    // would leave the previous recipe's ingredients beside the error. Back to
    // the contents, which is also the way out of here.
    if (getSpreadMode() === 'cook') setSpreadMode('contents', { force: true });
    // SANITIZED: Error message could contain user input
    rightContent.innerHTML = `
        <div class="recipe-placeholder">
            <div class="recipe-placeholder-text" style="color: var(--color-leather);">
                ${escapeHtml(message)}
            </div>
        </div>
    `;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRecipeFromApi(recipeId) {
    const response = await fetch(`/api/recipes/${recipeId}`, {
        credentials: 'same-origin'
    });

    if (!response.ok) {
        const error = new Error(`Failed to load recipe: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

async function refreshDifficultyIfPending(recipe, pageNumber) {
    if (!recipe || recipe.difficulty != null || !recipe.id) return;

    for (const waitMs of [3000, 7000, 12000]) {
        await delay(waitMs);

        if (state.currentRecipeId !== recipe.id || state.viewMode !== 'recipe') {
            return;
        }

        try {
            const refreshed = await fetchRecipeFromApi(recipe.id);
            if (refreshed.difficulty != null) {
                renderRecipe(refreshed, { pageNumber });
                await state.fetchRecipeList(true);
                state.updateNavigationState();
                prefetchAdjacent(refreshed.id);
                return;
            }
        } catch (error) {
            console.warn('Unable to refresh pending recipe difficulty:', error);
            return;
        }
    }
}

/**
 * Read a positive-minute field, accepting both the API spelling
 * (`prep_time_minutes`) and the legacy short spelling (`prep_time`).
 */
export function getMinutesField(recipe, name) {
    const raw = recipe[`${name}_minutes`] ?? recipe[name];
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
}

/** Format minutes as "45 min" or "1h 15" for the meta line. */
export function formatDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return '';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${String(rest).padStart(2, '0')}` : `${hours}h`;
}

/**
 * Cosmetic page number for the recipe at position `index` in the full
 * alphabetical list. The contents page occupies p.1-2 and each recipe is
 * a notional two-page spread.
 */
export function pageNumberFor(index) {
    return 2 * index + 3;
}

/**
 * Writes the cosmetic page number into the note input. Sole writer of
 * #note-page-number.
 *
 * @param {number|null} pageNumber - pageNumberFor(index), or null for the contents page
 */
export function setNotePageNumber(pageNumber) {
    const text = pageNumber == null ? 'p. 1' : `p. ${pageNumber}`;
    const el = document.getElementById('note-page-number');
    if (el) el.textContent = text;
}

export function getTotalTimeMinutes(recipe) {
    const prepTime = getMinutesField(recipe, 'prep_time') ?? NaN;
    const cookTime = getMinutesField(recipe, 'cook_time') ?? NaN;
    const hasPrep = Number.isFinite(prepTime) && prepTime > 0;
    const hasCook = Number.isFinite(cookTime) && cookTime > 0;

    if (hasPrep || hasCook) {
        return (hasPrep ? prepTime : 0) + (hasCook ? cookTime : 0);
    }

    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    const stepTotal = steps.reduce((sum, step) => {
        const duration = Number(step.duration_minutes);
        if (!Number.isFinite(duration) || duration <= 0) {
            return sum;
        }
        return sum + duration;
    }, 0);

    return stepTotal > 0 ? stepTotal : null;
}

/**
 * The contents filters. 'main' and 'dessert' are the fixed tag names the Mains
 * and Sweets tabs stand for; 'meals' has no listing until meal plans persist.
 */
export const CONTENTS_FILTERS = ['all', 'main', 'dessert', 'meals'];

/** Footer noun and empty-filter message per filter. */
const FILTER_WORDING = {
    all: { one: 'recipe', many: 'recipes', empty: 'No recipes yet.' },
    main: { one: 'main', many: 'mains', empty: 'No mains yet. Ask me to tag a recipe as a main course.' },
    dessert: { one: 'sweet', many: 'sweets', empty: 'No sweets yet. Ask me to tag a recipe as a dessert.' },
    meals: { one: 'meal plan', many: 'meal plans', empty: 'No meal plans yet' },
};

/**
 * Renders the contents.
 *
 * @param {Array} recipes - the full alphabetical list, unfiltered
 * @param {{currentRecipeId?: string|null, singleColumn?: boolean, page?: 'left'|'right', filter?: string}} [options]
 *        singleColumn - render every letter group into one page and leave the
 *        other completely untouched (it holds the open recipe, or the notes
 *        thread). Without it the contents keep the two-page split on wide
 *        viewports.
 *        page - which page the single column goes on, 'left' (the default) or
 *        'right'. Only meaningful with singleColumn: notes mode gives the
 *        thread the left page, so the contents cross the spine rather than
 *        losing the half that carries the title and the A-Z strip.
 *        filter - one of CONTENTS_FILTERS; anything else is read as 'all'.
 *        The letter groups, the A-Z strip, the footer wording and the empty
 *        message all come from the filtered list, but page numbers keep coming
 *        from the position in the full list so a recipe reads the same on
 *        every tab.
 */
export function renderIndex(recipes, options = {}) {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');
    const alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const currentRecipeId = options.currentRecipeId != null ? String(options.currentRecipeId) : null;
    const singleColumn = options.singleColumn === true;
    // The single column's page, and the element it writes into. Without
    // singleColumn the contents own both pages and this is the left one.
    const columnPage = singleColumn && options.page === 'right' ? 'right' : 'left';
    const columnContent = columnPage === 'right' ? rightContent : leftContent;
    const filter = CONTENTS_FILTERS.includes(options.filter) ? options.filter : 'all';
    const wording = FILTER_WORDING[filter];
    const photoEpoch = state?.photoEpoch ?? 0;

    if (recipes.length === 0) {
        // SAFE: Static HTML, no user data
        columnContent.innerHTML = `
            <div class="recipe-placeholder">
                <div class="recipe-placeholder-text">
                    Your recipe book is empty. Ask me to create a recipe!
                </div>
            </div>
        `;
        if (!singleColumn) rightContent.innerHTML = '';
        return;
    }

    // Position in the full list first, so the page number survives the filter
    const entries = recipes.map((recipe, position) => ({ recipe, position }));
    const visible = filter === 'all'
        ? entries
        : filter === 'meals'
            // No meal-plan listing exists yet (RV-107), so Meals is always empty
            ? []
            : entries.filter(({ recipe }) => Array.isArray(recipe.tags) && recipe.tags.includes(filter));

    // Group by first letter
    const groups = {};
    visible.forEach(entry => {
        const letter = entry.recipe.title[0].toUpperCase();
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(entry);
    });

    const sortedLetters = Object.keys(groups).sort();
    const activeAlphabet = new Set(sortedLetters.filter(letter => /^[A-Z]$/.test(letter)));

    function sectionIdFor(letter, page) {
        return `index-section-${page}-${letter.toLowerCase()}`;
    }

    // The scrollable container is .page (parent of .page-content), so both are
    // reset — whichever page the contents have just been written to.
    function resetColumnScroll() {
        const container = document.getElementById(columnPage === 'right' ? 'page-right' : 'page-left');
        if (container) container.scrollTop = 0;
        columnContent.scrollTop = 0;
    }

    function renderAlphabet(lettersToPage) {
        const controls = alphabetLetters.map(letter => {
            const targetPage = lettersToPage[letter];
            const isActive = Boolean(targetPage);
            const targetId = isActive ? sectionIdFor(letter, targetPage) : '';

            return `
                <button
                    type="button"
                    class="index-alpha-letter${isActive ? ' active' : ' disabled'}"
                    data-letter="${letter}"
                    data-target-page="${targetPage || ''}"
                    data-target-id="${targetId}"
                    ${isActive ? '' : 'disabled'}
                    aria-label="Jump to ${letter}"
                    ${isActive ? '' : 'aria-disabled="true"'}
                >${letter}</button>
            `;
        }).join('');

        return `
            <div class="index-alphabet-nav" aria-label="Alphabet index navigation">
                ${controls}
            </div>
        `;
    }

    function renderEntry({ recipe, position }) {
        const pageNumber = pageNumberFor(position);
        const isCurrent = currentRecipeId !== null && String(recipe.id) === currentRecipeId;
        const hasPhoto = Boolean(recipe.photo_filename);
        // SAFE: recipe.id is a server-generated id; photoEpoch is a number
        const polaroid = hasPhoto
            ? `<span class="index-polaroid"><img src="/api/recipes/${recipe.id}/photo?e=${photoEpoch}" alt="" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('empty')"></span>`
            : `<span class="index-polaroid empty"></span>`;
        // SANITIZED: recipe.title is user input
        return `<div class="index-recipe-item${isCurrent ? ' current' : ''}" data-recipe-id="${recipe.id}" data-page="${pageNumber}"${isCurrent ? ' aria-current="page"' : ''}>${polaroid}<span class="index-recipe-name">${escapeHtml(recipe.title)}</span><span class="index-page-number">p. ${pageNumber}</span></div>`;
    }

    function renderFooter(count, continued) {
        const noun = count === 1 ? wording.one : wording.many;
        return `<div class="index-footer">${count} ${noun}${continued ? ' · continued overleaf' : ''}</div>`;
    }

    function renderGroup(letters, page) {
        return letters.map(letter => {
            const recipeItems = groups[letter].map(renderEntry).join('');
            const groupId = sectionIdFor(letter, page);
            return `
                <div class="index-letter-group" id="${groupId}">
                    <div class="index-letter-header">${letter}</div>
                    ${recipeItems}
                </div>
            `;
        }).join('');
    }

    // The book has recipes but none carry this tag: a message in place of the
    // letter groups, every letter in the strip disabled, a zero footer.
    if (visible.length === 0) {
        // SAFE: the wording table is static, renderAlphabet emits no user data
        columnContent.innerHTML = `
            <div class="index-title">~ Contents ~</div>
            ${renderAlphabet({})}
            <div class="index-empty">${wording.empty}</div>
            ${renderFooter(0, false)}
        `;
        if (!singleColumn) rightContent.innerHTML = '';
        resetColumnScroll();
        return;
    }

    if (isMobile() || singleColumn) {
        const lettersToPage = {};
        sortedLetters.forEach(letter => {
            if (activeAlphabet.has(letter)) lettersToPage[letter] = columnPage;
        });

        // SAFE: Contents title is static, renderGroup handles sanitization
        columnContent.innerHTML = `
            <div class="index-title">~ Contents ~</div>
            ${renderAlphabet(lettersToPage)}
            ${renderGroup(sortedLetters, columnPage)}
            ${renderFooter(visible.length, false)}
        `;
        if (!singleColumn) rightContent.innerHTML = '';
    } else {
        // Split groups across pages based on the visible recipe count
        const totalRecipes = visible.length;
        const targetPerSide = totalRecipes / 2;

        let currentCount = 0;
        let splitIndex = 0;

        // Find the letter index where we should split
        for (let i = 0; i < sortedLetters.length; i++) {
            const letter = sortedLetters[i];
            const countInGroup = groups[letter].length;

            // If adding this group keeps us under/near the target, include it in left page
            // Or if it's the first group and huge, we have to include it
            if (currentCount + countInGroup <= targetPerSide || i === 0) {
                currentCount += countInGroup;
                splitIndex = i + 1;
            } else {
                // If this group pushes us way over, stop here (it goes to right page)
                // Unless the left page is empty, then we must put at least one group there
                if (currentCount === 0) {
                    splitIndex = 1;
                }
                break;
            }
        }

        const leftLetters = sortedLetters.slice(0, splitIndex);
        const rightLetters = sortedLetters.slice(splitIndex);

        const lettersToPage = {};
        leftLetters.forEach(letter => {
            if (activeAlphabet.has(letter)) lettersToPage[letter] = 'left';
        });
        rightLetters.forEach(letter => {
            if (activeAlphabet.has(letter)) lettersToPage[letter] = 'right';
        });

        const rightHasEntries = rightLetters.length > 0;

        // SAFE: Static title, renderGroup handles sanitization
        leftContent.innerHTML = `
            <div class="index-title">~ Contents ~</div>
            ${renderAlphabet(lettersToPage)}
            ${renderGroup(leftLetters, 'left')}
            ${renderFooter(visible.length, rightHasEntries)}
        `;

        rightContent.innerHTML = rightHasEntries
            ? `${renderGroup(rightLetters, 'right')}${renderFooter(visible.length, false)}`
            : '';
    }

    // Reset scroll, then bring the last-viewed recipe into view if present.
    resetColumnScroll();
    if (!singleColumn) {
        const rightPage = document.getElementById('page-right');
        if (rightPage) rightPage.scrollTop = 0;
        rightContent.scrollTop = 0;
    }

    const currentRow = currentRecipeId !== null
        ? document.querySelector('.index-recipe-item.current')
        : null;
    if (currentRow) {
        const container = currentRow.closest('.page');
        if (container) {
            const top = Math.max(0, currentRow.offsetTop - container.clientHeight / 3);
            container.scrollTop = top;
        }
    }

    // Add click handlers for recipe names
    document.querySelectorAll('.index-recipe-item').forEach(item => {
        item.addEventListener('click', () => {
            const recipeId = item.getAttribute('data-recipe-id');
            animatePageTurn('forward', () => fetchAndDisplayRecipe(recipeId));
        });
    });

    document.querySelectorAll('.index-alpha-letter.active').forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-target-page');
            const targetId = item.getAttribute('data-target-id');
            const target = targetId ? document.getElementById(targetId) : null;

            if (!target) return;

            // The scrollable container is .page (parent of .page-content),
            // not .page-content itself which has no overflow set.
            const scrollContainer = targetPage === 'right'
                ? document.getElementById('page-right')
                : document.getElementById('page-left');

            if (!scrollContainer) return;

            const top = Math.max(0, target.offsetTop - 2);
            try {
                scrollContainer.scrollTo({ top, behavior: 'smooth' });
            } catch {
                scrollContainer.scrollTop = top;
            }
        });
    });
}

// Photo preview functions
export function showPhotoPreview(url, alt) {
    const overlay = document.getElementById('photo-preview-overlay');
    const img = document.getElementById('photo-preview-img');
    if (overlay && img) {
        img.src = url;
        img.alt = alt;
        overlay.classList.add('visible');
    }
}
window.showPhotoPreview = showPhotoPreview;

// Add global listeners for overlay dismissal
function setupOverlayDismissal() {
    const overlay = document.getElementById('photo-preview-overlay');
    if (overlay && !overlay.dataset.listenerAttached) {
        overlay.addEventListener('click', () => {
            overlay.classList.remove('visible');
        });
        overlay.dataset.listenerAttached = 'true';
    }
}

// Initial setup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupOverlayDismissal);
} else {
    setupOverlayDismissal();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('photo-preview-overlay');
        if (overlay) overlay.classList.remove('visible');
    }
});

/** Longest plain-text ingredient that may share a line with other ingredients. */
const INGREDIENT_PACK_CHARS = 24;
/** Most ingredients packed onto a single .ingredient-line. */
const INGREDIENT_PACK_MAX = 3;

/**
 * Builds the .ingredients-list markup.
 *
 * Every ingredient always keeps its own .ingredient-item span; consecutive
 * short items (plain text of at most INGREDIENT_PACK_CHARS characters) are
 * packed up to INGREDIENT_PACK_MAX per .ingredient-line, separated by a
 * .ingredient-sep dot. Packing is viewport-independent - the one-item-per-line
 * phone layout is CSS only, so a resize never leaves stale markup behind.
 */
function renderIngredients(ingredients) {
    const lines = [];
    let openLine = null;

    ingredients.forEach(ing => {
        // SANITIZED: quantity, unit, name and notes are user input
        const qtyText = [ing.quantity, ing.unit]
            .filter(v => v !== null && v !== undefined && v !== '')
            .map(v => String(v))
            .join(' ');
        const name = ing.name == null ? '' : String(ing.name);
        const noteText = ing.notes ? ` (${ing.notes})` : '';
        const plainText = `${qtyText ? `${qtyText} ` : ''}${name}${noteText}`;

        const qty = qtyText ? `<span class="ingredient-qty">${escapeHtml(qtyText)}</span> ` : '';
        const notes = ing.notes ? ` <span class="step-note">(${escapeHtml(ing.notes)})</span>` : '';
        const item = `<span class="ingredient-item">${qty}${escapeHtml(name)}${notes}</span>`;

        const packable = plainText.length <= INGREDIENT_PACK_CHARS;
        if (packable && openLine && openLine.length < INGREDIENT_PACK_MAX) {
            openLine.push(item);
            return;
        }
        // A long ingredient takes a line of its own and closes any open group.
        openLine = packable ? [item] : null;
        lines.push(packable ? openLine : [item]);
    });

    if (lines.length === 0) {
        return '<div class="ingredient-line"><span class="ingredient-item">No ingredients listed</span></div>';
    }

    return lines
        .map(items => `<div class="ingredient-line">${items.join('<span class="ingredient-sep"> · </span>')}</div>`)
        .join('');
}

/**
 * Renders the whole recipe into #page-right-content. Never touches
 * #page-left-content - the contents column lives there now.
 *
 * @param {object} recipe
 * @param {{pageNumber?: number|null}} [options]
 *        pageNumber - cosmetic page number for the phone footer.
 */
export function renderRecipe(recipe, options = {}) {
    const rightContent = document.getElementById('page-right-content');
    const pageNumber = options.pageNumber ?? null;

    // Cook mode keeps the ingredients panel on the left page, where rewriting
    // the right page below cannot reach it. Drop that node now: re-asserting
    // the mode at the end relocates the freshly rendered one, and the document
    // must never hold two ingredients panels (applyStepHighlight and the tab
    // machinery each use a single querySelector).
    const relocatedIngredients = document.querySelector('#page-left-content .tab-panel[data-tab="ingredients"]');
    if (relocatedIngredients) relocatedIngredients.remove();

    // Build ingredients list
    const ingredientsList = renderIngredients(recipe.ingredients || []);

    // Build difficulty dots
    const difficulty = recipe.difficulty;
    const difficultyDots = difficulty
        ? Array(5).fill(0).map((_, i) =>
            `<span class="difficulty-dot${i < difficulty ? ' filled' : ''}"></span>`
          ).join('')
        : Array(5).fill(0).map(() =>
            `<span class="difficulty-dot"></span>`
          ).join('');

    // Build preparation steps
    const stepsList = (recipe.steps || []).map((step, i) => {
        const duration = step.duration_minutes
            ? `<span class="step-duration">${step.duration_minutes} min</span>`
            : '';
        // SANITIZED: step.instruction is user input
        return `<div class="prep-step" data-step="${i + 1}"><span class="step-number">${i + 1}.</span> <span class="step-text">${escapeHtml(step.instruction)}</span>${duration}</div>`;
    }).join('');

    // Format email for display (show name portion before @)
    const formatEmail = (email) => {
        if (!email) return null;
        const name = email.split('@')[0];
        return name.replace(/[._-]/g, ' ');
    };

    // Build authorship info
    const authorshipHtml = [];
    if (recipe.created_by) {
        // SAFE: formatEmail returns sanitized string (no HTML characters)
        authorshipHtml.push(`<div class="recipe-meta-item">Created by ${formatEmail(recipe.created_by)}</div>`);
    }
    if (recipe.updated_by && recipe.updated_by !== recipe.created_by) {
        // SAFE: formatEmail returns sanitized string (no HTML characters)
        authorshipHtml.push(`<div class="recipe-meta-item">Updated by ${formatEmail(recipe.updated_by)}</div>`);
    }
    const authorship = authorshipHtml.length > 0
        ? `<div class="recipe-authorship">${authorshipHtml.join('')}</div>`
        : '';

    const totalTimeMinutes = getTotalTimeMinutes(recipe);
    const prepMinutes = getMinutesField(recipe, 'prep_time');
    const cookMinutes = getMinutesField(recipe, 'cook_time');
    const servings = recipe.servings ? Number(recipe.servings) : null;

    // Single handwritten meta line: total · serves · difficulty (prep · cook)
    const metaParts = [];
    if (totalTimeMinutes) {
        metaParts.push(`<span class="meta-total">${formatDuration(totalTimeMinutes)}</span>`);
    }
    if (servings) {
        // SANITIZED: servings coerced to a number above
        metaParts.push(`<span class="meta-serves">serves ${servings}</span>`);
    }
    if (difficulty) {
        metaParts.push(`<span class="meta-difficulty" title="Difficulty ${difficulty}/5"><span class="meta-label">difficulty</span> <span class="difficulty-dots">${difficultyDots}</span></span>`);
    }
    // Display-only tag chips, at most three, after the difficulty dots
    const tagChips = (Array.isArray(recipe.tags) ? recipe.tags : []).slice(0, 3);
    if (tagChips.length) {
        // SANITIZED: tag names are user input
        const chips = tagChips.map(tag => `<span class="recipe-tag">${escapeHtml(String(tag))}</span>`).join('');
        metaParts.push(`<span class="recipe-tags">${chips}</span>`);
    }
    const breakdown = [];
    if (prepMinutes) breakdown.push(`prep ${prepMinutes}`);
    if (cookMinutes) breakdown.push(`cook ${cookMinutes}`);
    const metaLine = metaParts.length
        ? `<div class="recipe-meta-line">${metaParts.join('<span class="meta-sep">·</span>')}${breakdown.length ? `<span class="meta-breakdown">(${breakdown.join(' · ')})</span>` : ''}</div>`
        : '';

    // Photo display
    const hasPhoto = recipe.photo_filename && recipe.photo_filename !== '';
    const addPhotoIcon = `<button class="add-photo-btn" data-recipe-id="${recipe.id}" title="Add photo" aria-label="Add photo to recipe">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="12" cy="13" r="3"/>
                <path d="M5 3v2"/>
                <path d="M19 3v2"/>
            </svg>
        </button>`;
    const shareIcon = `<button class="share-btn" data-recipe-id="${recipe.id}" title="Share recipe" aria-label="Share recipe">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
        </button>`;
    const photoHtml = hasPhoto
        // SANITIZED: recipe.title used in alt attribute
        ? `<span class="recipe-polaroid">
            <img src="/api/recipes/${recipe.id}/photo?t=${Date.now()}"
                 alt="${escapeHtml(recipe.title)} photo"
                 class="recipe-photo"
                 id="recipe-photo-img"
                 data-preview-url="/api/recipes/${recipe.id}/photo"
                 onerror="this.closest('.recipe-polaroid').classList.add('empty')">
           </span>`
        : '';

    // The phone footer is emitted on every viewport and hidden by CSS above
    // 600px, so a resize across the breakpoint needs no re-render.
    const footerPage = pageNumber == null ? '' : `p. ${pageNumber}`;

    // SANITIZED: every recipe-derived string above went through escapeHtml
    rightContent.innerHTML = `
        <div class="recipe-title-row">
            <div class="recipe-title">${escapeHtml(recipe.title || 'Untitled Recipe')}</div>
            ${shareIcon}
            ${addPhotoIcon}
            ${photoHtml}
        </div>
        ${metaLine}

        <section class="tab-panel" data-tab="ingredients">
            <div class="section-header">ingredients:</div>
            <div class="ingredients-list">
                ${ingredientsList}
            </div>
        </section>

        <section class="tab-panel" data-tab="method">
            <div class="section-header">method:</div>

            <div class="prep-list">
                ${stepsList || '<div class="prep-step">No preparation steps listed</div>'}
            </div>

            ${recipe.notes ? `<div class="recipe-note">Note: ${escapeHtml(recipe.notes)}</div>` : ''}
            ${recipe.description ? `<div class="recipe-note">${escapeHtml(recipe.description)}</div>` : ''}
            ${authorship}
        </section>

        <section class="tab-panel" data-tab="notes">
            <div class="notes-thread"></div>
        </section>

        <div class="phone-footer">
            <button type="button" class="footer-prev">‹ previous recipe</button>
            <span class="footer-page">${footerPage}</span>
            <button type="button" class="footer-next">next recipe ›</button>
        </div>
    `;

    // Re-apply any running timer's step highlight for this recipe
    applyStepHighlight(recipe.id);

    // Re-assert the active tab so a re-render (difficulty refresh, photo
    // upload, update_recipe) keeps the user's tab and re-fills .notes-thread.
    const pageRight = document.getElementById('page-right');
    setActiveTab(pageRight?.dataset.tab || 'ingredients', { force: true });

    // ...and the spread mode, for the same reason: a refresh must keep cook
    // mode and put the new ingredients back on the left page. Contents mode
    // needs nothing re-drawn (the contents are already there and the caller
    // re-renders them), so it is left alone rather than made to re-fetch the
    // list on every render. force: a refresh can arrive mid page-turn, and the
    // lock is there to reject the reader's tab clicks, not our own re-render.
    const spreadMode = getSpreadMode();
    if (spreadMode !== 'contents') setSpreadMode(spreadMode, { force: true });
}

export async function fetchAndDisplayRecipe(recipeId) {
    // Opening a *different* recipe starts on Ingredients; a refresh of the
    // recipe already on the page (photo upload, an AI update_recipe, the
    // difficulty backfill) must not yank the reader off Method or Notes.
    const isRefresh = state.viewMode === 'recipe'
        && state.currentRecipeId != null
        && String(state.currentRecipeId) === String(recipeId);
    state.viewMode = 'recipe';
    // Record the id before any await so a timer_start arriving in the same
    // SSE turn as the recipe_artifact binds to this recipe, not the last one.
    state.currentRecipeId = recipeId;
    showRecipeLoading();
    try {
        // Check prefetch cache first
        const cached = getCachedRecipe(recipeId);
        let recipe;
        if (cached && cached.difficulty != null) {
            recipe = cached;
        } else {
            try {
                recipe = await fetchRecipeFromApi(recipeId);
            } catch (error) {
                if (error.status === 404) {
                    // Recipe missing - refresh list and fallback to first if available
                    const list = await state.fetchRecipeList(true);
                    if (list.length > 0) {
                        const firstId = list[0].id;
                        // currentRecipeId is deliberately left pointing at the
                        // recipe that is missing: the recursive call assigns it
                        // anyway, and pre-assigning it here made that call look
                        // like a refresh of a recipe already on the page, which
                        // skips the reset to Ingredients and to cook mode that
                        // opening a different recipe is supposed to do.
                        state.currentRecipeTitle = list[0].title || null;
                        await fetchAndDisplayRecipe(firstId);
                    } else {
                        state.currentRecipeId = null;
                        state.currentRecipeTitle = null;
                        showRecipeError('Recipe not found');
                        state.updateNavigationState();
                    }
                } else {
                    showRecipeError('Failed to load recipe');
                }
                return;
            }
        }

        // Cosmetic page number: the recipe's position in the alphabetical list.
        const list = await state.fetchRecipeList();
        const idx = list.findIndex(r => String(r.id) === String(recipe.id ?? recipeId));
        const pageNumber = idx >= 0 ? pageNumberFor(idx) : null;

        renderRecipe(recipe, { pageNumber });
        // Opening a recipe always starts on Ingredients and in cook mode - the
        // cookbook spread, ingredients left and method right (renderRecipe has
        // already re-asserted the current tab and mode, which is what a refresh
        // keeps). force: opening a recipe from the contents, the prev/next
        // controls or a swipe happens inside a page turn, and the animation
        // lock is meant to reject the reader's tab clicks, not the app's own
        // choice of mode after navigating.
        if (!isRefresh) {
            setActiveTab('ingredients', { force: true });
            setSpreadMode('cook', { force: true });
        }
        setNotePageNumber(pageNumber);

        state.currentRecipeId = recipe.id || recipe.recipe?.id || state.currentRecipeId;
        state.lastRecipeId = state.currentRecipeId;
        state.currentRecipeTitle = recipe.title || recipe.recipe?.title || state.currentRecipeTitle;
        // Refresh recipe list to include newly created recipes, and keep the
        // contents column on the left page in step with it.
        const fresh = await state.fetchRecipeList(true);
        // Only while the left page is actually holding the contents: in cook
        // and notes modes it holds the ingredients or the conversation, and
        // renderIndex would overwrite them. The list is still refreshed, since
        // navigation and the prefetch walk it either way.
        if (getSpreadMode() === 'contents') {
            renderIndex(fresh, { currentRecipeId: state.currentRecipeId, singleColumn: true, filter: state.contentsFilter });
        }
        state.updateNavigationState();
        // Prefetch adjacent recipes for instant navigation
        prefetchAdjacent(state.currentRecipeId);
        refreshDifficultyIfPending(recipe, pageNumber);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        showRecipeError('Failed to load recipe');
        state.updateNavigationState();
    }
}
