/**
 * Utility Functions Module
 */

/**
 * Escapes HTML special characters to prevent XSS attacks.
 *
 * This function should be used whenever user-provided data (recipe titles, ingredients,
 * steps, chat messages, etc.) is inserted into the DOM via innerHTML or template literals.
 *
 * @param {string} unsafe - The potentially unsafe string containing user input
 * @returns {string} The escaped string safe for insertion into HTML
 *
 * @example
 * const safeTitle = escapeHtml(recipe.title);
 * element.innerHTML = `<h1>${safeTitle}</h1>`;
 */
export function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
