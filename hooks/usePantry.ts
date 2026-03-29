import { useState, useEffect, useCallback } from 'react';
import { PantryItem, IngredientCategory } from '@/types';
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
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
    await updatePantryItem(itemId, updates);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const removeItem = async (itemId: string) => {
    await deletePantryItem(itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const getByCategory = (category: IngredientCategory) =>
    items.filter((item) => item.category === category);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    refetch: fetchItems,
    getByCategory,
    fridgeItems: getByCategory('fridge'),
    pantryItems: getByCategory('pantry'),
    freezerItems: getByCategory('freezer'),
    spiceItems: getByCategory('spices'),
  };
}
