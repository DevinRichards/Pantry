import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingItem, ShoppingCategory } from '@/types';
import {
  getShoppingLists,
  createShoppingList,
  addItemToList,
  toggleItemChecked,
  removeItemFromList,
  clearCheckedItems,
} from '@/services/shoppingService';

// Normalised item shape the UI expects
export interface ShoppingUIItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  done: boolean;
  forRecipe?: string;
}

function toUI(item: ShoppingItem): ShoppingUIItem {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    done: item.isChecked,
    forRecipe: item.recipeName,
  };
}

export function useShoppingList(userId: string | null) {
  const [rawItems, setRawItems] = useState<ShoppingItem[]>([]);
  const [listId, setListId]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const fetchList = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const lists = await getShoppingLists(userId);
      let list = lists[0];
      if (!list) list = await createShoppingList(userId);
      setListId(list.id);
      setRawItems(list.items);
    } catch (e) {
      console.error('useShoppingList fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const items: ShoppingUIItem[] = useMemo(() => rawItems.map(toUI), [rawItems]);

  const addItem = async ({
    name, quantity, category,
  }: { name: string; quantity: string; category: string }) => {
    if (!listId || !userId) return;
    const updated = await addItemToList(userId, listId, rawItems, {
      name,
      quantity,
      category: category as ShoppingCategory,
      isChecked: false,
    });
    setRawItems(updated);
  };

  const toggleItem = async (id: string) => {
    if (!listId || !userId) return;
    const updated = await toggleItemChecked(userId, listId, rawItems, id);
    setRawItems(updated);
  };

  const removeItem = async (id: string) => {
    if (!listId || !userId) return;
    const updated = await removeItemFromList(userId, listId, rawItems, id);
    setRawItems(updated);
  };

  const clearChecked = async () => {
    if (!listId || !userId) return;
    const updated = await clearCheckedItems(userId, listId, rawItems);
    setRawItems(updated);
  };

  return { items, loading, addItem, toggleItem, removeItem, clearChecked, refetch: fetchList };
}
