/**
 * Cooked Recipes Service
 * Persists cooked recipe state locally via AsyncStorage.
 * Also stores skipped ingredients for the "Needs Review" pantry section.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CookedRecord, NeedsReviewItem } from '@/types';

const COOKED_KEY = 'pantrychef_cooked_recipes';
const NEEDS_REVIEW_KEY = 'pantrychef_needs_review';

// ─── Cooked Records ───────────────────────────────────────────────────────────

export async function getCookedRecords(): Promise<CookedRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(COOKED_KEY);
    return raw ? (JSON.parse(raw) as CookedRecord[]) : [];
  } catch {
    return [];
  }
}

export async function markRecipeAsCooked(
  recipeId: string,
  recipeTitle: string,
  skippedIngredients: string[] = []
): Promise<void> {
  try {
    const records = await getCookedRecords();
    // Replace if already exists (re-cooked)
    const filtered = records.filter((r) => r.recipeId !== recipeId);
    filtered.unshift({
      recipeId,
      recipeTitle,
      cookedAt: new Date().toISOString(),
      skippedIngredients,
    });
    // Keep only last 100 records
    await AsyncStorage.setItem(COOKED_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch (err) {
    console.warn('Could not save cooked record:', err);
  }
}

export async function isRecipeCooked(recipeId: string): Promise<boolean> {
  const records = await getCookedRecords();
  return records.some((r) => r.recipeId === recipeId);
}

export async function getCookedRecipeIds(): Promise<Set<string>> {
  const records = await getCookedRecords();
  return new Set(records.map((r) => r.recipeId));
}

export async function clearCookedRecords(): Promise<void> {
  await AsyncStorage.removeItem(COOKED_KEY);
}

// ─── Needs Review ─────────────────────────────────────────────────────────────

export async function getNeedsReviewItems(): Promise<NeedsReviewItem[]> {
  try {
    const raw = await AsyncStorage.getItem(NEEDS_REVIEW_KEY);
    return raw ? (JSON.parse(raw) as NeedsReviewItem[]) : [];
  } catch {
    return [];
  }
}

export async function addNeedsReviewItems(
  recipeId: string,
  recipeName: string,
  skippedIngredients: string[]
): Promise<void> {
  if (skippedIngredients.length === 0) return;

  try {
    const existing = await getNeedsReviewItems();
    const newItems: NeedsReviewItem[] = skippedIngredients.map((name, i) => ({
      id: `review_${Date.now()}_${i}`,
      ingredientName: name,
      recipeName,
      recipeId,
      cookedAt: new Date().toISOString(),
      reason: 'no_quantity' as const,
    }));

    const merged = [...newItems, ...existing];
    // Keep only last 50 review items
    await AsyncStorage.setItem(NEEDS_REVIEW_KEY, JSON.stringify(merged.slice(0, 50)));
  } catch (err) {
    console.warn('Could not save needs-review items:', err);
  }
}

export async function dismissNeedsReviewItem(id: string): Promise<NeedsReviewItem[]> {
  try {
    const items = await getNeedsReviewItems();
    const updated = items.filter((i) => i.id !== id);
    await AsyncStorage.setItem(NEEDS_REVIEW_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function clearNeedsReviewItems(): Promise<void> {
  await AsyncStorage.removeItem(NEEDS_REVIEW_KEY);
}
