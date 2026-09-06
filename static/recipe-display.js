/**
 * Recipe Display Module
 * Handles recipe rendering, navigation, and index views
 */

import { escapeHtml } from './utils.js';
import { getCachedRecipe, prefetchAdjacent, animatePageTurn } from './page-transitions.js';

// Import global state accessors (these will be set by app.js)
export let state = null;

export function initializeState(appState) {
    state = appState;
}

export function isMobile() {
    return window.matchMedia('(max-width: 600px)').matches;
}

export function showRecipeLoading() {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');

    // SAFE: Static HTML, no user data
    leftContent.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-short"></div>
    `;

    if (!isMobile()) {
        // SAFE: Static HTML, no user data
        rightContent.innerHTML = `
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
        `;
    } else {
        rightContent.innerHTML = '';
    }
}

export function showRecipeError(message) {
    const leftContent = document.getElementById('page-left-content');
    // SANITIZED: Error message could contain user input
    leftContent.innerHTML = `
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

async function refreshDifficultyIfPending(recipe) {
    if (!recipe || recipe.difficulty != null || !recipe.id) return;

    for (const waitMs of [3000, 7000, 12000]) {
        await delay(waitMs);

        if (state.currentRecipeId !== recipe.id || state.viewMode !== 'recipe') {
            return;
        }

        try {
            const refreshed = await fetchRecipeFromApi(recipe.id);
            if (refreshed.difficulty != null) {
                renderRecipe(refreshed);
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

export function renderIndex(recipes, options = {}) {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');
    const alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const currentRecipeId = options.currentRecipeId != null ? String(options.currentRecipeId) : null;
    const photoEpoch = state?.photoEpoch ?? 0;

    if (recipes.length === 0) {
        // SAFE: Static HTML, no user data
        leftContent.innerHTML = `
            <div class="recipe-placeholder">
                <div class="recipe-placeholder-text">
                    Your recipe book is empty. Ask me to create a recipe!
                </div>
            </div>
        `;
        rightContent.innerHTML = '';
        return;
    }

    // Group by first letter
    const groups = {};
    recipes.forEach((recipe, position) => {
        const letter = recipe.title[0].toUpperCase();
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push({ recipe, position });
    });

    const sortedLetters = Object.keys(groups).sort();
    const activeAlphabet = new Set(sortedLetters.filter(letter => /^[A-Z]$/.test(letter)));

    function sectionIdFor(letter, page) {
        return `index-section-${page}-${letter.toLowerCase()}`;
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
        const noun = count === 1 ? 'recipe' : 'recipes';
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

    if (isMobile()) {
        const lettersToPage = {};
        sortedLetters.forEach(letter => {
            if (activeAlphabet.has(letter)) lettersToPage[letter] = 'left';
        });

        // SAFE: Contents title is static, renderGroup handles sanitization
        leftContent.innerHTML = `
            <div class="index-title">~ Contents ~</div>
            ${renderAlphabet(lettersToPage)}
            ${renderGroup(sortedLetters, 'left')}
            ${renderFooter(recipes.length, false)}
        `;
        rightContent.innerHTML = '';
    } else {
        // Split groups across pages based on recipe count
        const totalRecipes = recipes.length;
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
            ${renderFooter(recipes.length, rightHasEntries)}
        `;

        rightContent.innerHTML = rightHasEntries
            ? `${renderGroup(rightLetters, 'right')}${renderFooter(recipes.length, false)}`
            : '';
    }

    // Reset scroll, then bring the last-viewed recipe into view if present.
    // The scrollable container is .page (parent of .page-content).
    const leftPage = document.getElementById('page-left');
    const rightPage = document.getElementById('page-right');
    if (leftPage) leftPage.scrollTop = 0;
    if (rightPage) rightPage.scrollTop = 0;
    leftContent.scrollTop = 0;
    rightContent.scrollTop = 0;

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

export function renderRecipe(recipe) {
    const leftContent = document.getElementById('page-left-content');
    const rightContent = document.getElementById('page-right-content');

    // Build ingredients list
    const ingredientsList = (recipe.ingredients || []).map(ing => {
        // SANITIZED: quantity, unit, name and notes are user input
        const qtyText = [ing.quantity, ing.unit].filter(v => v !== null && v !== undefined && v !== '').map(v => escapeHtml(String(v))).join(' ');
        const qty = qtyText ? `<span class="ingredient-qty">${qtyText}</span> ` : '';
        const notes = ing.notes ? ` <span class="step-note">(${escapeHtml(ing.notes)})</span>` : '';
        return `<div class="ingredient-line">${qty}${escapeHtml(ing.name)}${notes}</div>`;
    }).join('');

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
        ? `<div class="recipe-photo-container">
            <div class="recipe-photo-wrapper">
                <img src="/api/recipes/${recipe.id}/photo?t=${Date.now()}"
                     alt="${escapeHtml(recipe.title)} photo"
                     class="recipe-photo"
                     id="recipe-photo-img"
                     data-preview-url="/api/recipes/${recipe.id}/photo"
                     onerror="this.closest('.recipe-photo-container').style.display='none';">
            </div>
           </div>`
        : '';

    // SANITIZED: recipe.title is user input
    const ingredientsHtml = `
        <div class="recipe-title-row">
            <div class="recipe-title">${escapeHtml(recipe.title || 'Untitled Recipe')}</div>
            ${shareIcon}
            ${addPhotoIcon}
        </div>
        ${metaLine}
        ${photoHtml}

        <div class="section-header">ingredients:</div>
        <div class="ingredients-list">
            ${ingredientsList || '<div class="ingredient-line">No ingredients listed</div>'}
        </div>
    `;

    // SANITIZED: recipe.notes and recipe.description are user input
    const preparationHtml = `
        <div class="section-header">method:</div>

        <div class="prep-list">
            ${stepsList || '<div class="prep-step">No preparation steps listed</div>'}
        </div>

        ${recipe.notes ? `<div class="recipe-note">Note: ${escapeHtml(recipe.notes)}</div>` : ''}
        ${recipe.description ? `<div class="recipe-note">${escapeHtml(recipe.description)}</div>` : ''}
        ${authorship}
    `;

    if (isMobile()) {
        leftContent.innerHTML = ingredientsHtml + '<div style="margin-top: 30px;"></div>' + preparationHtml;
        rightContent.innerHTML = '';
    } else {
        leftContent.innerHTML = ingredientsHtml;
        rightContent.innerHTML = preparationHtml;
    }
}

export async function fetchAndDisplayRecipe(recipeId) {
    showRecipeLoading();
    state.viewMode = 'recipe';
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
                        state.currentRecipeId = firstId;
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
        renderRecipe(recipe);
        state.currentRecipeId = recipe.id || recipe.recipe?.id || state.currentRecipeId;
        state.lastRecipeId = state.currentRecipeId;
        state.currentRecipeTitle = recipe.title || recipe.recipe?.title || state.currentRecipeTitle;
        // Refresh recipe list to include newly created recipes
        await state.fetchRecipeList(true);
        state.updateNavigationState();
        // Prefetch adjacent recipes for instant navigation
        prefetchAdjacent(state.currentRecipeId);
        refreshDifficultyIfPending(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        showRecipeError('Failed to load recipe');
        state.updateNavigationState();
    }
}
