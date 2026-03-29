import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Recipe, SavedRecipe, RecipeRating } from '@/types';

// ─── Saved Recipes (Cookbook) ─────────────────────────────────────────────────

export async function getSavedRecipes(userId: string): Promise<SavedRecipe[]> {
  const q = query(
    collection(db, 'savedRecipes'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRecipe));
  return items.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function saveRecipe(
  userId: string,
  recipe: Recipe
): Promise<SavedRecipe> {
  const data = {
    userId,
    recipeId: recipe.id,
    recipe,
    savedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, 'savedRecipes'), data);
  return { id: docRef.id, ...data };
}

export async function removeSavedRecipe(savedId: string): Promise<void> {
  await deleteDoc(doc(db, 'savedRecipes', savedId));
}

export async function isRecipeSaved(
  userId: string,
  recipeId: string
): Promise<string | null> {
  const q = query(
    collection(db, 'savedRecipes'),
    where('userId', '==', userId),
    where('recipeId', '==', recipeId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }
  return null;
}

// ─── Ratings & Comments ───────────────────────────────────────────────────────

export async function addRating(
  userId: string,
  recipeId: string,
  rating: number,
  comment?: string
): Promise<RecipeRating> {
  const data: Omit<RecipeRating, 'id'> = {
    recipeId,
    userId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, 'ratings'), data);
  return { id: docRef.id, ...data };
}

export async function getRecipeRatings(recipeId: string): Promise<RecipeRating[]> {
  const q = query(
    collection(db, 'ratings'),
    where('recipeId', '==', recipeId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecipeRating));
}

export async function getUserRating(
  userId: string,
  recipeId: string
): Promise<RecipeRating | null> {
  const q = query(
    collection(db, 'ratings'),
    where('userId', '==', userId),
    where('recipeId', '==', recipeId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as RecipeRating;
  }
  return null;
}

// ─── User Notes on saved recipes ─────────────────────────────────────────────

export async function updateSavedRecipeNotes(
  savedId: string,
  notes: string,
  userRating?: number,
  userComment?: string
): Promise<void> {
  await updateDoc(doc(db, 'savedRecipes', savedId), {
    notes,
    userRating,
    userComment,
  });
}
