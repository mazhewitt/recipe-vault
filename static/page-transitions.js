/**
 * Page Transitions Module
 * Handles page-turn animations, swipe gestures, and recipe prefetching
 */

/* global CSS, requestIdleCallback */

export let state = null;

export function initializeState(appState) {
    state = appState;
}

// --- Animation State ---

let animating = false;

export function isAnimating() {
    return animating;
}

// --- Feature Detection ---

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const supports3D = CSS.supports('transform', 'rotateY(1deg)');

function usePageTurn() {
    return supports3D && !prefersReducedMotion.matches;
}

// --- Prefetch Cache ---

const prefetchCache = new Map(); // recipeId -> { data, timestamp }
const MAX_CACHE = 5;

export function getCachedRecipe(recipeId) {
    const entry = prefetchCache.get(String(recipeId));
    return entry ? entry.data : null;
}

export function clearPrefetchCache() {
    prefetchCache.clear();
}

function cacheRecipe(recipeId, data) {
    const key = String(recipeId);
    prefetchCache.set(key, { data, timestamp: Date.now() });
    // Evict oldest if over limit
    if (prefetchCache.size > MAX_CACHE) {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [k, v] of prefetchCache) {
            if (v.timestamp < oldestTime) {
                oldestTime = v.timestamp;
                oldestKey = k;
            }
        }
        if (oldestKey) prefetchCache.delete(oldestKey);
    }
}

export async function prefetchAdjacent(currentRecipeId) {
    const list = await state.fetchRecipeList();
    if (!list || list.length === 0) return;

    const idx = list.findIndex(r => String(r.id) === String(currentRecipeId));
    if (idx === -1) return;

    const toFetch = [];
    if (idx > 0 && !prefetchCache.has(String(list[idx - 1].id))) {
        toFetch.push(list[idx - 1].id);
    }
    if (idx < list.length - 1 && !prefetchCache.has(String(list[idx + 1].id))) {
        toFetch.push(list[idx + 1].id);
    }

    const doFetch = () => {
        toFetch.forEach(id => {
            fetch(`/api/recipes/${id}`, { credentials: 'same-origin' })
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) cacheRecipe(id, data); })
                .catch(() => {});
        });
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(doFetch);
    } else {
        setTimeout(doFetch, 100);
    }
}

// --- Page Turn Animation ---

function isMobile() {
    return window.matchMedia('(max-width: 600px)').matches;
}

/**
 * Animate a page turn transition.
 * @param {'forward'|'backward'} direction
 * @param {Function} renderFn - called to render new content into the real pages
 * @returns {Promise<void>} resolves when animation completes
 */
export async function animatePageTurn(direction, renderFn) {
    if (animating) return;
    animating = true;

    // Mobile: use View Transitions API (no overlay, no height locking)
    if (isMobile()) {
        if (document.startViewTransition) {
            return viewTransitionNavigate(direction, renderFn);
        }
        // Fallback for browsers without View Transitions
        const pagesContainer = document.querySelector('.pages-container');
        if (!pagesContainer) {
            await Promise.resolve(renderFn());
            animating = false;
            return;
        }
        return crossfadeTransition(pagesContainer, renderFn);
    }

    // Desktop: existing page-turn overlay
    const pagesContainer = document.querySelector('.pages-container');
    if (!pagesContainer) {
        await Promise.resolve(renderFn());
        animating = false;
        return;
    }

    // Lock container height to prevent layout shift (desktop only)
    const containerHeight = pagesContainer.getBoundingClientRect().height;
    pagesContainer.style.height = containerHeight + 'px';

    if (!usePageTurn()) {
        return crossfadeTransition(pagesContainer, renderFn);
    }

    return pageTurnTransition(pagesContainer, direction, renderFn);
}

/**
 * Mobile View Transition: sets direction attribute, runs transition, cleans up.
 */
async function viewTransitionNavigate(direction, renderFn) {
    document.documentElement.setAttribute('data-nav-direction', direction);

    try {
        const transition = document.startViewTransition(async () => {
            await Promise.resolve(renderFn());
        });
        await transition.finished;
    } catch {
        // If View Transition fails, just render directly
        await Promise.resolve(renderFn());
    } finally {
        document.documentElement.removeAttribute('data-nav-direction');
        animating = false;
    }
}

function crossfadeTransition(pagesContainer, renderFn) {
    return new Promise(resolve => {
        const pageLeft = document.getElementById('page-left');
        const pageRight = document.getElementById('page-right');

        // Fade out
        if (pageLeft) pageLeft.style.transition = 'opacity 75ms ease-out';
        if (pageRight) pageRight.style.transition = 'opacity 75ms ease-out';
        if (pageLeft) pageLeft.style.opacity = '0';
        if (pageRight) pageRight.style.opacity = '0';

        setTimeout(async () => {
            // Wait for renderFn (may be async, e.g. fetchAndDisplayRecipe)
            await Promise.resolve(renderFn());

            // Fade in
            if (pageLeft) pageLeft.style.opacity = '1';
            if (pageRight) pageRight.style.opacity = '1';

            setTimeout(() => {
                if (pageLeft) { pageLeft.style.transition = ''; pageLeft.style.opacity = ''; }
                if (pageRight) { pageRight.style.transition = ''; pageRight.style.opacity = ''; }
                pagesContainer.style.height = '';
                animating = false;
                resolve();
            }, 75);
        }, 75);
    });
}

function pageTurnTransition(pagesContainer, direction, renderFn) {
    return new Promise(resolve => {
        // Desktop only: determine which page to capture for the overlay
        const sourcePageId = (direction === 'forward') ? 'page-right' : 'page-left';
        const sourcePage = document.getElementById(sourcePageId);
        if (!sourcePage) {
            Promise.resolve(renderFn()).then(() => {
                pagesContainer.style.height = '';
                animating = false;
                resolve();
            });
            return;
        }

        // Create overlay matching source page dimensions
        const rect = sourcePage.getBoundingClientRect();
        const containerRect = pagesContainer.getBoundingClientRect();

        const overlay = document.createElement('div');
        overlay.className = 'page-turn-overlay';
        overlay.classList.add(direction === 'forward' ? 'turn-forward' : 'turn-backward');

        // Copy the page content into the overlay
        const contentEl = sourcePage.querySelector('.page-content');
        overlay.innerHTML = contentEl ? contentEl.innerHTML : sourcePage.innerHTML;

        // Position overlay exactly over the source page
        overlay.style.position = 'absolute';
        overlay.style.top = (rect.top - containerRect.top) + 'px';
        overlay.style.left = (rect.left - containerRect.left) + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.zIndex = '10';

        pagesContainer.appendChild(overlay);

        // Start render (may be async) and animation in parallel
        const renderPromise = Promise.resolve(renderFn());

        // Trigger reflow then start animation
        overlay.offsetHeight; // force reflow
        overlay.classList.add('animating');

        const animationDone = new Promise(res => {
            const onEnd = () => {
                overlay.removeEventListener('animationend', onEnd);
                overlay.remove();
                res();
            };
            overlay.addEventListener('animationend', onEnd);

            // Safety timeout in case animationend doesn't fire
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
                res();
            }, 600);
        });

        // Wait for BOTH animation and render to complete before unlocking
        Promise.all([renderPromise, animationDone]).then(() => {
            pagesContainer.style.height = '';
            animating = false;
            resolve();
        });
    });
}

// --- Swipe Gesture Navigation (simplified: detect direction, trigger nav) ---

export function initSwipeGestures(container) {
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let tracking = false;
    let directionLocked = false;
    let isHorizontalSwipe = false;
    let shouldIgnoreSwipe = false;
    let pageWidth = 0;

    container.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;
        if (animating) return;

        if (e.target.classList.contains('recipe-photo')) {
            shouldIgnoreSwipe = true;
            return;
        }
        shouldIgnoreSwipe = false;

        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        tracking = true;
        directionLocked = false;
        isHorizontalSwipe = false;
        pageWidth = container.getBoundingClientRect().width;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!tracking || !isMobile() || shouldIgnoreSwipe) return;

        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Decide direction within first movement
        if (!directionLocked && (absDx > 10 || absDy > 10)) {
            directionLocked = true;
            isHorizontalSwipe = absDy < absDx * 2;
            if (!isHorizontalSwipe) {
                tracking = false;
                return;
            }
        }

        if (!directionLocked || !isHorizontalSwipe) return;

        e.preventDefault();
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!tracking || !isHorizontalSwipe) {
            tracking = false;
            return;
        }

        tracking = false;

        const dx = e.changedTouches[0].clientX - touchStartX;
        const progress = Math.abs(dx) / pageWidth;

        if (progress < 0.3) return; // Below threshold — no navigation

        if (dx < 0) {
            // Swipe left → forward
            window.loadNextRecipe();
        } else {
            // Swipe right → backward
            window.loadPrevRecipe();
        }
    }, { passive: true });
}
