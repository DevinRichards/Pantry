// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
}

// ─── Pantry ───────────────────────────────────────────────────────────────────
export type IngredientCategory =
  | 'fridge'
  | 'pantry'
  | 'freezer'
  | 'spices'
  | 'other';

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;       // e.g. "6 eggs", "500g", "2 cans"
  amount?: number;        // numeric amount for progress bars
  maxAmount?: number;     // max for progress display
  unit?: string;          // "g", "ml", "pieces", etc.
  category: IngredientCategory;
  expiryDate?: string;    // ISO date string
  addedAt: string;        // ISO date string
  icon?: string;          // Material Symbol name
  isLow?: boolean;
  isOrganic?: boolean;
  imageUri?: string;
}

// ─── Needs Review (skipped pantry adjustments after cooking) ──────────────────
export interface NeedsReviewItem {
  id: string;
  ingredientName: string;
  recipeName: string;
  recipeId: string;
  cookedAt: string;       // ISO date string
  reason: 'no_match' | 'unit_mismatch' | 'no_quantity';
}

// ─── Recipes ──────────────────────────────────────────────────────────────────
export type DifficultyLevel = 'Easy' | 'Medium' | 'Intermediate' | 'Expert';
export type RecipeMatch = 'full' | 'partial';
export type RecipeStatus = 'active' | 'cooked' | 'skipped';

export interface RecipeIngredient {
  name: string;
  amount: string;        // "400g", "2 cups", etc.
  inPantry: boolean;
  optional?: boolean;
}

export interface RecipeStep {
  stepNumber: number;
  title: string;
  description: string;
  duration?: string;     // "5 minutes"
  tip?: string;
}

export interface NutritionalInfo {
  calories: number;
  protein: string;       // "25g"
  carbs: string;
  fat: string;
  fiber?: string;
  // Spoonacular-enriched fields
  sugar?: string;
  sodium?: string;
  dataSource?: 'ai' | 'spoonacular';
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  prepTime: number;      // minutes
  cookTime: number;      // minutes
  totalTime: number;
  servings: number;
  difficulty: DifficultyLevel;
  cuisine?: string;
  tags?: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition?: NutritionalInfo;
  matchType: RecipeMatch;
  matchPercent: number;  // 0–100
  missingIngredients: string[];
  rating?: number;       // 1–5
  ratingCount?: number;
  createdAt: string;
  source?: 'ai-generated' | 'internet';
  isAiGenerated?: boolean;
  // Status tracking
  status?: RecipeStatus;
  cookedAt?: string;     // ISO date string, set when user completes cooking
  spoonacularId?: number; // Spoonacular recipe ID if enriched
}

// ─── Saved / Cookbook ─────────────────────────────────────────────────────────
export interface SavedRecipe {
  id: string;
  recipeId: string;
  recipe: Recipe;
  savedAt: string;
  userRating?: number;
  userComment?: string;
  notes?: string;
}

// ─── Rating ───────────────────────────────────────────────────────────────────
export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;        // 1–5
  comment?: string;
  createdAt: string;
}

// ─── Cooked Record ────────────────────────────────────────────────────────────
export interface CookedRecord {
  recipeId: string;
  recipeTitle: string;
  cookedAt: string;      // ISO date string
  skippedIngredients: string[];
}

// ─── Generation Progress ──────────────────────────────────────────────────────
export interface GenerationProgress {
  step: string;          // human-readable label
  current: number;       // 0-based index
  total: number;
}

// ─── Shopping ─────────────────────────────────────────────────────────────────
export type ShoppingCategory =
  | 'Produce'
  | 'Dairy & Eggs'
  | 'Meat & Seafood'
  | 'Pantry'
  | 'Frozen'
  | 'Bakery'
  | 'Beverages'
  | 'Snacks'
  | 'Other';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  isChecked: boolean;
  recipeId?: string;
  recipeName?: string;
  isUrgent?: boolean;
  addedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────
export interface ScanResult {
  detectedIngredients: DetectedIngredient[];
  confidence: number;
  rawResponse?: string;
}

export interface DetectedIngredient {
  name: string;
  quantity?: string;
  category: IngredientCategory;
  confidence: number;
  icon?: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type RootStackParamList = {
  '(auth)/login': undefined;
  '(auth)/register': undefined;
  '(tabs)': undefined;
  'scan': undefined;
  'recipe/[id]': { id: string; recipe?: string };
};
