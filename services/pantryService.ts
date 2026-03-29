import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { PantryItem, DetectedIngredient, Recipe } from '@/types';

const COLLECTION = 'pantryItems';

export type PantryUpdateResult = {
  updatedItems: number;
  removedItems: number;
  skippedIngredients: string[];
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getPantryItems(userId: string): Promise<PantryItem[]> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);

  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as PantryItem[];

  return items.sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}

export async function addPantryItem(
  userId: string,
  item: Omit<PantryItem, 'id' | 'addedAt'>
): Promise<PantryItem> {
  const addedAt = new Date().toISOString();

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...item,
    userId,
    addedAt,
  });

  return {
    id: docRef.id,
    ...item,
    addedAt,
  };
}

export async function updatePantryItem(
  itemId: string,
  updates: Partial<Omit<PantryItem, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, itemId), { ...updates });
}

export async function deletePantryItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, itemId));
}

// ─── Bulk add from scan ───────────────────────────────────────────────────────

export async function addDetectedIngredients(
  userId: string,
  detected: DetectedIngredient[]
): Promise<PantryItem[]> {
  const added: PantryItem[] = [];

  for (const item of detected) {
    const pantryItem: Omit<PantryItem, 'id' | 'addedAt'> = {
      name: item.name,
      quantity: item.quantity ?? 'Unknown amount',
      category: item.category,
      icon: item.icon,
    };

    const newItem = await addPantryItem(userId, pantryItem);
    added.push(newItem);
  }

  return added;
}

// ─── Check ingredient availability for recipes ────────────────────────────────

export function checkIngredientAvailability(
  requiredIngredients: string[],
  pantryItems: PantryItem[]
): { available: string[]; missing: string[] } {
  const pantryNames = pantryItems.map((p) => p.name.toLowerCase());

  const available: string[] = [];
  const missing: string[] = [];

  for (const ingredient of requiredIngredients) {
    const found = pantryNames.some(
      (p) =>
        p.includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(p)
    );

    if (found) {
      available.push(ingredient);
    } else {
      missing.push(ingredient);
    }
  }

  return { available, missing };
}

// ─── Pantry updates after cooking ─────────────────────────────────────────────

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;

  const cleaned = unit.toLowerCase().trim();

  const unitMap: Record<string, string> = {
    pound: 'lb',
    pounds: 'lb',
    lb: 'lb',
    lbs: 'lb',
    ounce: 'oz',
    ounces: 'oz',
    oz: 'oz',
    gram: 'g',
    grams: 'g',
    g: 'g',
    kilogram: 'kg',
    kilograms: 'kg',
    kg: 'kg',
    milliliter: 'ml',
    milliliters: 'ml',
    ml: 'ml',
    liter: 'l',
    liters: 'l',
    l: 'l',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    tsp: 'tsp',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    tbsp: 'tbsp',
    cup: 'cup',
    cups: 'cup',
    can: 'can',
    cans: 'can',
    jar: 'jar',
    jars: 'jar',
    package: 'package',
    packages: 'package',
    box: 'box',
    boxes: 'box',
    slice: 'slice',
    slices: 'slice',
    piece: 'piece',
    pieces: 'piece',
    clove: 'clove',
    cloves: 'clove',
    egg: 'egg',
    eggs: 'egg',
    container: 'container',
    containers: 'container',
  };

  return unitMap[cleaned] ?? cleaned;
}

function parseQuantity(quantity: string | undefined): { value: number | null; unit: string | null } {
  if (!quantity) return { value: null, unit: null };

  const trimmed = quantity.trim().toLowerCase();

  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    const value = denominator !== 0 ? numerator / denominator : null;
    const unitPart = trimmed.replace(fractionMatch[0], '').trim();
    return { value, unit: normalizeUnit(unitPart || null) };
  }

  const mixedFractionMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);
    const value = denominator !== 0 ? whole + numerator / denominator : null;
    const unitPart = trimmed.replace(mixedFractionMatch[0], '').trim();
    return { value, unit: normalizeUnit(unitPart || null) };
  }

  const numericMatch = trimmed.match(/^(\d+(\.\d+)?)/);
  if (!numericMatch) return { value: null, unit: null };

  const value = Number(numericMatch[1]);
  const unitPart = trimmed.replace(numericMatch[0], '').trim();

  return {
    value: Number.isFinite(value) ? value : null,
    unit: normalizeUnit(unitPart || null),
  };
}

function formatQuantity(value: number, unit: string | null): string {
  const rounded =
    Math.abs(value - Math.round(value)) < 0.001
      ? `${Math.round(value)}`
      : `${Number(value.toFixed(2))}`;

  return unit ? `${rounded} ${unit}` : rounded;
}

function unitsCompatible(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  return a === b;
}

function isProbablySameIngredient(recipeIngredientName: string, pantryItemName: string): boolean {
  const recipeName = normalizeText(recipeIngredientName);
  const pantryName = normalizeText(pantryItemName);

  return (
    recipeName === pantryName ||
    recipeName.includes(pantryName) ||
    pantryName.includes(recipeName)
  );
}

function findBestPantryMatch(ingredientName: string, pantryItems: PantryItem[]): PantryItem | null {
  const exact = pantryItems.find((item) =>
    normalizeText(item.name) === normalizeText(ingredientName)
  );
  if (exact) return exact;

  const partial = pantryItems.find((item) =>
    isProbablySameIngredient(ingredientName, item.name)
  );

  return partial ?? null;
}

export async function updatePantryAfterCooking(
  userId: string,
  recipe: Recipe
): Promise<PantryUpdateResult> {
  const pantryItems = await getPantryItems(userId);

  let updatedItems = 0;
  let removedItems = 0;
  const skippedIngredients: string[] = [];

  for (const ingredient of recipe.ingredients) {
    if (!ingredient.inPantry) continue;

    const pantryItem = findBestPantryMatch(ingredient.name, pantryItems);
    if (!pantryItem) {
      skippedIngredients.push(ingredient.name);
      continue;
    }

    const pantryParsed =
      pantryItem.amount != null
        ? { value: pantryItem.amount, unit: normalizeUnit(pantryItem.unit ?? null) }
        : parseQuantity(pantryItem.quantity);

    const recipeParsed = parseQuantity(ingredient.amount);

    if (
      pantryParsed.value == null ||
      recipeParsed.value == null ||
      !unitsCompatible(pantryParsed.unit, recipeParsed.unit)
    ) {
      skippedIngredients.push(ingredient.name);
      continue;
    }

    const remaining = pantryParsed.value - recipeParsed.value;

    if (remaining <= 0) {
      await deletePantryItem(pantryItem.id);
      removedItems += 1;

      const index = pantryItems.findIndex((item) => item.id === pantryItem.id);
      if (index >= 0) pantryItems.splice(index, 1);
      continue;
    }

    const normalizedUnit = pantryParsed.unit ?? normalizeUnit(pantryItem.unit ?? null);

    await updatePantryItem(pantryItem.id, {
      amount: remaining,
      unit: normalizedUnit ?? pantryItem.unit,
      quantity: formatQuantity(remaining, normalizedUnit),
    });

    updatedItems += 1;

    const localItem = pantryItems.find((item) => item.id === pantryItem.id);
    if (localItem) {
      localItem.amount = remaining;
      localItem.unit = normalizedUnit ?? localItem.unit;
      localItem.quantity = formatQuantity(remaining, normalizedUnit);
    }
  }

  return {
    updatedItems,
    removedItems,
    skippedIngredients,
  };
}
