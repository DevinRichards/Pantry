import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInRight,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ZoomIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Recipe } from '@/types';
import { generateRecipes } from '@/services/claude';
import { usePantry } from '@/hooks/usePantry';
import { useAuth } from '@/hooks/useAuth';
import { saveRecipe } from '@/services/recipeService';

const RECIPE_IMAGES: Record<string, string> = {
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  italian: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600',
  salmon: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600',
  pancakes: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600',
  curry: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600',
};

function getRecipeImage(recipe: Recipe): string {
  if (recipe.imageUrl) return recipe.imageUrl;
  const title = recipe.title.toLowerCase();
  if (title.includes('pasta') || title.includes('risotto')) return RECIPE_IMAGES.pasta;
  if (title.includes('salmon') || title.includes('fish')) return RECIPE_IMAGES.salmon;
  if (title.includes('pancake') || title.includes('hotcake')) return RECIPE_IMAGES.pancakes;
  if (title.includes('curry')) return RECIPE_IMAGES.curry;
  if (title.includes('salad') || title.includes('bowl')) return RECIPE_IMAGES.salad;
  return RECIPE_IMAGES.default;
}

// ─── Featured (Large) Recipe Card ────────────────────────────────────────────

function FeaturedRecipeCard({
  recipe,
  onPress,
  onSave,
  index = 0,
}: {
  recipe: Recipe;
  onPress: () => void;
  onSave: () => void;
  index?: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(16)}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={onPress}
        style={styles.featuredCard}
      >
        {/* Background image */}
        <Image source={{ uri: getRecipeImage(recipe) }} style={styles.featuredImage} />
        {/* Gradient overlay */}
        <View style={styles.featuredOverlay} />

        {/* Content */}
        <View style={styles.featuredContent}>
          <View style={styles.featuredBadges}>
            <View style={styles.matchBadgeFull}>
              <Text style={styles.matchBadgeText}>✅ Can Make Now</Text>
            </View>
            {recipe.cuisine && (
              <View style={styles.cuisineBadge}>
                <Text style={styles.cuisineBadgeText}>{recipe.cuisine}</Text>
              </View>
            )}
          </View>

          <Text style={styles.featuredTitle}>{recipe.title}</Text>

          <View style={styles.featuredMeta}>
            <Text style={styles.featuredMetaText}>⏱ {recipe.totalTime} min</Text>
            <Text style={styles.featuredMetaDot}>·</Text>
            <Text style={styles.featuredMetaText}>📊 {recipe.difficulty}</Text>
            {recipe.servings && (
              <>
                <Text style={styles.featuredMetaDot}>·</Text>
                <Text style={styles.featuredMetaText}>🍽 {recipe.servings} servings</Text>
              </>
            )}
          </View>

          <View style={styles.featuredActions}>
            <TouchableOpacity style={styles.cookNowBtn} onPress={onPress}>
              <Text style={styles.cookNowText}>Start Cooking →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveBtnText}>🔖</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Standard Recipe Card ─────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onPress,
  onSave,
  index = 0,
}: {
  recipe: Recipe;
  onPress: () => void;
  onSave: () => void;
  index?: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(16)}
      style={[styles.recipeCard, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={onPress}
        style={styles.recipeCardInner}
      >
        <Image source={{ uri: getRecipeImage(recipe) }} style={styles.cardImage} />

        {/* Save button overlay */}
        <TouchableOpacity style={styles.cardBookmark} onPress={onSave}>
          <Text style={styles.cardBookmarkIcon}>🔖</Text>
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>⏱ {recipe.totalTime}m</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMetaText}>{recipe.difficulty}</Text>
          </View>

          {/* Missing ingredients */}
          {recipe.missingIngredients.length > 0 && (
            <View style={styles.missingSection}>
              <Text style={styles.missingLabel}>NEED</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.missingChips}>
                  {recipe.missingIngredients.slice(0, 3).map((ing) => (
                    <View key={ing} style={styles.missingChip}>
                      <Text style={styles.missingChipText}>{ing}</Text>
                    </View>
                  ))}
                  {recipe.missingIngredients.length > 3 && (
                    <View style={[styles.missingChip, styles.missingChipMore]}>
                      <Text style={styles.missingChipText}>+{recipe.missingIngredients.length - 3}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RecipesScreen() {
  const { user } = useAuth();
  const { items: pantryItems, loading: pantryLoading } = usePantry(user?.uid ?? null);
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const fullMatch = recipes.filter((r) => r.matchType === 'full');
  const partialMatch = recipes.filter((r) => r.matchType === 'partial');

  const generateBtnScale = useSharedValue(1);
  const generateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: generateBtnScale.value }],
  }));

  const handleGenerate = useCallback(async () => {
    if (pantryItems.length === 0) {
      Alert.alert(
        'Empty Pantry',
        'Add some ingredients to your pantry first by scanning your fridge or adding items manually.',
        [{ text: 'Go to Pantry', onPress: () => router.push('/(tabs)') }, { text: 'Cancel' }]
      );
      return;
    }
    setGenerating(true);
    try {
      const result = await generateRecipes(pantryItems);
      setRecipes(result);
      setGenerated(true);
    } catch (err: unknown) {
      Alert.alert('Generation Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [pantryItems]);

  const handleSave = async (recipe: Recipe) => {
    if (!user) return;
    try {
      await saveRecipe(user.uid, recipe);
      Alert.alert('Saved! 🎉', `"${recipe.title}" added to your cookbook.`);
    } catch {
      Alert.alert('Error', 'Could not save recipe. Please try again.');
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, recipe: JSON.stringify(recipe) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🍃</Text>
          <Text style={styles.headerTitle}>PantryChef</Text>
        </View>
        {generated && (
          <TouchableOpacity style={styles.refreshChip} onPress={handleGenerate}>
            <Text style={styles.refreshChipText}>🔄 Refresh</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroSection}>
          <Text style={styles.heroLabel}>AI-POWERED</Text>
          <Text style={styles.heroTitle}>Recipe Ideas</Text>
          {generated ? (
            <Text style={styles.heroSub}>
              {recipes.length} recipes found for your {pantryItems.length} pantry items.
            </Text>
          ) : (
            <Text style={styles.heroSub}>
              Let Claude discover what you can cook right now.
            </Text>
          )}
        </Animated.View>

        {/* ── Pantry Stats Bar ── */}
        {pantryItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{pantryItems.length}</Text>
              <Text style={styles.statLabel}>Pantry Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{fullMatch.length || '?'}</Text>
              <Text style={styles.statLabel}>Full Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{partialMatch.length || '?'}</Text>
              <Text style={styles.statLabel}>Near Matches</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Generate Card ── */}
        {!generated && !generating && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.generateSection}>
            <View style={styles.generateCard}>
              <View style={styles.generateIconWrap}>
                <Text style={styles.generateEmoji}>🤖</Text>
              </View>
              <Text style={styles.generateTitle}>Claude AI Recipe Discovery</Text>
              <Text style={styles.generateSub}>
                Our AI analyzes your {pantryItems.length} pantry item{pantryItems.length !== 1 ? 's' : ''}{' '}
                and finds the best recipes you can make right now — plus ones just a quick trip away.
              </Text>

              <Animated.View style={generateBtnStyle}>
                <Pressable
                  style={styles.generateBtn}
                  onPressIn={() => { generateBtnScale.value = withSpring(0.95, { damping: 20 }); }}
                  onPressOut={() => { generateBtnScale.value = withSpring(1, { damping: 20 }); }}
                  onPress={handleGenerate}
                  disabled={pantryLoading}
                >
                  <Text style={styles.generateBtnText}>✨  Generate Recipes</Text>
                </Pressable>
              </Animated.View>

              {pantryItems.length === 0 && (
                <Text style={styles.generateHint}>
                  Add items to your pantry first to get started.
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Loading State ── */}
        {generating && (
          <Animated.View entering={FadeIn} style={styles.loadingSection}>
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingTitle}>Claude is cooking up ideas...</Text>
              <Text style={styles.loadingSub}>
                Analyzing your pantry and finding the best recipe matches.
              </Text>
              <View style={styles.loadingDots}>
                {[0, 1, 2].map((i) => (
                  <Animated.View
                    key={i}
                    entering={ZoomIn.delay(i * 200).springify()}
                    style={styles.dot}
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Full Match Section ── */}
        {fullMatch.length > 0 && (
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitle}>Ready to Cook</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {fullMatch.length} recipe{fullMatch.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionSub}>You have all the ingredients</Text>
            </View>

            {/* Featured card */}
            <FeaturedRecipeCard
              recipe={fullMatch[0]}
              onPress={() => handleRecipePress(fullMatch[0])}
              onSave={() => handleSave(fullMatch[0])}
              index={0}
            />

            {/* Additional full-match cards */}
            {fullMatch.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {fullMatch.slice(1).map((recipe, i) => (
                  <View key={recipe.id} style={styles.horizontalCardWrap}>
                    <RecipeCard
                      recipe={recipe}
                      onPress={() => handleRecipePress(recipe)}
                      onSave={() => handleSave(recipe)}
                      index={i}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {/* ── Partial Match Section ── */}
        {partialMatch.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitle}>Worth the Trip</Text>
                <View style={[styles.sectionBadge, styles.sectionBadgeOrange]}>
                  <Text style={[styles.sectionBadgeText, { color: Colors.onSecondaryContainer }]}>
                    {partialMatch.length} recipes
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionSub}>Missing just 1–3 ingredients</Text>
            </View>

            <View style={styles.partialGrid}>
              {partialMatch.map((recipe, i) => (
                <View key={recipe.id} style={styles.partialCardWrap}>
                  <RecipeCard
                    recipe={recipe}
                    onPress={() => handleRecipePress(recipe)}
                    onSave={() => handleSave(recipe)}
                    index={i}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Regenerate button */}
        {generated && !generating && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.regenerateWrap}>
            <TouchableOpacity style={styles.regenerateBtn} onPress={handleGenerate}>
              <Text style={styles.regenerateBtnText}>🔄  Generate New Recipes</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { fontSize: 22 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
    fontStyle: 'italic',
    letterSpacing: -0.3,
  },
  refreshChip: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  refreshChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  scroll: { flex: 1 },

  heroSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  heroLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2, marginBottom: 8 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },

  // Stats bar
  statsBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: 8 },

  // Generate
  generateSection: { paddingHorizontal: 20, marginBottom: 12 },
  generateCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  generateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  generateEmoji: { fontSize: 40 },
  generateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 10,
    textAlign: 'center',
  },
  generateSub: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 16 },
  generateHint: { fontSize: 12, color: Colors.outline, marginTop: 16, textAlign: 'center' },

  // Loading
  loadingSection: { paddingHorizontal: 20, marginBottom: 12 },
  loadingCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  loadingSub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  loadingDots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: { marginBottom: 16 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: Colors.onSurface },
  sectionBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionBadgeOrange: { backgroundColor: Colors.secondaryContainer },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimaryContainer },
  sectionSub: { fontSize: 13, color: Colors.onSurfaceVariant },

  // Featured Card
  featuredCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    height: 260,
  },
  featuredImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,54,29,0.55)',
  },
  featuredContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  featuredBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  matchBadgeFull: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimaryContainer },
  cuisineBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cuisineBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 30,
    marginBottom: 8,
  },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  featuredMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  featuredMetaDot: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  featuredActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cookNowBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
  },
  cookNowText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  saveBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 18 },

  // Standard Card
  recipeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeCardInner: {},
  cardImage: { width: '100%', height: 140 },
  cardBookmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBookmarkIcon: { fontSize: 16 },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurface, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardMetaText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  cardMetaDot: { fontSize: 12, color: Colors.outline },
  missingSection: { marginTop: 2 },
  missingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  missingChips: { flexDirection: 'row', gap: 6 },
  missingChip: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  missingChipMore: { backgroundColor: Colors.surfaceContainerHigh },
  missingChipText: { fontSize: 11, fontWeight: '600', color: Colors.onSecondaryContainer },

  // Horizontal scroll
  horizontalList: { paddingRight: 4, gap: 12 },
  horizontalCardWrap: { width: 220 },

  // Partial grid
  partialGrid: { gap: 14 },
  partialCardWrap: { width: '100%' },

  // Regenerate
  regenerateWrap: { paddingHorizontal: 20, marginBottom: 12 },
  regenerateBtn: {
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  regenerateBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
});
