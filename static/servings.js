/**
 * Servings Module
 * The servings stepper ("serves − N +"): rescales the displayed ingredient
 * quantities for this browser session without saving anything. N is kept in
 * the recipe's rv-place:<id> record (place-keeping.js), next to the ticks.
 *
 * A change of N rewrites text nodes and attributes only - the count, each
 * .ingredient-qty and the .servings-note slot - never the markup, so ticks
 * and the step mark stay and nothing is re-rendered.
 */

import { readServings, writeServings } from './place-keeping.js';

/** The highest count the stepper offers for a recipe of `servings`. */
export function servingsRange(servings) {
    return Math.max(servings, Math.min(4 * servings, 24));
}

// --- Rounding (family-recipe-ui › Scaled quantities are rounded for reading) ---

const FRACTION_GLYPHS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

// Halves round up; the epsilon keeps a float like 0.1 * 3 on the right side
function roundTo(q, step) {
    return Math.round(q / step + 1e-9) * step;
}

/** A multiple of ¼ as "1¼", "¾", "2". */
function asFraction(v) {
    const whole = Math.floor(v);
    const glyph = FRACTION_GLYPHS[v - whole] || '';
    if (!glyph) return String(whole);
    return whole ? `${whole}${glyph}` : glyph;
}

/** At most `places` decimals, trailing zeros dropped. */
function asDecimal(v, places) {
    return String(Number(roundTo(v, 1 / 10 ** places).toFixed(places)));
}

function unitKind(unit) {
    const u = unit == null ? '' : String(unit).trim().toLowerCase();
    if (u === '') return 'count';
    const singular = u.endsWith('s') ? u.slice(0, -1) : u;
    if (['g', 'gram', 'ml', 'millilitre', 'milliliter'].includes(singular)) return 'metric';
    if (['kg', 'kilogram', 'l', 'litre', 'liter'].includes(singular)) return 'large';
    if (['cup', 'tbsp', 'tablespoon', 'tsp', 'teaspoon'].includes(singular)) return 'spoon';
    return 'other';
}

/** "q unit", as renderIngredients writes an unscaled quantity. */
function joinQty(quantity, unit) {
    return [quantity, unit]
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(v => String(v))
        .join(' ');
}

/**
 * The display text of an ingredient quantity scaled from `servings` to `n`:
 * quantity × n ÷ servings, rounded for reading by its unit, then the unit
 * unchanged. At n = servings it is the quantity exactly as stored.
 *
 * @param {number} quantity
 * @param {string|null} unit
 * @param {number} servings - the recipe's servings
 * @param {number} n - the servings the page shows
 * @returns {string}
 */
export function scaleQuantity(quantity, unit, servings, n) {
    const original = joinQty(quantity, unit);
    if (n === servings || !quantity) return original;
    const q = (Number(quantity) * n) / servings;

    let rounded;
    let text;
    switch (unitKind(unit)) {
        case 'metric':
            rounded = roundTo(q, q < 50 ? 1 : q <= 500 ? 5 : 10);
            text = String(rounded);
            break;
        case 'large':
            rounded = roundTo(q, 0.1);
            text = asDecimal(q, 1);
            break;
        case 'spoon':
            rounded = roundTo(q, 0.25);
            text = asFraction(rounded);
            break;
        case 'count':
            rounded = roundTo(q, 0.5);
            text = asFraction(rounded);
            break;
        default:
            rounded = roundTo(q, 0.01);
            text = asDecimal(q, 2);
    }
    if (Number(rounded.toFixed(6)) === 0) return `a little of ${original}`;
    return joinQty(text, unit);
}

// --- The stepper ---

/** The recipe the stepper on the page belongs to: { id, servings, ingredients, n }. */
let current = null;

function clampStored(stored, servings) {
    if (!Number.isInteger(stored) || stored < 1) return servings;
    return Math.min(stored, servingsRange(servings));
}

function pageRoots() {
    return [document.getElementById('page-left-content'), document.getElementById('page-right-content')]
        .filter(Boolean);
}

function draw(roots) {
    if (!current) return;
    const { servings, ingredients, n } = current;
    const scaledNow = n !== servings;
    for (const root of roots) {
        root.querySelectorAll('.servings-count').forEach(out => {
            out.textContent = String(n);
        });
        root.querySelectorAll('.servings-step').forEach(btn => {
            const step = Number(btn.dataset.step);
            btn.disabled = step < 0 ? n <= 1 : n >= servingsRange(servings);
        });
        root.querySelectorAll('.ingredient-item[data-index]').forEach(item => {
            const ing = ingredients[Number(item.dataset.index)];
            const qty = item.querySelector('.ingredient-qty');
            if (!ing || !qty || ing.quantity == null || ing.quantity === '' || !Number.isFinite(Number(ing.quantity))) return;
            const text = scaleQuantity(Number(ing.quantity), ing.unit, servings, n);
            if (qty.textContent !== text) qty.textContent = text;
            if (scaledNow) qty.setAttribute('data-scaled', '');
            else qty.removeAttribute('data-scaled');
        });
        root.querySelectorAll('.servings-note').forEach(note => {
            note.textContent = scaledNow ? `Scaled for ${n} · amounts in the method are for ${servings}` : '';
        });
    }
}

/**
 * Binds the stepper to a freshly rendered recipe: the count is the one stored
 * for this recipe in the session, clamped to the recipe's range, or the
 * recipe's own servings. Called by renderRecipe with the container it has
 * just filled (the ingredients panel may be parked off the page right after).
 *
 * @param {object} recipe
 * @param {Element} [root]
 */
export function applyServings(recipe, root) {
    const servings = Number(recipe?.servings);
    if (!recipe || !Number.isInteger(servings) || servings < 1) {
        current = null;
        return;
    }
    current = {
        id: String(recipe.id),
        servings,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        n: clampStored(readServings(recipe.id), servings),
    };
    draw(root ? [root] : pageRoots());
}

/** Re-draws the current count on both pages (a mode change brought the ingredients back). */
export function redrawServings() {
    draw(pageRoots());
}

/**
 * The servings the page shows for `recipeId`, or null when that recipe is not
 * the one on the page or has no servings (the chat's current-recipe payload).
 */
export function displayedServings(recipeId) {
    if (!current || recipeId == null || current.id !== String(recipeId)) return null;
    return current.n;
}

/**
 * Sets the stepper of `recipeId` to `n`, clamped to its range, as if the cook
 * had used it. Ignored unless that recipe is the one on the page and has
 * servings.
 *
 * @returns {boolean} whether the stepper was set
 */
export function setServings(recipeId, n) {
    if (!current || recipeId == null || current.id !== String(recipeId)) return false;
    const wanted = Math.round(Number(n));
    if (!Number.isFinite(wanted)) return false;
    current.n = Math.min(Math.max(wanted, 1), servingsRange(current.servings));
    // Back at the recipe's own servings the cook has set nothing: store no
    // count, so a later saved change of servings shows unscaled
    writeServings(current.id, current.n === current.servings ? null : current.n);
    draw(pageRoots());
    return true;
}

function onClick(e) {
    const btn = e.target?.closest?.('.servings-step');
    if (!btn || btn.disabled || !current) return;
    setServings(current.id, current.n + Number(btn.dataset.step));
}

let bound = false;

/** One delegated click listener per page. Safe to call more than once. */
export function initServings() {
    if (bound) return;
    bound = true;
    pageRoots().forEach(root => root.addEventListener('click', onClick));
}
