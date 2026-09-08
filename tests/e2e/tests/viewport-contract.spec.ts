import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';

type Band = 'phone' | 'tablet' | 'desktop';

/**
 * The projects in playwright.config.ts are the only thing deciding which CSS
 * breakpoint each spec runs against. A device descriptor that fails to resolve
 * spreads to nothing and drops a project back to the 1280x720 default, and
 * every "phone" or "tablet" assertion quietly starts asserting the desktop
 * layout instead — see .scratch/archive/e2e-ipad-project-not-tablet. This table is the
 * contract. Adding a project without adding a row here fails the suite.
 */
const EXPECTED: Record<string, { width: number; height: number; isMobile: boolean; band: Band }> = {
  chromium: { width: 1280, height: 720, isMobile: false, band: 'desktop' },
  'mobile-chrome': { width: 393, height: 727, isMobile: true, band: 'phone' },
  ipad: { width: 810, height: 1080, isMobile: true, band: 'tablet' },
};

/** The app's own breakpoints: static/styles.css 600px and 1024px. */
function bandFor(width: number): Band {
  if (width <= 600) return 'phone';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

test.describe('Viewport contract', () => {
  test('the project runs at the viewport its breakpoint band requires', async ({ page, isMobile }, testInfo) => {
    const expected = EXPECTED[testInfo.project.name];
    expect(expected, `no viewport recorded for project "${testInfo.project.name}" — add a row to EXPECTED`).toBeDefined();

    const viewport = page.viewportSize();
    expect(viewport, `project "${testInfo.project.name}" has no viewport (device descriptor failed to resolve?)`).not.toBeNull();
    expect({ width: viewport!.width, height: viewport!.height })
      .toEqual({ width: expected.width, height: expected.height });
    expect(bandFor(viewport!.width)).toBe(expected.band);
    expect(isMobile, 'the isMobile fixture gates test.skip() calls; a change here silently disables tests').toBe(expected.isMobile);

    // The CSS must agree with the number: mobile emulation lays out to the meta
    // viewport, so a missing or altered tag would widen the layout viewport
    // without changing page.viewportSize().
    await authenticate(page);
    const css = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      phone: window.matchMedia('(max-width: 600px)').matches,
      tabletOrNarrower: window.matchMedia('(max-width: 1024px)').matches,
    }));
    expect(bandFor(css.clientWidth)).toBe(expected.band);
    expect(css.phone).toBe(expected.band === 'phone');
    expect(css.tabletOrNarrower).toBe(expected.band !== 'desktop');
  });

  // testInfo.config.projects lists every configured project even when the run
  // is filtered with --project, so this still catches a deleted or renamed one.
  test('every breakpoint band is covered by a project', async ({}, testInfo) => {
    const configured = testInfo.config.projects.map(p => p.name);
    for (const name of configured) {
      expect(EXPECTED[name], `project "${name}" is configured but has no row in EXPECTED`).toBeDefined();
    }
    const bands = new Set(configured.map(n => EXPECTED[n]?.band));
    for (const band of ['phone', 'tablet', 'desktop'] as const) {
      expect(bands.has(band), `no project covers the ${band} band`).toBe(true);
    }
  });
});
