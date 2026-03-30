/**
 * Spoonacular API Service
 * Used to enrich AI-generated recipes with:
 *  - Real nutrition data (calories, macros, etc.)
 *  - High-quality food photography
 *  - Verified recipe metadata
 *
 * API key is stored in EXPO_PUBLIC_SPOONACULAR_API_KEY.
 * Free tier: 150 points/day (~50 recipe lookups).
 * Docs: https://spoonacular.com/food-api/docs
 */

import { NutritionalInfo } from '@/types';

const BASE_URL = 'https://api.spoonacular.com';

function getApiKey(): string | null {
  return process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;       // e.g. "https://img.spoonacular.com/recipes/715538-312x231.jpg"
  imageType: string;
}

export interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds?: number;
}

export interface SpoonacularNutrition {
  nutrients: SpoonacularNutrient[];
}

export interface SpoonacularRecipeInfo {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  nutrition?: SpoonacularNutrition;
}

export interface EnrichedRecipeData {
  spoonacularId: number;
  imageUrl: string;
  nutrition: NutritionalInfo;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNutrientValue(
  nutrients: SpoonacularNutrient[],
  name: string
): string {
  const n = nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());
  if (!n) return '0g';
  const rounded = Math.round(n.amount);
  return `${rounded}${n.unit === 'kcal' ? '' : n.unit}`;
}

function getNutrientNumber(
  nutrients: SpoonacularNutrient[],
  name: string
): number {
  const n = nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return n ? Math.round(n.amount) : 0;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Search Spoonacular for a recipe by title.
 * Returns the best-matching result, or null if none found / API unavailable.
 */
export async function searchRecipeByTitle(
  title: string
): Promise<SpoonacularSearchResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `${BASE_URL}/recipes/complexSearch?query=${encodeURIComponent(title)}&number=1&apiKey=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`Spoonacular search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const results: SpoonacularSearchResult[] = data.results ?? [];
    return results.length > 0 ? results[0] : null;
  } catch (err) {
    console.warn('Spoonacular search error:', err);
    return null;
  }
}

/**
 * Fetch full recipe info including nutrition for a Spoonacular recipe ID.
 */
export async function getRecipeNutrition(
  recipeId: number
): Promise<SpoonacularRecipeInfo | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `${BASE_URL}/recipes/${recipeId}/information?includeNutrition=true&apiKey=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`Spoonacular info failed: ${res.status}`);
      return null;
    }

    return (await res.json()) as SpoonacularRecipeInfo;
  } catch (err) {
    console.warn('Spoonacular info error:', err);
    return null;
  }
}

/**
 * High-level: search for a recipe by title, then fetch its nutrition and image.
 * Returns null (gracefully) if Spoonacular is unavailable or no match found.
 * All errors are non-fatal — the AI data is used as fallback.
 */
export async function enrichRecipeData(
  title: string
): Promise<EnrichedRecipeData | null> {
  try {
    const searchResult = await searchRecipeByTitle(title);
    if (!searchResult) return null;

    const info = await getRecipeNutrition(searchResult.id);
    if (!info) return null;

    const nutrients = info.nutrition?.nutrients ?? [];

    const calories = getNutrientNumber(nutrients, 'Calories');
    const protein = getNutrientValue(nutrients, 'Protein');
    const carbs = getNutrientValue(nutrients, 'Carbohydrates');
    const fat = getNutrientValue(nutrients, 'Fat');
    const fiber = getNutrientValue(nutrients, 'Fiber');
    const sugar = getNutrientValue(nutrients, 'Sugar');
    const sodium = getNutrientValue(nutrients, 'Sodium');

    // Use full-size image instead of thumbnail
    const imageUrl = searchResult.image.replace('-312x231', '-636x393');

    return {
      spoonacularId: searchResult.id,
      imageUrl,
      nutrition: {
        calories: calories || 0,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        dataSource: 'spoonacular',
      },
    };
  } catch (err) {
    console.warn('Spoonacular enrichment error:', err);
    return null;
  }
}
