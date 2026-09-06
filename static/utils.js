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

/**
 * Renders markdown text to HTML.
 * Uses marked.js library if available, otherwise falls back to basic patterns.
 *
 * NOTE: This function returns HTML that will be inserted via innerHTML.
 * It is used for AI-generated content which is considered trusted (controlled by us).
 * User input should NOT be passed through this function - use escapeHtml() instead.
 */
export function renderMarkdown(text) {
    try {
        if (typeof marked !== 'undefined' && marked.parse) {
            return marked.parse(text);
        }
    } catch (e) {
        console.error('Markdown parsing error:', e);
    }
    // Fallback: basic markdown rendering
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n/g, '<br>');
}
