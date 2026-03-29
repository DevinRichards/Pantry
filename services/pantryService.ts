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
import { PantryItem, DetectedIngredient } from '@/types';

const COLLECTION = 'pantryItems';

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function getPantryItems(userId: string): Promise<PantryItem[]> {
  // Single-field query — no composite index needed in Firestore test mode.
  // We sort client-side to avoid requiring a manually created index.
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PantryItem));
  return items.sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}

export async function addPantryItem(
  userId: string,
  item: Omit<PantryItem, 'id' | 'addedAt'>
): Promise<PantryItem> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...item,
    userId,
    addedAt: new Date().toISOString(),
  });
  return { id: docRef.id, ...item, addedAt: new Date().toISOString() };
}

export async function updatePantryItem(
  itemId: string,
  updates: Partial<PantryItem>
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
    const found = pantryNames.some((p) =>
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
