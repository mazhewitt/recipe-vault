import { Page, expect } from '@playwright/test';

export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface Step {
  step_number: number;
  instruction: string;
}

export interface Recipe {
  id?: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  steps: Step[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  /** Set it on creation to suppress the pending-difficulty re-render mid-test. */
  difficulty?: number;
}

export type TabName = 'ingredients' | 'method' | 'notes';

/**
 * Authenticate with the server (navigation only, relies on DEV_USER_EMAIL)
 */
export async function authenticate(page: Page): Promise<void> {
  await page.goto('/chat');

  // Wait for chat page to load
  try {
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  } catch (e) {
    console.error(`Failed to load chat page. Current URL: ${page.url()}`);
    throw e;
  }
}

/**
 * Create a recipe via the API
 */
export async function createRecipe(page: Page, recipe: Recipe): Promise<string> {
  const apiKey = 'test-api-key-for-playwright';

  const response = await page.request.post('/api/recipes', {
    data: recipe,
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok()) {
    console.error(`API request failed: ${response.status()} ${response.statusText()}`);
    console.error(await response.text());
  }

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.id;
}

/**
 * Create multiple test recipes
 */
export async function seedRecipes(page: Page, count: number = 3): Promise<string[]> {
  // Add unique suffix to avoid conflicts when tests run in parallel
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const recipes: Recipe[] = [
    {
      title: `Chicken Curry ${uniqueSuffix}`,
      description: 'A flavorful, aromatic curry with coconut milk',
      ingredients: [
        { name: 'chicken breast, cubed', quantity: 2, unit: 'lbs' },
        { name: 'coconut milk', quantity: 1, unit: 'can' },
        { name: 'curry powder', quantity: 2, unit: 'tbsp' },
        { name: 'onion, diced', quantity: 1 },
        { name: 'garlic, minced', quantity: 3, unit: 'cloves' },
        { name: 'ginger, grated', quantity: 1, unit: 'tbsp' },
        { name: 'tomatoes, diced', quantity: 2 },
        { name: 'salt and pepper', notes: 'to taste' },
      ],
      steps: [
        { step_number: 1, instruction: 'Heat oil in a large pan over medium heat' },
        { step_number: 2, instruction: 'Sauté onion until softened, about 5 minutes' },
        { step_number: 3, instruction: 'Add garlic and ginger, cook for 1 minute' },
        { step_number: 4, instruction: 'Add chicken and brown on all sides' },
        { step_number: 5, instruction: 'Stir in curry powder and cook for 1 minute' },
        { step_number: 6, instruction: 'Add tomatoes and coconut milk' },
        { step_number: 7, instruction: 'Simmer for 20-25 minutes until chicken is cooked through' },
        { step_number: 8, instruction: 'Season with salt and pepper' },
        { step_number: 9, instruction: 'Serve over rice' },
      ],
      prep_time_minutes: 15,
      cook_time_minutes: 30,
      servings: 4,
    },
    {
      title: `Simple Pasta ${uniqueSuffix}`,
      description: 'Quick and easy pasta dish',
      ingredients: [
        { name: 'pasta', quantity: 1, unit: 'lb' },
        { name: 'olive oil', quantity: 2, unit: 'tbsp' },
        { name: 'garlic, minced', quantity: 4, unit: 'cloves' },
        { name: 'red pepper flakes', quantity: 1, unit: 'tsp' },
        { name: 'salt', notes: 'to taste' },
        { name: 'fresh parsley' },
      ],
      steps: [
        { step_number: 1, instruction: 'Boil pasta according to package directions' },
        { step_number: 2, instruction: 'Heat olive oil in a pan' },
        { step_number: 3, instruction: 'Add garlic and red pepper flakes' },
        { step_number: 4, instruction: 'Drain pasta and toss with garlic oil' },
        { step_number: 5, instruction: 'Garnish with parsley' },
      ],
      prep_time_minutes: 5,
      cook_time_minutes: 15,
      servings: 4,
    },
    {
      title: `Chocolate Chip Cookies ${uniqueSuffix}`,
      description: 'Classic homemade cookies',
      ingredients: [
        { name: 'all-purpose flour', quantity: 2.25, unit: 'cups' },
        { name: 'baking soda', quantity: 1, unit: 'tsp' },
        { name: 'salt', quantity: 1, unit: 'tsp' },
        { name: 'butter, softened', quantity: 1, unit: 'cup' },
        { name: 'granulated sugar', quantity: 0.75, unit: 'cup' },
        { name: 'brown sugar', quantity: 0.75, unit: 'cup' },
        { name: 'eggs', quantity: 2 },
        { name: 'vanilla extract', quantity: 2, unit: 'tsp' },
        { name: 'chocolate chips', quantity: 2, unit: 'cups' },
      ],
      steps: [
        { step_number: 1, instruction: 'Preheat oven to 375°F' },
        { step_number: 2, instruction: 'Mix flour, baking soda, and salt' },
        { step_number: 3, instruction: 'Beat butter and sugars until creamy' },
        { step_number: 4, instruction: 'Add eggs and vanilla' },
        { step_number: 5, instruction: 'Gradually blend in flour mixture' },
        { step_number: 6, instruction: 'Stir in chocolate chips' },
        { step_number: 7, instruction: 'Drop spoonfuls onto baking sheet' },
        { step_number: 8, instruction: 'Bake for 9-11 minutes' },
      ],
      prep_time_minutes: 15,
      cook_time_minutes: 10,
      servings: 24,
    },
  ];

  const ids: string[] = [];
  for (let i = 0; i < Math.min(count, recipes.length); i++) {
    const id = await createRecipe(page, recipes[i]);
    ids.push(id);
  }

  return ids;
}

/** The phone breakpoint, the one the app itself uses (max-width: 600px). */
export function isPhone(page: Page): boolean {
  return page.viewportSize()!.width <= 600;
}

/**
 * The visible tab strip for this viewport: paper tabs on the page's top edge on
 * a phone, edge tabs on the book's outer edge everywhere else.
 */
export function tabSelector(page: Page, tab: TabName): string {
  return isPhone(page)
    ? `.page-tab[data-tab="${tab}"]`
    : `.edge-tab[data-tab="${tab}"]`;
}

/** Taps a section tab and waits for the right page to actually adopt it. */
export async function openTab(page: Page, tab: TabName): Promise<void> {
  await page.locator(tabSelector(page, tab)).click();
  await expect(page.locator('#page-right')).toHaveAttribute('data-tab', tab);
}

/** Opens a recipe on the right page and waits for it to render. */
export async function openRecipe(page: Page, recipeId: string): Promise<void> {
  await page.evaluate((id) => {
    // @ts-ignore - fetchAndDisplayRecipe is exposed by app.js
    fetchAndDisplayRecipe(id);
  }, recipeId);
  await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 10000 });
}

/** Writes a note in the note input and sends it with Enter. */
export async function sendNote(page: Page, text: string): Promise<void> {
  await page.locator('#message-input').fill(text);
  await page.locator('#message-input').press('Enter');
}

/** The thread entries margin-notes.js holds for this session. */
export async function threadEntries(page: Page): Promise<Array<{ kind: string; text: string }>> {
  return page.evaluate(() =>
    // @ts-ignore - getMarginThread is exposed by app.js
    getMarginThread().map((n: { kind: string; text: string }) => ({ kind: n.kind, text: n.text }))
  );
}

/** Waits for the assistant's reply to this turn to reach the page margin. */
export async function expectReply(page: Page, contains: string): Promise<void> {
  await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
    .toContainText(contains, { timeout: 15000 });
}
