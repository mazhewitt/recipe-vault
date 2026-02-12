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

    const pagesContainer = document.querySelector('.pages-container');
    if (!pagesContainer) {
        await Promise.resolve(renderFn());
        animating = false;
        return;
    }

    // Lock container height to prevent layout shift
    const containerHeight = pagesContainer.getBoundingClientRect().height;
    pagesContainer.style.height = containerHeight + 'px';

    if (!usePageTurn()) {
        return crossfadeTransition(pagesContainer, renderFn);
    }

    return pageTurnTransition(pagesContainer, direction, renderFn);
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
        const mobile = isMobile();

        // Determine which page to capture for the overlay
        const sourcePageId = (direction === 'forward')
            ? (mobile ? 'page-left' : 'page-right')
            : 'page-left';
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

// --- Curl transform helper ---
// Maps an angle (0-180) to a CSS transform string with curl effect
// (matching the keyframe midpoint squeeze: scaleX 0.88, translateZ 30px at 90deg)
function curlTransform(angleDeg) {
    const abs = Math.abs(angleDeg);
    // Parabolic curve: peaks at 90deg, zero at 0 and 180
    const t = 1 - Math.pow((abs - 90) / 90, 2); // 0→0, 90→1, 180→0
    const scaleX = 1 - 0.12 * t;       // 1 → 0.88 → 1
    const translateZ = 30 * t;          // 0 → 30 → 0
    return `rotateY(${angleDeg}deg) scaleX(${scaleX}) translateZ(${translateZ}px)`;
}

// --- Interactive Swipe for Page Turn (called from overlay during swipe) ---

function completeSwipeTurn(overlay, direction, pagesContainer) {
    return new Promise(resolve => {
        overlay.style.transition = 'transform 200ms ease-out';
        const targetAngle = direction === 'forward' ? -180 : 180;
        overlay.style.transform = curlTransform(targetAngle);

        const onEnd = () => {
            overlay.removeEventListener('transitionend', onEnd);
            overlay.remove();
            pagesContainer.style.height = '';
            animating = false;
            resolve();
        };
        overlay.addEventListener('transitionend', onEnd);
        setTimeout(() => {
            if (animating) {
                overlay.remove();
                pagesContainer.style.height = '';
                animating = false;
                resolve();
            }
        }, 350);
    });
}

function snapBackSwipe(overlay, pagesContainer, oldLeft, oldRight) {
    return new Promise(resolve => {
        overlay.style.transition = 'transform 200ms ease-out';
        overlay.style.transform = curlTransform(0);

        const onEnd = () => {
            overlay.removeEventListener('transitionend', onEnd);
            // Restore old content
            const leftContent = document.getElementById('page-left-content');
            const rightContent = document.getElementById('page-right-content');
            if (leftContent && oldLeft !== null) leftContent.innerHTML = oldLeft;
            if (rightContent && oldRight !== null) rightContent.innerHTML = oldRight;
            overlay.remove();
            pagesContainer.style.height = '';
            animating = false;
            resolve();
        };
        overlay.addEventListener('transitionend', onEnd);
        setTimeout(() => {
            if (animating) {
                const leftContent = document.getElementById('page-left-content');
                const rightContent = document.getElementById('page-right-content');
                if (leftContent && oldLeft !== null) leftContent.innerHTML = oldLeft;
                if (rightContent && oldRight !== null) rightContent.innerHTML = oldRight;
                overlay.remove();
                pagesContainer.style.height = '';
                animating = false;
                resolve();
            }
        }, 350);
    });
}

// --- Swipe Gesture Navigation ---

export function initSwipeGestures(container) {
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let tracking = false;
    let directionLocked = false; // true once we decide swipe vs scroll
    let isHorizontalSwipe = false;
    let overlay = null;
    let swipeDirection = null; // 'forward' or 'backward'
    let oldLeftHTML = null;
    let oldRightHTML = null;
    let pageWidth = 0;
    let contentRendered = false;

    container.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;
        if (animating) return;

        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        tracking = true;
        directionLocked = false;
        isHorizontalSwipe = false;
        overlay = null;
        swipeDirection = null;
        contentRendered = false;
        oldLeftHTML = null;
        oldRightHTML = null;
        pageWidth = container.getBoundingClientRect().width;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!tracking || !isMobile()) return;

        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Decide direction within first 30px of movement
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

        // Determine swipe direction from finger movement
        // Swipe left (dx < 0) = forward, swipe right (dx > 0) = backward
        const dir = dx < 0 ? 'forward' : 'backward';

        if (!overlay) {
            // Create overlay on first significant horizontal move
            swipeDirection = dir;
            animating = true;

            // Lock container height
            const containerHeight = container.getBoundingClientRect().height;
            container.style.height = containerHeight + 'px';

            const sourcePage = document.getElementById('page-left');
            if (!sourcePage) { tracking = false; animating = false; return; }

            const contentEl = sourcePage.querySelector('.page-content');
            oldLeftHTML = contentEl ? contentEl.innerHTML : '';
            const rightContent = document.getElementById('page-right-content');
            oldRightHTML = rightContent ? rightContent.innerHTML : '';

            const rect = sourcePage.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            overlay = document.createElement('div');
            overlay.className = 'page-turn-overlay swipe-tracking';
            overlay.classList.add(dir === 'forward' ? 'turn-forward' : 'turn-backward');
            overlay.innerHTML = oldLeftHTML;
            overlay.style.position = 'absolute';
            overlay.style.top = (rect.top - containerRect.top) + 'px';
            overlay.style.left = (rect.left - containerRect.left) + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
            overlay.style.zIndex = '10';
            overlay.style.transform = 'rotateY(0deg)';

            container.appendChild(overlay);
        }

        // Map finger displacement to rotation angle
        const progress = Math.min(Math.abs(dx) / pageWidth, 1);
        const angle = progress * 180;
        const rotateAngle = swipeDirection === 'forward' ? -angle : angle;
        overlay.style.transform = curlTransform(rotateAngle);

        // Render new content once we pass ~20% so it's ready behind the overlay
        if (!contentRendered && progress > 0.2) {
            contentRendered = true;
            renderSwipeTarget(swipeDirection);
        }
    }, { passive: false });

    container.addEventListener('touchend', async () => {
        if (!tracking || !isHorizontalSwipe || !overlay) {
            tracking = false;
            if (overlay && animating) {
                overlay.remove();
                container.style.height = '';
                animating = false;
            }
            return;
        }

        tracking = false;

        const currentTransform = overlay.style.transform;
        const angleMatch = currentTransform.match(/rotateY\(([-\d.]+)deg\)/);
        const currentAngle = angleMatch ? Math.abs(parseFloat(angleMatch[1])) : 0;
        const commitThreshold = 180 * 0.3; // 30% of full turn

        if (currentAngle >= commitThreshold) {
            // Ensure content is rendered if we haven't yet
            if (!contentRendered) {
                contentRendered = true;
                renderSwipeTarget(swipeDirection);
            }
            await completeSwipeTurn(overlay, swipeDirection, container);
            // Trigger navigation state update and prefetch
            if (state) {
                state.updateNavigationState();
                if (state.currentRecipeId) {
                    prefetchAdjacent(state.currentRecipeId);
                }
            }
        } else {
            await snapBackSwipe(overlay, container, oldLeftHTML, oldRightHTML);
        }

        overlay = null;
    }, { passive: true });
}

async function renderSwipeTarget(direction) {
    const list = await state.fetchRecipeList();
    if (!list || list.length === 0) return;

    if (state.viewMode === 'index') {
        if (direction === 'forward' && list.length > 0) {
            const targetId = list[0].id;
            const cached = getCachedRecipe(targetId);
            if (cached) {
                state.viewMode = 'recipe';
                state.currentRecipeId = cached.id;
                state.currentRecipeTitle = cached.title;
                state.renderRecipe(cached);
            } else {
                await state.fetchAndDisplayRecipe(targetId);
            }
        }
        return;
    }

    const idx = list.findIndex(r => String(r.id) === String(state.currentRecipeId));
    if (idx === -1) return;

    let targetId = null;
    if (direction === 'forward' && idx < list.length - 1) {
        targetId = list[idx + 1].id;
    } else if (direction === 'backward' && idx > 0) {
        targetId = list[idx - 1].id;
    } else if (direction === 'backward' && idx === 0) {
        // Go to index
        state.viewMode = 'index';
        state.currentRecipeId = null;
        state.currentRecipeTitle = null;
        state.renderIndex(list);
        return;
    }

    if (!targetId) return;

    const cached = getCachedRecipe(targetId);
    if (cached) {
        state.viewMode = 'recipe';
        state.currentRecipeId = cached.id;
        state.currentRecipeTitle = cached.title;
        state.renderRecipe(cached);
    } else {
        await state.fetchAndDisplayRecipe(targetId);
    }
}
