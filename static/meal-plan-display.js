/**
 * Meal Plan Display Module
 * Handles rendering a composed meal plan in the recipe book panel.
 * The meal plan always occupies the right page (#page-right-content); the
 * contents stay on the left page.
 */

import { escapeHtml } from './utils.js';

// Import global state accessors (will be set by app.js)
export let state = null;

export function initializeState(appState) {
    state = appState;
}

/**
 * Renders a meal plan into the right-page panel (#page-right-content).
 *
 * @param {Object} mealPlan - The meal_artifact SSE payload
 * @param {string} mealPlan.title - Meal plan title
 * @param {number|null} mealPlan.guest_count - Optional guest count
 * @param {Array} mealPlan.recipes - Array of {recipe_id, title, role}
 */
export function renderMealPlan(mealPlan) {
    const rightContent = document.getElementById('page-right-content');
    if (!rightContent) return;

    // Switch the view mode first: body[data-view-mode="meal"] is what makes the
    // right page visible on phones and hides the recipe tabs.
    if (state) state.viewMode = 'meal';

    const guestBadge = mealPlan.guest_count
        ? `<span class="meal-plan-guest-badge">For ${escapeHtml(String(mealPlan.guest_count))} people</span>`
        : '';

    const recipeRows = (mealPlan.recipes || []).map(recipe => {
        const roleLabel = escapeHtml(recipe.role || 'side');
        const recipeTitle = escapeHtml(recipe.title || '');
        const recipeId = escapeHtml(recipe.recipe_id || '');

        return `<div class="meal-plan-recipe-row">
            <span class="meal-plan-role-badge meal-plan-role-${roleLabel.replace(/\s+/g, '-')}">${roleLabel}</span>
            <button
                class="meal-plan-recipe-link"
                type="button"
                data-recipe-id="${recipeId}"
                onclick="window._mealPlanOpenRecipe('${recipeId}')"
            >${recipeTitle}</button>
        </div>`;
    }).join('');

    // SANITIZED: all user-derived content is escaped above
    rightContent.innerHTML = `
        <div class="meal-plan-panel">
            <div class="meal-plan-header">
                <h2 class="meal-plan-title">${escapeHtml(mealPlan.title || 'Meal Plan')}</h2>
                ${guestBadge}
            </div>
            <div class="meal-plan-recipes">
                ${recipeRows || '<p class="meal-plan-empty">No recipes in this meal plan.</p>'}
            </div>
            <div class="meal-plan-actions">
                <button class="meal-plan-action-btn" type="button" disabled>Shopping List</button>
                <button class="meal-plan-action-btn" type="button" disabled>Cooking Timeline</button>
                <button class="meal-plan-action-btn" type="button" disabled>Save Meal</button>
            </div>
        </div>
    `;

    // Register global handler for recipe link clicks (avoids inline eval)
    window._mealPlanOpenRecipe = function (recipeId) {
        if (state && state.fetchAndDisplayRecipe) {
            state.fetchAndDisplayRecipe(recipeId);
        }
    };
}
