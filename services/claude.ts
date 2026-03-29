/**
 * Claude AI Service
 * Handles ingredient detection from photos and AI recipe generation.
 *
 * NOTE: In production, these calls should be proxied through a backend server
 * to keep your API key secure. For development/demo purposes, the key is stored
 * in your .env file and prefixed with EXPO_PUBLIC_.
 */
import { DetectedIngredient, PantryItem, Recipe, RecipeIngredient } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

function getHeaders() {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY in environment.');
  }

  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
}

// ─── Ingredient Detection from Photo ─────────────────────────────────────────

export async function detectIngredientsFromPhoto(
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<DetectedIngredient[]> {
  const prompt = `You are a kitchen inventory expert. Analyze this photo of a fridge, pantry, or kitchen and identify all visible food items and ingredients.

For each item you can identify, provide:
1. The ingredient name (be specific, e.g. "whole milk" not just "milk")
2. Estimated quantity/amount (if visible)
3. Category (fridge, pantry, freezer, spices, or other)
4. Confidence level (0.0 to 1.0)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "Ingredient Name",
    "quantity": "estimated quantity or null",
    "category": "fridge|pantry|freezer|spices|other",
    "confidence": 0.95,
    "icon": "material_symbol_name"
  }
]

For the "icon" field, choose the best matching Material Symbols icon name (e.g., "egg", "water_drop", "nutrition", "kitchen", "grain", "coffee", "bakery_dining", "set_meal", "icecream", "liquor").

Be thorough but only include items you can actually see or strongly infer from the image. Do not include items that are not visible.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    console.log('Raw Claude ingredient response:', content);
    throw new Error('Could not parse ingredient list from AI response');
  }

  const jsonText = content.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonText) as DetectedIngredient[];

    if (!Array.isArray(parsed)) {
      throw new Error('Ingredient response was not an array');
    }

    return parsed;
  } catch (err) {
    console.log('Failed ingredient JSON:', jsonText);
    console.log('Ingredient JSON parse error:', err);
    throw new Error('AI returned invalid ingredient data. Please try again.');
  }
}

// ─── Recipe Generation ────────────────────────────────────────────────────────

type RecipePreferences = {
  dietaryRestrictions?: string[];
  cuisinePreference?: string;
  maxTime?: number;
  difficulty?: string;
};

type SingleRecipeOptions = {
  matchType: 'full' | 'partial';
  excludeTitles?: string[];
  excludeCuisines?: string[];
};

function buildIngredientList(pantryItems: PantryItem[]): string {
  return pantryItems.map((item) => `- ${item.name}: ${item.quantity}`).join('\n');
}

function buildPreferencesText(preferences?: RecipePreferences): string {
  if (!preferences) return '';

  return `
User preferences:
- Dietary restrictions: ${preferences.dietaryRestrictions?.join(', ') || 'None'}
- Cuisine preference: ${preferences.cuisinePreference || 'Any'}
- Max cooking time: ${preferences.maxTime ? `${preferences.maxTime} minutes` : 'Any'}
- Difficulty: ${preferences.difficulty || 'Any'}
`;
}

function buildSingleRecipePrompt(
  pantryItems: PantryItem[],
  preferences: RecipePreferences | undefined,
  options: SingleRecipeOptions
): string {
  const ingredientList = buildIngredientList(pantryItems);
  const prefsText = buildPreferencesText(preferences);
  const excludeTitles = options.excludeTitles?.length
    ? options.excludeTitles.join(', ')
    : 'None';
  const excludeCuisines = options.excludeCuisines?.length
    ? options.excludeCuisines.join(', ')
    : 'None';

  const matchInstructions =
    options.matchType === 'full'
      ? `Generate exactly 1 FULL MATCH recipe that can be made using only the available ingredients.
- matchType must be "full"
- matchPercent must be between 95 and 100
- missingIngredients must be []`
      : `Generate exactly 1 PARTIAL MATCH recipe that needs at most 3 additional ingredients.
- matchType must be "partial"
- matchPercent must be between 60 and 90
- missingIngredients must contain only the missing ingredient names`;

  return `You are a professional chef and recipe creator.

${matchInstructions}

Available ingredients:
${ingredientList}
${prefsText}

Variety rules:
- Do not repeat these existing recipe titles: ${excludeTitles}
- Do not repeat these existing cuisines: ${excludeCuisines}
- Make this recipe meaningfully different from prior recipes
- Use no more than 8 ingredients
- Use exactly 3 steps
- Keep the title, description, ingredients, and steps concise
- Step descriptions must be short, clear, and one sentence each
- Prefer realistic recipes based on the provided pantry

Return ONLY a valid JSON object.
Do not use markdown.
Do not include any text before or after the JSON.

Use this exact structure:
{
  "id": "recipe_1",
  "title": "Recipe Name",
  "description": "Short description",
  "prepTime": 10,
  "cookTime": 20,
  "totalTime": 30,
  "servings": 4,
  "difficulty": "Easy",
  "cuisine": "Italian",
  "tags": ["quick", "healthy"],
  "ingredients": [
    {
      "name": "Ingredient Name",
      "amount": "2 cups",
      "inPantry": true,
      "optional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step Title",
      "description": "Short instruction sentence.",
      "duration": "5 minutes",
      "tip": "Optional short tip"
    }
  ],
  "matchType": "${options.matchType}",
  "matchPercent": ${options.matchType === 'full' ? 100 : 75},
  "missingIngredients": [],
  "source": "ai-generated",
  "isAiGenerated": true
}`;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not parse recipe from AI response');
  }

  return text.slice(start, end + 1);
}

function normalizeRecipe(recipe: Partial<Recipe>, fallbackId: string, matchType: 'full' | 'partial'): Recipe {
  return {
    id: recipe.id || fallbackId,
    title: recipe.title || 'Untitled Recipe',
    description: recipe.description || 'AI-generated recipe suggestion.',
    prepTime: typeof recipe.prepTime === 'number' ? recipe.prepTime : 10,
    cookTime: typeof recipe.cookTime === 'number' ? recipe.cookTime : 20,
    totalTime:
      typeof recipe.totalTime === 'number'
        ? recipe.totalTime
        : (typeof recipe.prepTime === 'number' ? recipe.prepTime : 10) +
          (typeof recipe.cookTime === 'number' ? recipe.cookTime : 20),
    servings: typeof recipe.servings === 'number' ? recipe.servings : 4,
    difficulty: recipe.difficulty || 'Easy',
    cuisine: recipe.cuisine || 'General',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps)
      ? recipe.steps.map((step, index) => ({
          stepNumber: typeof step.stepNumber === 'number' ? step.stepNumber : index + 1,
          title: step.title || `Step ${index + 1}`,
          description: step.description || 'Follow this step.',
          duration: step.duration || '',
          tip: step.tip ?? '',
        }))
      : [],
    nutrition: recipe.nutrition || {
      calories: 0,
      protein: '0g',
      carbs: '0g',
      fat: '0g',
      fiber: '0g',
    },
    matchType: recipe.matchType || matchType,
    matchPercent:
      typeof recipe.matchPercent === 'number'
        ? recipe.matchPercent
        : matchType === 'full'
          ? 100
          : 75,
    missingIngredients: Array.isArray(recipe.missingIngredients)
      ? recipe.missingIngredients
      : [],
    rating: typeof recipe.rating === 'number' ? recipe.rating : 4.5,
    ratingCount: typeof recipe.ratingCount === 'number' ? recipe.ratingCount : 0,
    createdAt: recipe.createdAt || new Date().toISOString(),
    source: recipe.source || 'ai-generated',
    isAiGenerated: recipe.isAiGenerated ?? true,
  };
}

async function generateSingleRecipe(
  pantryItems: PantryItem[],
  preferences: RecipePreferences | undefined,
  options: SingleRecipeOptions,
  recipeNumber: number
): Promise<Recipe> {
  const prompt = buildSingleRecipePrompt(pantryItems, preferences, options);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1400,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  console.log(`Raw Claude recipe ${recipeNumber} response:`, content);

  const jsonText = extractJsonObject(content);

  try {
    const parsed = JSON.parse(jsonText) as Partial<Recipe>;
    return normalizeRecipe(parsed, `recipe_${recipeNumber}`, options.matchType);
  } catch (err) {
    console.log(`Failed recipe ${recipeNumber} JSON:`, jsonText);
    console.log(`Recipe ${recipeNumber} JSON parse error:`, err);
    throw new Error(`AI returned invalid recipe ${recipeNumber} data. Please try again.`);
  }
}

async function generateSingleRecipeWithRetry(
  pantryItems: PantryItem[],
  preferences: RecipePreferences | undefined,
  options: SingleRecipeOptions,
  recipeNumber: number,
  maxAttempts = 2
): Promise<Recipe> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateSingleRecipe(pantryItems, preferences, options, recipeNumber);
    } catch (error) {
      lastError = error;
      console.log(`Recipe ${recipeNumber} generation attempt ${attempt} failed:`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to generate recipe ${recipeNumber}.`);
}

export async function generateRecipes(
  pantryItems: PantryItem[],
  preferences?: RecipePreferences
): Promise<Recipe[]> {
  if (!pantryItems.length) {
    throw new Error('Add some pantry items before generating recipes.');
  }

  const recipes: Recipe[] = [];

  const recipe1 = await generateSingleRecipeWithRetry(
    pantryItems,
    preferences,
    {
      matchType: 'full',
      excludeTitles: [],
      excludeCuisines: [],
    },
    1
  );
  recipes.push(recipe1);

  const recipe2 = await generateSingleRecipeWithRetry(
    pantryItems,
    preferences,
    {
      matchType: 'full',
      excludeTitles: recipes.map((r) => r.title),
      excludeCuisines: recipes.map((r) => r.cuisine),
    },
    2
  );
  recipes.push(recipe2);

  const recipe3 = await generateSingleRecipeWithRetry(
    pantryItems,
    preferences,
    {
      matchType: 'partial',
      excludeTitles: recipes.map((r) => r.title),
      excludeCuisines: recipes.map((r) => r.cuisine),
    },
    3
  );
  recipes.push(recipe3);

  return recipes;
}

// ─── Shopping List Generation ─────────────────────────────────────────────────

export async function generateShoppingList(
  savedRecipes: { title: string; ingredients: RecipeIngredient[] }[],
  currentPantry: PantryItem[]
): Promise<{ name: string; quantity: string; category: string; recipeName: string }[]> {
  const pantryNames = currentPantry.map((p) => p.name.toLowerCase());

  const missingItems: { name: string; quantity: string; category: string; recipeName: string }[] = [];

  for (const recipe of savedRecipes) {
    for (const ing of recipe.ingredients) {
      if (!ing.inPantry && !pantryNames.includes(ing.name.toLowerCase())) {
        missingItems.push({
          name: ing.name,
          quantity: ing.amount,
          category: categorizeIngredient(ing.name),
          recipeName: recipe.title,
        });
      }
    }
  }

  return missingItems;
}

// Helper to categorize ingredients for shopping list
function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();

  if (['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg'].some((k) => lower.includes(k))) {
    return 'Dairy & Eggs';
  }
  if (['chicken', 'beef', 'pork', 'lamb', 'salmon', 'tuna', 'fish', 'shrimp'].some((k) => lower.includes(k))) {
    return 'Meat & Seafood';
  }
  if (
    [
      'tomato',
      'onion',
      'garlic',
      'spinach',
      'basil',
      'pepper',
      'lettuce',
      'carrot',
      'broccoli',
      'zucchini',
      'mushroom',
      'avocado',
      'lemon',
      'lime',
      'apple',
      'banana',
      'berry',
      'fruit',
      'vegetable',
      'herb',
    ].some((k) => lower.includes(k))
  ) {
    return 'Produce';
  }
  if (['ice cream', 'frozen', 'pea'].some((k) => lower.includes(k))) {
    return 'Frozen';
  }
  if (['bread', 'roll', 'baguette', 'croissant', 'muffin'].some((k) => lower.includes(k))) {
    return 'Bakery';
  }
  if (['flour', 'sugar', 'rice', 'pasta', 'oil', 'vinegar', 'sauce', 'can', 'tin'].some((k) => lower.includes(k))) {
    return 'Pantry';
  }

  return 'Other';
}

// ─── Chef's Tip Generation ────────────────────────────────────────────────────

export async function generateChefTip(ingredient: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `Give me one practical chef's tip about storing or using ${ingredient}. Keep it under 40 words. Be specific and useful. No intro, just the tip.`,
        },
      ],
    }),
  });

  if (!response.ok) return '';

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}
