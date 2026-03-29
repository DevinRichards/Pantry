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
import { ShoppingItem, ShoppingList, ShoppingCategory } from '@/types';

// ─── Shopping Lists ───────────────────────────────────────────────────────────

export async function getShoppingLists(userId: string): Promise<ShoppingList[]> {
  const q = query(
    collection(db, 'shoppingLists'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingList));
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function createShoppingList(
  userId: string,
  name: string = 'Shopping List'
): Promise<ShoppingList> {
  const now = new Date().toISOString();
  const data = {
    userId,
    name,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'shoppingLists'), data);
  return { id: docRef.id, ...data };
}

export async function addItemToList(
  listId: string,
  items: ShoppingItem[],
  newItem: Omit<ShoppingItem, 'id' | 'addedAt'>
): Promise<ShoppingItem[]> {
  const item: ShoppingItem = {
    ...newItem,
    id: `item_${Date.now()}`,
    addedAt: new Date().toISOString(),
  };
  const updated = [...items, item];
  await updateDoc(doc(db, 'shoppingLists', listId), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function toggleItemChecked(
  listId: string,
  items: ShoppingItem[],
  itemId: string
): Promise<ShoppingItem[]> {
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
  );
  await updateDoc(doc(db, 'shoppingLists', listId), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function removeItemFromList(
  listId: string,
  items: ShoppingItem[],
  itemId: string
): Promise<ShoppingItem[]> {
  const updated = items.filter((item) => item.id !== itemId);
  await updateDoc(doc(db, 'shoppingLists', listId), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function clearCheckedItems(
  listId: string,
  items: ShoppingItem[]
): Promise<ShoppingItem[]> {
  const updated = items.filter((item) => !item.isChecked);
  await updateDoc(doc(db, 'shoppingLists', listId), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function addRecipeToShoppingList(
  listId: string,
  currentItems: ShoppingItem[],
  missingIngredients: { name: string; quantity: string; category: string; recipeName: string }[]
): Promise<ShoppingItem[]> {
  const newItems: ShoppingItem[] = missingIngredients.map((ing) => ({
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: ing.name,
    quantity: ing.quantity,
    category: ing.category as ShoppingCategory,
    isChecked: false,
    recipeName: ing.recipeName,
    addedAt: new Date().toISOString(),
  }));

  // Avoid duplicate items
  const existingNames = currentItems.map((i) => i.name.toLowerCase());
  const toAdd = newItems.filter(
    (item) => !existingNames.includes(item.name.toLowerCase())
  );

  const updated = [...currentItems, ...toAdd];
  await updateDoc(doc(db, 'shoppingLists', listId), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}
