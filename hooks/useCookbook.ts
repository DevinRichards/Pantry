import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '@/types';
import {
  getSavedRecipes,
  saveRecipe,
  removeSavedRecipe,
} from '@/services/recipeService';

// Flat recipe shape for the UI
export interface CookbookRecipe {
  id: string;           // savedRecipe doc id
  recipeId: string;
  title: string;
  imageUrl?: string;
  cookTime?: number;
  difficulty?: string;
  cuisine?: string;
  calories?: number;
  missingIngredients?: string[];
  savedAt?: string;
}

function toCookbookRecipe(saved: Awaited<ReturnType<typeof getSavedRecipes>>[number]): CookbookRecipe {
  return {
    id: saved.id,
    recipeId: saved.recipeId,
    title: saved.recipe.title,
    imageUrl: saved.recipe.imageUrl,
    cookTime: saved.recipe.cookTime,
    difficulty: saved.recipe.difficulty,
    cuisine: saved.recipe.cuisine,
    calories: saved.recipe.nutrition?.calories,
    missingIngredients: saved.recipe.missingIngredients,
    savedAt: saved.savedAt,
  };
}

export function useCookbook(userId: string | null) {
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecipes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const saved = await getSavedRecipes(userId);
      setRecipes(saved.map(toCookbookRecipe));
    } catch (e) {
      console.error('useCookbook fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const addRecipe = async (recipe: Recipe) => {
    if (!userId) return;
    const saved = await saveRecipe(userId, recipe);
    setRecipes(prev => [toCookbookRecipe(saved), ...prev]);
  };

  const removeRecipe = async (savedId: string) => {
    if (!userId) return;
    await removeSavedRecipe(userId, savedId);
    setRecipes(prev => prev.filter(r => r.id !== savedId));
  };

  return { recipes, loading, addRecipe, removeRecipe, refetch: fetchRecipes };
}
