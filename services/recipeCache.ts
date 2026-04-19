/**
 * Recipe Cache Service
 * Persists the last AI-generated recipe set to AsyncStorage
 * so recipes survive app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '@/types';
import { assertValidUserId } from './security';

function getCacheKey(userId?: string): string {
  return userId ? `pantrychef_generated_recipes_${assertValidUserId(userId)}` : 'pantrychef_generated_recipes';
}

export interface RecipeCacheEntry {
  recipes: Recipe[];
  generatedAt: string; // ISO date string
  pantryHash: string;  // simple hash of pantry item names — used to detect stale cache
}

/** Build a lightweight hash of pantry item names for staleness detection */
export function buildPantryHash(pantryItemNames: string[]): string {
  return pantryItemNames.slice().sort().join('|');
}

export async function getCachedRecipes(userId?: string): Promise<RecipeCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(userId));
    return raw ? (JSON.parse(raw) as RecipeCacheEntry) : null;
  } catch {
    return null;
  }
}

export async function cacheRecipes(
  recipes: Recipe[],
  pantryItemNames: string[],
  userId?: string
): Promise<void> {
  try {
    const entry: RecipeCacheEntry = {
      recipes,
      generatedAt: new Date().toISOString(),
      pantryHash: buildPantryHash(pantryItemNames),
    };
    await AsyncStorage.setItem(getCacheKey(userId), JSON.stringify(entry));
  } catch (err) {
    console.warn('Could not cache recipes:', err);
  }
}

export async function clearRecipeCache(userId?: string): Promise<void> {
  await AsyncStorage.removeItem(getCacheKey(userId));
}

/** Returns a human-readable "X minutes ago" / "X hours ago" string */
export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
