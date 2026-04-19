import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  DetectedIngredient,
  IngredientCategory,
  PantryItem,
  Recipe,
  ShoppingCategory,
  ShoppingItem,
} from '@/types';

const MAX_NAME_LENGTH = 80;
const MAX_QUANTITY_LENGTH = 40;
const MAX_COMMENT_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;
const MAX_DETECTED_ITEMS = 50;
const MAX_RECIPE_ITEMS = 25;

const INGREDIENT_CATEGORIES: IngredientCategory[] = ['fridge', 'pantry', 'freezer', 'spices', 'other'];
const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Bakery',
  'Beverages',
  'Snacks',
  'Other',
];

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function sanitizeSingleLineText(value: string, maxLength: number): string {
  return normalizeWhitespace(stripControlChars(value)).slice(0, maxLength);
}

export function sanitizeMultilineText(value: string, maxLength: number): string {
  return stripControlChars(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .join('\n')
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(email: string): string {
  return sanitizeSingleLineText(email.toLowerCase(), 320);
}

export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
}

export function validateDisplayName(displayName: string): string {
  const sanitized = sanitizeSingleLineText(displayName, 60);
  if (!sanitized) {
    throw new Error('Display name is required.');
  }
  return sanitized;
}

export function assertValidUserId(userId: string): string {
  const normalized = sanitizeSingleLineText(userId, 128);
  if (!normalized) {
    throw new Error('You must be signed in to continue.');
  }
  return normalized;
}

export function assertValidDocId(docId: string): string {
  const normalized = docId.trim();
  if (!normalized || normalized.includes('/') || normalized.length > 200) {
    throw new Error('Invalid record identifier.');
  }
  return normalized;
}

export async function assertDocumentOwner(
  collectionName: string,
  docId: string,
  userId: string
): Promise<void> {
  const safeDocId = assertValidDocId(docId);
  const safeUserId = assertValidUserId(userId);
  const snap = await getDoc(doc(db, collectionName, safeDocId));

  if (!snap.exists()) {
    throw new Error('Record not found.');
  }

  const data = snap.data();
  if (data.userId !== safeUserId) {
    throw new Error('You do not have access to this record.');
  }
}

function sanitizeIngredientCategory(category: string): IngredientCategory {
  return INGREDIENT_CATEGORIES.includes(category as IngredientCategory)
    ? (category as IngredientCategory)
    : 'other';
}

function sanitizeShoppingCategory(category: string): ShoppingCategory {
  return SHOPPING_CATEGORIES.includes(category as ShoppingCategory)
    ? (category as ShoppingCategory)
    : 'Other';
}

export function sanitizePantryItemInput(
  item: Omit<PantryItem, 'id' | 'addedAt'>
): Omit<PantryItem, 'id' | 'addedAt'> {
  const name = sanitizeSingleLineText(item.name, MAX_NAME_LENGTH);
  if (!name) {
    throw new Error('Item name is required.');
  }

  return omitUndefined({
    ...item,
    name,
    quantity: sanitizeSingleLineText(item.quantity || '1 item', MAX_QUANTITY_LENGTH) || '1 item',
    category: sanitizeIngredientCategory(item.category),
    icon: item.icon ? sanitizeSingleLineText(item.icon, 40) : undefined,
    unit: item.unit ? sanitizeSingleLineText(item.unit, 20) : undefined,
    imageUri: item.imageUri ? sanitizeSingleLineText(item.imageUri, 2048) : undefined,
  }) as Omit<PantryItem, 'id' | 'addedAt'>;
}

export function sanitizePantryItemUpdates(
  updates: Partial<Omit<PantryItem, 'id' | 'addedAt'>>
): Partial<Omit<PantryItem, 'id' | 'addedAt'>> {
  const sanitized: Partial<Omit<PantryItem, 'id' | 'addedAt'>> = {};

  if (updates.name !== undefined) {
    const name = sanitizeSingleLineText(updates.name, MAX_NAME_LENGTH);
    if (!name) throw new Error('Item name is required.');
    sanitized.name = name;
  }
  if (updates.quantity !== undefined) {
    sanitized.quantity =
      sanitizeSingleLineText(updates.quantity, MAX_QUANTITY_LENGTH) || '1 item';
  }
  if (updates.category !== undefined) {
    sanitized.category = sanitizeIngredientCategory(updates.category);
  }
  if (updates.icon !== undefined) {
    sanitized.icon = updates.icon ? sanitizeSingleLineText(updates.icon, 40) : undefined;
  }
  if (updates.unit !== undefined) {
    sanitized.unit = updates.unit ? sanitizeSingleLineText(updates.unit, 20) : undefined;
  }
  if (updates.imageUri !== undefined) {
    sanitized.imageUri = updates.imageUri
      ? sanitizeSingleLineText(updates.imageUri, 2048)
      : undefined;
  }
  if (updates.expiryDate !== undefined) {
    sanitized.expiryDate = updates.expiryDate ? sanitizeSingleLineText(updates.expiryDate, 40) : undefined;
  }
  if (updates.amount !== undefined) {
    sanitized.amount = typeof updates.amount === 'number' && Number.isFinite(updates.amount)
      ? Math.max(0, updates.amount)
      : undefined;
  }
  if (updates.maxAmount !== undefined) {
    sanitized.maxAmount = typeof updates.maxAmount === 'number' && Number.isFinite(updates.maxAmount)
      ? Math.max(0, updates.maxAmount)
      : undefined;
  }
  if (updates.isLow !== undefined) sanitized.isLow = !!updates.isLow;
  if (updates.isOrganic !== undefined) sanitized.isOrganic = !!updates.isOrganic;

  return omitUndefined(sanitized) as Partial<Omit<PantryItem, 'id' | 'addedAt'>>;
}

export function sanitizeDetectedIngredients(detected: DetectedIngredient[]): DetectedIngredient[] {
  const seen = new Set<string>();

  return detected
    .slice(0, MAX_DETECTED_ITEMS)
    .map((item) => ({
      name: sanitizeSingleLineText(item.name, MAX_NAME_LENGTH),
      quantity: item.quantity ? sanitizeSingleLineText(item.quantity, MAX_QUANTITY_LENGTH) : undefined,
      category: sanitizeIngredientCategory(item.category),
      confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
      icon: item.icon ? sanitizeSingleLineText(item.icon, 40) : undefined,
    }))
    .filter((item) => {
      if (!item.name) return false;
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function sanitizeShoppingItemInput(
  item: Omit<ShoppingItem, 'id' | 'addedAt'>
): Omit<ShoppingItem, 'id' | 'addedAt'> {
  const name = sanitizeSingleLineText(item.name, MAX_NAME_LENGTH);
  if (!name) {
    throw new Error('Shopping item name is required.');
  }

  return omitUndefined({
    ...item,
    name,
    quantity: sanitizeSingleLineText(item.quantity || '1 item', MAX_QUANTITY_LENGTH) || '1 item',
    category: sanitizeShoppingCategory(item.category),
    recipeId: item.recipeId ? sanitizeSingleLineText(item.recipeId, 200) : undefined,
    recipeName: item.recipeName ? sanitizeSingleLineText(item.recipeName, MAX_NAME_LENGTH) : undefined,
  }) as Omit<ShoppingItem, 'id' | 'addedAt'>;
}

export function sanitizeRating(rating: number): number {
  const normalized = Math.round(Number(rating));
  if (!Number.isFinite(normalized) || normalized < 1 || normalized > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }
  return normalized;
}

export function sanitizeComment(comment?: string): string | undefined {
  if (!comment) return undefined;
  const sanitized = sanitizeMultilineText(comment, MAX_COMMENT_LENGTH);
  return sanitized || undefined;
}

export function sanitizeNotes(notes: string): string {
  return sanitizeMultilineText(notes, MAX_NOTES_LENGTH);
}

export function sanitizeRecipeForStorage(recipe: Recipe): Recipe {
  return {
    ...recipe,
    title: sanitizeSingleLineText(recipe.title, 120) || 'Untitled Recipe',
    description: sanitizeMultilineText(recipe.description || '', 400),
    cuisine: recipe.cuisine ? sanitizeSingleLineText(recipe.cuisine, 60) : undefined,
    tags: Array.isArray(recipe.tags)
      ? recipe.tags
          .map((tag) => sanitizeSingleLineText(tag, 30))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    missingIngredients: Array.isArray(recipe.missingIngredients)
      ? recipe.missingIngredients
          .map((item) => sanitizeSingleLineText(item, MAX_NAME_LENGTH))
          .filter(Boolean)
          .slice(0, MAX_RECIPE_ITEMS)
      : [],
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.slice(0, MAX_RECIPE_ITEMS).map((ingredient) => ({
          ...ingredient,
          name: sanitizeSingleLineText(ingredient.name, MAX_NAME_LENGTH) || 'Ingredient',
          amount: sanitizeSingleLineText(ingredient.amount, MAX_QUANTITY_LENGTH) || '1 item',
        }))
      : [],
    steps: Array.isArray(recipe.steps)
      ? recipe.steps.slice(0, 20).map((step, index) => ({
          ...step,
          stepNumber: typeof step.stepNumber === 'number' ? step.stepNumber : index + 1,
          title: sanitizeSingleLineText(step.title || `Step ${index + 1}`, 80),
          description: sanitizeMultilineText(step.description || '', 240),
          duration: step.duration ? sanitizeSingleLineText(step.duration, 40) : undefined,
          tip: step.tip ? sanitizeMultilineText(step.tip, 160) : undefined,
        }))
      : [],
  };
}
