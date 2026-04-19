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
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { Recipe, SavedRecipe, RecipeRating } from '@/types';
import {
  assertDocumentOwner,
  assertValidDocId,
  assertValidUserId,
  sanitizeComment,
  sanitizeNotes,
  sanitizeRating,
  sanitizeRecipeForStorage,
} from './security';

const SAVED_COLLECTION = 'savedRecipes';
const RATINGS_COLLECTION = 'ratings';

// ─── Saved Recipes (Cookbook) ─────────────────────────────────────────────────

export async function getSavedRecipes(userId: string): Promise<SavedRecipe[]> {
  const safeUserId = assertValidUserId(userId);
  const q = query(collection(db, SAVED_COLLECTION), where('userId', '==', safeUserId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRecipe));
  return items.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function saveRecipe(userId: string, recipe: Recipe): Promise<SavedRecipe> {
  const safeUserId = assertValidUserId(userId);
  const sanitizedRecipe = sanitizeRecipeForStorage(recipe);
  const data = {
    userId: safeUserId,
    recipeId: sanitizedRecipe.id,
    recipe: sanitizedRecipe,
    savedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, SAVED_COLLECTION), data);
  return { id: docRef.id, ...data };
}

export async function removeSavedRecipe(userId: string, savedId: string): Promise<void> {
  await assertDocumentOwner(SAVED_COLLECTION, savedId, userId);
  await deleteDoc(doc(db, SAVED_COLLECTION, assertValidDocId(savedId)));
}

export async function isRecipeSaved(userId: string, recipeId: string): Promise<string | null> {
  const safeUserId = assertValidUserId(userId);
  const q = query(
    collection(db, SAVED_COLLECTION),
    where('userId', '==', safeUserId),
    where('recipeId', '==', recipeId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

// ─── Ratings (with Firestore transaction for accurate avg + count) ─────────────

export interface RatingResult {
  rating: RecipeRating;
  newAverage: number;
  newCount: number;
}

/**
 * Add or update a user's rating for a recipe.
 *
 * Uses a Firestore transaction to:
 *  1. Upsert the rating document
 *  2. Atomically recalculate the average rating and count across ALL ratings
 *  3. Write the new avg + count back to every savedRecipe doc for this recipe
 *     (so the UI always shows current data without extra reads)
 */
export async function addRating(
  userId: string,
  recipeId: string,
  rating: number,
  comment?: string
): Promise<RatingResult> {
  const safeUserId = assertValidUserId(userId);
  const safeRecipeId = assertValidDocId(recipeId);
  const safeRating = sanitizeRating(rating);
  const safeComment = sanitizeComment(comment);

  // Check if user already rated this recipe
  const existingRatingQuery = query(
    collection(db, RATINGS_COLLECTION),
    where('userId', '==', safeUserId),
    where('recipeId', '==', safeRecipeId)
  );
  const existingSnap = await getDocs(existingRatingQuery);

  // Fetch all existing ratings for this recipe (to compute new average)
  const allRatingsQuery = query(
    collection(db, RATINGS_COLLECTION),
    where('recipeId', '==', safeRecipeId)
  );
  const allRatingsSnap = await getDocs(allRatingsQuery);
  const allRatings = allRatingsSnap.docs.map((d) => d.data() as RecipeRating);

  // Fetch saved recipe docs that need their rating fields updated
  const savedQuery = query(
    collection(db, SAVED_COLLECTION),
    where('recipeId', '==', safeRecipeId)
  );
  const savedSnap = await getDocs(savedQuery);

  let ratingDocRef: ReturnType<typeof doc> | null = null;
  let ratingData: Omit<RecipeRating, 'id'>;
  let newAverage: number;
  let newCount: number;

  if (!existingSnap.empty) {
    // Update existing rating
    ratingDocRef = doc(db, RATINGS_COLLECTION, existingSnap.docs[0].id);
    const oldRating = existingSnap.docs[0].data().rating as number;

    // Recalculate: replace old rating value with new one
    const totalWithoutOld = allRatings.reduce((sum, r) => sum + r.rating, 0) - oldRating;
    newCount = allRatings.length; // count stays the same
    newAverage = (totalWithoutOld + safeRating) / newCount;

    ratingData = {
      recipeId: safeRecipeId,
      userId: safeUserId,
      rating: safeRating,
      comment: safeComment,
      createdAt: existingSnap.docs[0].data().createdAt as string,
    };
  } else {
    // New rating
    ratingDocRef = doc(collection(db, RATINGS_COLLECTION));
    const totalExisting = allRatings.reduce((sum, r) => sum + r.rating, 0);
    newCount = allRatings.length + 1;
    newAverage = (totalExisting + safeRating) / newCount;

    ratingData = {
      recipeId: safeRecipeId,
      userId: safeUserId,
      rating: safeRating,
      comment: safeComment,
      createdAt: new Date().toISOString(),
    };
  }

  // Round average to 1 decimal place
  newAverage = Math.round(newAverage * 10) / 10;

  // Run everything as a transaction
  await runTransaction(db, async (transaction) => {
    // Write/update the rating
    transaction.set(ratingDocRef!, ratingData);

    // Update all saved recipe documents for this recipe
    for (const savedDoc of savedSnap.docs) {
      const savedRef = doc(db, SAVED_COLLECTION, savedDoc.id);
      transaction.update(savedRef, {
        'recipe.rating': newAverage,
        'recipe.ratingCount': newCount,
      });
    }
  });

  const savedRating: RecipeRating = {
    id: ratingDocRef.id,
    ...ratingData,
  };

  return { rating: savedRating, newAverage, newCount };
}

export async function getRecipeRatings(recipeId: string): Promise<RecipeRating[]> {
  const safeRecipeId = assertValidDocId(recipeId);
  const q = query(
    collection(db, RATINGS_COLLECTION),
    where('recipeId', '==', safeRecipeId)
  );
  const snap = await getDocs(q);
  const ratings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecipeRating));
  return ratings.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getUserRating(userId: string, recipeId: string): Promise<RecipeRating | null> {
  const safeUserId = assertValidUserId(userId);
  const safeRecipeId = assertValidDocId(recipeId);
  const q = query(
    collection(db, RATINGS_COLLECTION),
    where('userId', '==', safeUserId),
    where('recipeId', '==', safeRecipeId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as RecipeRating);
}

// ─── User Notes on saved recipes ─────────────────────────────────────────────

export async function updateSavedRecipeNotes(
  userId: string,
  savedId: string,
  notes: string,
  userRating?: number,
  userComment?: string
): Promise<void> {
  await assertDocumentOwner(SAVED_COLLECTION, savedId, userId);
  await updateDoc(doc(db, SAVED_COLLECTION, assertValidDocId(savedId)), {
    notes: sanitizeNotes(notes),
    userRating: userRating == null ? undefined : sanitizeRating(userRating),
    userComment: sanitizeComment(userComment),
  });
}
