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
import {
  assertDocumentOwner,
  assertValidDocId,
  assertValidUserId,
  sanitizeShoppingItemInput,
  sanitizeSingleLineText,
} from './security';

// ─── Shopping Lists ───────────────────────────────────────────────────────────

export async function getShoppingLists(userId: string): Promise<ShoppingList[]> {
  const safeUserId = assertValidUserId(userId);
  const q = query(
    collection(db, 'shoppingLists'),
    where('userId', '==', safeUserId)
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
  const safeUserId = assertValidUserId(userId);
  const now = new Date().toISOString();
  const data = {
    userId: safeUserId,
    name: sanitizeSingleLineText(name, 80) || 'Shopping List',
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'shoppingLists'), data);
  return { id: docRef.id, ...data };
}

export async function addItemToList(
  userId: string,
  listId: string,
  items: ShoppingItem[],
  newItem: Omit<ShoppingItem, 'id' | 'addedAt'>
): Promise<ShoppingItem[]> {
  await assertDocumentOwner('shoppingLists', listId, userId);
  const sanitizedNewItem = sanitizeShoppingItemInput(newItem);
  const item: ShoppingItem = {
    ...sanitizedNewItem,
    id: `item_${Date.now()}`,
    addedAt: new Date().toISOString(),
  };
  const updated = [...items, item];
  await updateDoc(doc(db, 'shoppingLists', assertValidDocId(listId)), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function toggleItemChecked(
  userId: string,
  listId: string,
  items: ShoppingItem[],
  itemId: string
): Promise<ShoppingItem[]> {
  await assertDocumentOwner('shoppingLists', listId, userId);
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
  );
  await updateDoc(doc(db, 'shoppingLists', assertValidDocId(listId)), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function removeItemFromList(
  userId: string,
  listId: string,
  items: ShoppingItem[],
  itemId: string
): Promise<ShoppingItem[]> {
  await assertDocumentOwner('shoppingLists', listId, userId);
  const updated = items.filter((item) => item.id !== itemId);
  await updateDoc(doc(db, 'shoppingLists', assertValidDocId(listId)), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function clearCheckedItems(
  userId: string,
  listId: string,
  items: ShoppingItem[]
): Promise<ShoppingItem[]> {
  await assertDocumentOwner('shoppingLists', listId, userId);
  const updated = items.filter((item) => !item.isChecked);
  await updateDoc(doc(db, 'shoppingLists', assertValidDocId(listId)), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function addRecipeToShoppingList(
  userId: string,
  listId: string,
  currentItems: ShoppingItem[],
  missingIngredients: { name: string; quantity: string; category: string; recipeName: string }[]
): Promise<ShoppingItem[]> {
  await assertDocumentOwner('shoppingLists', listId, userId);
  const newItems: ShoppingItem[] = missingIngredients.map((ing, index) => {
    const sanitized = sanitizeShoppingItemInput({
      name: ing.name,
      quantity: ing.quantity,
      category: ing.category as ShoppingCategory,
      isChecked: false,
      recipeName: ing.recipeName,
    });

    return {
      ...sanitized,
      id: `item_${Date.now()}_${index}`,
      addedAt: new Date().toISOString(),
    };
  });

  // Avoid duplicate items
  const existingNames = currentItems.map((i) => i.name.toLowerCase());
  const toAdd = newItems.filter(
    (item) => !existingNames.includes(item.name.toLowerCase())
  );

  const updated = [...currentItems, ...toAdd];
  await updateDoc(doc(db, 'shoppingLists', assertValidDocId(listId)), {
    items: updated,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}
