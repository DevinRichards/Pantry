/**
 * Claude AI Service
 * Handles ingredient detection from photos and AI recipe generation.
 *
 * NOTE: In production, these calls should be proxied through a backend server
 * to keep your API key secure. For development/demo purposes, the key is stored
 * in your .env file and prefixed with EXPO_PUBLIC_.
 */
import { DetectedIngredient, PantryItem, Recipe, RecipeIngredient, RecipeStep } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
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
  const content = data.content[0]?.text ?? '[]';

  // Extract JSON from the response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse ingredient list from AI response');
  }

  return JSON.parse(jsonMatch[0]) as DetectedIngredient[];
}

// ─── Recipe Generation ────────────────────────────────────────────────────────

export async function generateRecipes(
  pantryItems: PantryItem[],
  preferences?: {
    dietaryRestrictions?: string[];
    cuisinePreference?: string;
    maxTime?: number;
    difficulty?: string;
  }
): Promise<Recipe[]> {
  const ingredientList = pantryItems
    .map((item) => `- ${item.name}: ${item.quantity}`)
    .join('\n');

  const prefsText = preferences
    ? `
User preferences:
- Dietary restrictions: ${preferences.dietaryRestrictions?.join(', ') || 'None'}
- Cuisine preference: ${preferences.cuisinePreference || 'Any'}
- Max cooking time: ${preferences.maxTime ? `${preferences.maxTime} minutes` : 'Any'}
- Difficulty: ${preferences.difficulty || 'Any'}
`
    : '';

  const prompt = `You are a professional chef and recipe creator. Based on the ingredients a user has available, generate 6 diverse and delicious recipe suggestions.

Available ingredients:
${ingredientList}
${prefsText}

Create recipes in two categories:
1. FULL MATCH (matchType: "full"): Recipes that can be made with ONLY the available ingredients (matchPercent: 95-100)
2. PARTIAL MATCH (matchType: "partial"): Recipes that need 1-3 additional ingredients (matchPercent: 60-90)

For each recipe, provide detailed, realistic instructions. Search your knowledge for classic and creative recipes.

Return ONLY a valid JSON array with exactly 6 recipes using this structure:
[
  {
    "id": "recipe_1",
    "title": "Recipe Name",
    "description": "Appetizing 1-2 sentence description",
    "prepTime": 10,
    "cookTime": 20,
    "totalTime": 30,
    "servings": 4,
    "difficulty": "Easy|Medium|Intermediate|Expert",
    "cuisine": "Italian|Mexican|etc",
    "tags": ["healthy", "quick", "vegetarian"],
    "ingredients": [
      {
        "name": "Ingredient Name",
        "amount": "400g or 2 cups",
        "inPantry": true,
        "optional": false
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "title": "Step Title",
        "description": "Detailed step instructions.",
        "duration": "5 minutes",
        "tip": "Optional pro tip"
      }
    ],
    "nutrition": {
      "calories": 450,
      "protein": "25g",
      "carbs": "45g",
      "fat": "15g",
      "fiber": "5g"
    },
    "matchType": "full",
    "matchPercent": 100,
    "missingIngredients": [],
    "rating": 4.7,
    "ratingCount": 124,
    "createdAt": "${new Date().toISOString()}",
    "source": "ai-generated",
    "isAiGenerated": true
  }
]

Make the first 2-3 recipes full matches and the remaining partial matches. Be creative and diverse with cuisines and meal types (breakfast, lunch, dinner, snack).`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
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
  const content = data.content[0]?.text ?? '[]';

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse recipes from AI response');
  }

  return JSON.parse(jsonMatch[0]) as Recipe[];
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
  if (['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg'].some(k => lower.includes(k))) {
    return 'Dairy & Eggs';
  }
  if (['chicken', 'beef', 'pork', 'lamb', 'salmon', 'tuna', 'fish', 'shrimp'].some(k => lower.includes(k))) {
    return 'Meat & Seafood';
  }
  if (['tomato', 'onion', 'garlic', 'spinach', 'basil', 'pepper', 'lettuce', 'carrot', 'broccoli', 'zucchini', 'mushroom', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'fruit', 'vegetable', 'herb'].some(k => lower.includes(k))) {
    return 'Produce';
  }
  if (['ice cream', 'frozen', 'pea'].some(k => lower.includes(k))) {
    return 'Frozen';
  }
  if (['bread', 'roll', 'baguette', 'croissant', 'muffin'].some(k => lower.includes(k))) {
    return 'Bakery';
  }
  if (['flour', 'sugar', 'rice', 'pasta', 'oil', 'vinegar', 'sauce', 'can', 'tin'].some(k => lower.includes(k))) {
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
  return data.content[0]?.text ?? '';
}
