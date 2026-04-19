/**
 * Cooked Recipes Service
 * Persists cooked recipe state locally via AsyncStorage.
 * Also stores skipped ingredients for the "Needs Review" pantry section.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CookedRecord, NeedsReviewItem } from '@/types';
import { assertValidUserId, sanitizeSingleLineText } from './security';

function getCookedKey(userId: string) {
  return `pantrychef_cooked_recipes_${assertValidUserId(userId)}`;
}

function getNeedsReviewKey(userId: string) {
  return `pantrychef_needs_review_${assertValidUserId(userId)}`;
}

// ─── Cooked Records ───────────────────────────────────────────────────────────

export async function getCookedRecords(userId: string): Promise<CookedRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(getCookedKey(userId));
    return raw ? (JSON.parse(raw) as CookedRecord[]) : [];
  } catch {
    return [];
  }
}

export async function markRecipeAsCooked(
  userId: string,
  recipeId: string,
  recipeTitle: string,
  skippedIngredients: string[] = []
): Promise<void> {
  try {
    const records = await getCookedRecords(userId);
    // Replace if already exists (re-cooked)
    const filtered = records.filter((r) => r.recipeId !== recipeId);
    filtered.unshift({
      recipeId: sanitizeSingleLineText(recipeId, 200),
      recipeTitle: sanitizeSingleLineText(recipeTitle, 120),
      cookedAt: new Date().toISOString(),
      skippedIngredients: skippedIngredients.map((item) => sanitizeSingleLineText(item, 80)).filter(Boolean),
    });
    // Keep only last 100 records
    await AsyncStorage.setItem(getCookedKey(userId), JSON.stringify(filtered.slice(0, 100)));
  } catch (err) {
    console.warn('Could not save cooked record:', err);
  }
}

export async function isRecipeCooked(userId: string, recipeId: string): Promise<boolean> {
  const records = await getCookedRecords(userId);
  return records.some((r) => r.recipeId === recipeId);
}

export async function getCookedRecipeIds(userId: string): Promise<Set<string>> {
  const records = await getCookedRecords(userId);
  return new Set(records.map((r) => r.recipeId));
}

export async function clearCookedRecords(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getCookedKey(userId));
}

// ─── Needs Review ─────────────────────────────────────────────────────────────

export async function getNeedsReviewItems(userId: string): Promise<NeedsReviewItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getNeedsReviewKey(userId));
    return raw ? (JSON.parse(raw) as NeedsReviewItem[]) : [];
  } catch {
    return [];
  }
}

export async function addNeedsReviewItems(
  userId: string,
  recipeId: string,
  recipeName: string,
  skippedIngredients: string[]
): Promise<void> {
  if (skippedIngredients.length === 0) return;

  try {
    const existing = await getNeedsReviewItems(userId);
    const newItems: NeedsReviewItem[] = skippedIngredients.map((name, i) => ({
      id: `review_${Date.now()}_${i}`,
      ingredientName: sanitizeSingleLineText(name, 80),
      recipeName: sanitizeSingleLineText(recipeName, 120),
      recipeId: sanitizeSingleLineText(recipeId, 200),
      cookedAt: new Date().toISOString(),
      reason: 'no_quantity' as const,
    }));

    const merged = [...newItems, ...existing];
    // Keep only last 50 review items
    await AsyncStorage.setItem(getNeedsReviewKey(userId), JSON.stringify(merged.slice(0, 50)));
  } catch (err) {
    console.warn('Could not save needs-review items:', err);
  }
}

export async function dismissNeedsReviewItem(userId: string, id: string): Promise<NeedsReviewItem[]> {
  try {
    const items = await getNeedsReviewItems(userId);
    const updated = items.filter((i) => i.id !== id);
    await AsyncStorage.setItem(getNeedsReviewKey(userId), JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function clearNeedsReviewItems(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getNeedsReviewKey(userId));
}
