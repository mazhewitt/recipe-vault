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
}

/**
 * Authenticate with the server using family password
 */
export async function authenticate(page: Page): Promise<void> {
  const familyPassword = process.env.FAMILY_PASSWORD || 'test123';

  console.log(`Attempting to authenticate at /chat with password: ${familyPassword}`);
  await page.goto('/chat');
  console.log(`Current URL after goto: ${page.url()}`);

  // Check if we need to authenticate
  const authInput = page.locator('input[type="password"]');
  const needsAuth = await authInput.isVisible().catch(() => false);
  console.log(`Needs auth: ${needsAuth}`);

  if (needsAuth) {
    console.log('Filling password and clicking submit...');
    await authInput.fill(familyPassword);
    await page.locator('button[type="submit"]').click();
    console.log('Clicked submit, waiting for #message-input...');

    // Wait for authentication to complete - chat page loads
    try {
      await expect(page.locator('#message-input')).toBeVisible({ timeout: 5000 });
      console.log('Authentication successful!');
    } catch (e) {
      console.error(`Authentication failed. Current URL: ${page.url()}`);
      const body = await page.innerHTML('body');
      console.error('Page body snippet:', body.substring(0, 500));
      throw e;
    }
  } else {
    console.log('No auth input found, checking if #message-input is visible...');
    const chatVisible = await page.locator('#message-input').isVisible();
    console.log(`Chat visible: ${chatVisible}`);
    if (!chatVisible) {
      console.error(`Not on login page but chat not visible either. URL: ${page.url()}`);
    }
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

/**
 * Wait for recipe list to load
 */
export async function waitForRecipeList(page: Page): Promise<void> {
  await expect(page.locator('#recipe-list')).toBeVisible();
}
