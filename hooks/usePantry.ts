import { useState, useEffect, useCallback, useMemo } from 'react';
import { PantryItem, IngredientCategory } from '@/types';
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  deletePantryItems,
} from '@/services/pantryService';

export function usePantry(userId: string | null) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getPantryItems(userId);
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pantry');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (item: Omit<PantryItem, 'id' | 'addedAt'>) => {
    if (!userId) return;
    const newItem = await addPantryItem(userId, item);
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = async (itemId: string, updates: Partial<PantryItem>) => {
    if (!userId) return;
    await updatePantryItem(userId, itemId, updates);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const removeItem = async (itemId: string) => {
    if (!userId) return;
    await deletePantryItem(userId, itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const removeItems = async (itemIds: string[]) => {
    if (!userId) return;
    await deletePantryItems(userId, itemIds);
    const idSet = new Set(itemIds);
    setItems((prev) => prev.filter((item) => !idSet.has(item.id)));
  };

  const itemsByCategory = useMemo(() => {
    const grouped: Record<IngredientCategory, PantryItem[]> = {
      fridge: [],
      pantry: [],
      freezer: [],
      spices: [],
      other: [],
    };

    for (const item of items) {
      grouped[item.category].push(item);
    }

    return grouped;
  }, [items]);

  const getByCategory = useCallback(
    (category: IngredientCategory) => itemsByCategory[category],
    [itemsByCategory]
  );

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    removeItems,
    refetch: fetchItems,
    getByCategory,
    fridgeItems: itemsByCategory.fridge,
    pantryItems: itemsByCategory.pantry,
    freezerItems: itemsByCategory.freezer,
    spiceItems: itemsByCategory.spices,
  };
}
