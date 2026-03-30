import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Pressable,
  Image,
  BackHandler,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { GenerationProgress, Recipe } from '@/types';
import { generateRecipes } from '@/services/claude';
import { usePantry } from '@/hooks/usePantry';
import { useAuth } from '@/hooks/useAuth';
import { saveRecipe } from '@/services/recipeService';
import { getCookedRecipeIds } from '@/services/cookedRecipes';

const RECIPE_IMAGES: Record<string, string> = {
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600',
  salmon: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
};

function getRecipeImage(recipe: Recipe): string {
  if (recipe.imageUrl) return recipe.imageUrl;
  const title = recipe.title.toLowerCase();
  if (title.includes('pasta') || title.includes('risotto')) return RECIPE_IMAGES.pasta;
  if (title.includes('salmon') || title.includes('fish')) return RECIPE_IMAGES.salmon;
  if (title.includes('salad')) return RECIPE_IMAGES.salad;
  return RECIPE_IMAGES.default;
}

// ─── Progress Indicator ───────────────────────────────────────────────────────

function GenerationProgressCard({ progress }: { progress: GenerationProgress }) {
  const dotScale1 = useSharedValue(1);
  const dotScale2 = useSharedValue(1);
  const dotScale3 = useSharedValue(1);

  useEffect(() => {
    dotScale1.value = withRepeat(withSequence(withSpring(1.4), withSpring(1)), -1);
    setTimeout(() => {
      dotScale2.value = withRepeat(withSequence(withSpring(1.4), withSpring(1)), -1);
    }, 200);
    setTimeout(() => {
      dotScale3.value = withRepeat(withSequence(withSpring(1.4), withSpring(1)), -1);
    }, 400);
  }, []);

  const pct = Math.round(((progress.current + 1) / progress.total) * 100);

  return (
    <Animated.View entering={FadeIn} style={styles.progressCard}>
      <View style={styles.progressCardHeader}>
        <Text style={styles.progressEmoji}>🤖</Text>
        <View style={styles.progressDots}>
          {[dotScale1, dotScale2, dotScale3].map((scale, i) => {
            const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
            return <Animated.View key={i} style={[styles.dot, animStyle]} />;
          })}
        </View>
      </View>

      <Text style={styles.progressTitle}>{progress.step}</Text>

      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, { width: `${pct}%` as any }]} />
      </View>

      <View style={styles.progressSteps}>
        {['Recipe 1', 'Recipe 2', 'Recipe 3', 'Nutrition'].map((label, i) => (
          <View key={i} style={styles.progressStep}>
            <View style={[
              styles.progressStepDot,
              i < progress.current + 1 && styles.progressStepDotDone,
              i === progress.current && styles.progressStepDotActive,
            ]}>
              {i < progress.current && <Text style={styles.progressStepCheck}>✓</Text>}
            </View>
            <Text style={[
              styles.progressStepLabel,
              i === progress.current && styles.progressStepLabelActive,
            ]}>{label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedRecipeCard({
  recipe, onPress, onSave, index = 0,
}: { recipe: Recipe; onPress: () => void; onSave: () => void; index?: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(16)} style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={onPress}
        style={styles.featuredCard}
      >
        <Image source={{ uri: getRecipeImage(recipe) }} style={styles.featuredImage} />
        <View style={styles.featuredOverlay} />
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
            {recipe.nutrition?.calories ? (
              <>
                <Text style={styles.featuredMetaDot}>·</Text>
                <Text style={styles.featuredMetaText}>
                  🔥 {recipe.nutrition.calories} kcal
                  {recipe.nutrition.dataSource === 'spoonacular' ? ' ✓' : ''}
                </Text>
              </>
            ) : null}
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

// ─── Standard Card ────────────────────────────────────────────────────────────

function RecipeCard({
  recipe, onPress, onSave, index = 0,
}: { recipe: Recipe; onPress: () => void; onSave: () => void; index?: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(16)}
      style={[styles.recipeCard, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={onPress}
      >
        <Image source={{ uri: getRecipeImage(recipe) }} style={styles.cardImage} />
        <TouchableOpacity style={styles.cardBookmark} onPress={onSave}>
          <Text style={styles.cardBookmarkIcon}>🔖</Text>
        </TouchableOpacity>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>⏱ {recipe.totalTime}m</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMetaText}>{recipe.difficulty}</Text>
            {recipe.nutrition?.calories ? (
              <>
                <Text style={styles.cardMetaDot}>·</Text>
                <Text style={styles.cardMetaText}>
                  🔥 {recipe.nutrition.calories}
                  {recipe.nutrition.dataSource === 'spoonacular' ? '✓' : ''}
                </Text>
              </>
            ) : null}
          </View>
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
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [cookedIds, setCookedIds] = useState<Set<string>>(new Set());

  // Load cooked IDs on focus so filtered list stays up to date
  useFocusEffect(useCallback(() => {
    getCookedRecipeIds().then(setCookedIds);
  }, []));

  // Filter out cooked recipes from the active list
  const activeRecipes = recipes.filter((r) => !cookedIds.has(r.id));
  const fullMatch = activeRecipes.filter((r) => r.matchType === 'full');
  const partialMatch = activeRecipes.filter((r) => r.matchType === 'partial');
  const cookedCount = recipes.length - activeRecipes.length;

  const generateBtnScale = useSharedValue(1);
  const generateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: generateBtnScale.value }],
  }));

  const handleGenerate = useCallback(async () => {
    if (pantryItems.length === 0) {
      Alert.alert(
        'Empty Pantry',
        'Add some ingredients to your pantry first.',
        [{ text: 'Go to Pantry', onPress: () => router.push('/(tabs)') }, { text: 'Cancel' }]
      );
      return;
    }
    setGenerating(true);
    setProgress(null);
    try {
      const result = await generateRecipes(pantryItems, {
        onProgress: (p) => setProgress(p),
      });
      setRecipes(result);
      setGenerated(true);
    } catch (err: unknown) {
      Alert.alert('Generation Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setGenerating(false);
      setProgress(null);
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
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id, recipe: JSON.stringify(recipe) } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🍃</Text>
          <Text style={styles.headerTitle}>PantryChef</Text>
        </View>
        {generated && !generating && (
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
          <Text style={styles.heroSub}>
            {generated
              ? `${activeRecipes.length} recipe${activeRecipes.length !== 1 ? 's' : ''} ready${cookedCount > 0 ? ` · ${cookedCount} cooked` : ''}`
              : 'Let Claude discover what you can cook right now.'}
          </Text>
        </Animated.View>

        {/* ── Stats Bar ── */}
        {pantryItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{pantryItems.length}</Text>
              <Text style={styles.statLabel}>Pantry Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{generated ? fullMatch.length : '?'}</Text>
              <Text style={styles.statLabel}>Full Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{generated ? partialMatch.length : '?'}</Text>
              <Text style={styles.statLabel}>Near Matches</Text>
            </View>
            {cookedCount > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: Colors.secondary }]}>{cookedCount}</Text>
                  <Text style={styles.statLabel}>Cooked</Text>
                </View>
              </>
            )}
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
                Analyzes your {pantryItems.length} pantry item{pantryItems.length !== 1 ? 's' : ''} and finds
                the best recipes — with real nutrition data from Spoonacular.
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
            </View>
          </Animated.View>
        )}

        {/* ── Progress ── */}
        {generating && progress && (
          <View style={styles.generateSection}>
            <GenerationProgressCard progress={progress} />
          </View>
        )}

        {/* ── Full Match ── */}
        {fullMatch.length > 0 && (
          <Animated.View entering={FadeInDown.springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitle}>Ready to Cook</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{fullMatch.length} recipe{fullMatch.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              <Text style={styles.sectionSub}>You have all the ingredients</Text>
            </View>

            <FeaturedRecipeCard
              recipe={fullMatch[0]}
              onPress={() => handleRecipePress(fullMatch[0])}
              onSave={() => handleSave(fullMatch[0])}
            />

            {fullMatch.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {fullMatch.slice(1).map((recipe, i) => (
                  <View key={recipe.id} style={styles.horizontalCardWrap}>
                    <RecipeCard recipe={recipe} onPress={() => handleRecipePress(recipe)} onSave={() => handleSave(recipe)} index={i} />
                  </View>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {/* ── Partial Match ── */}
        {partialMatch.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitle}>Worth the Trip</Text>
                <View style={[styles.sectionBadge, styles.sectionBadgeOrange]}>
                  <Text style={[styles.sectionBadgeText, { color: Colors.onSecondaryContainer }]}>
                    {partialMatch.length} recipe{partialMatch.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionSub}>Missing just 1–3 ingredients</Text>
            </View>
            <View style={styles.partialGrid}>
              {partialMatch.map((recipe, i) => (
                <View key={recipe.id} style={styles.partialCardWrap}>
                  <RecipeCard recipe={recipe} onPress={() => handleRecipePress(recipe)} onSave={() => handleSave(recipe)} index={i} />
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── All cooked notice ── */}
        {generated && activeRecipes.length === 0 && cookedCount > 0 && (
          <Animated.View entering={FadeIn} style={styles.allCookedCard}>
            <Text style={styles.allCookedEmoji}>🎉</Text>
            <Text style={styles.allCookedTitle}>You've cooked them all!</Text>
            <Text style={styles.allCookedSub}>Generate new recipes to discover more dishes.</Text>
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
              <Text style={styles.generateBtnText}>🔄  Generate New Recipes</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {generated && !generating && activeRecipes.length > 0 && (
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, fontStyle: 'italic', letterSpacing: -0.3 },
  refreshChip: { backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.outlineVariant },
  refreshChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  scroll: { flex: 1 },

  // Hero
  heroSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  heroLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2, marginBottom: 8 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },

  // Stats
  statsBar: { marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20, flexDirection: 'row', padding: 16, borderWidth: 1, borderColor: Colors.outlineVariant },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: 8 },

  // Generate
  generateSection: { paddingHorizontal: 20, marginBottom: 12 },
  generateCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: Colors.outlineVariant },
  generateIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  generateEmoji: { fontSize: 40 },
  generateTitle: { fontSize: 20, fontWeight: '800', color: Colors.onSurface, marginBottom: 10, textAlign: 'center' },
  generateSub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  generateBtn: { backgroundColor: Colors.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  generateBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 16 },

  // Progress card
  progressCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.outlineVariant },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progressEmoji: { fontSize: 32 },
  progressDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  progressTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginBottom: 14 },
  progressBarTrack: { height: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 6 },
  progressSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStep: { alignItems: 'center', gap: 4 },
  progressStepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.outlineVariant },
  progressStepDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressStepDotActive: { borderColor: Colors.primary, borderWidth: 2.5 },
  progressStepCheck: { fontSize: 10, color: Colors.onPrimary, fontWeight: '700' },
  progressStepLabel: { fontSize: 10, color: Colors.onSurfaceVariant, fontWeight: '600' },
  progressStepLabelActive: { color: Colors.primary },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: { marginBottom: 16 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: Colors.onSurface },
  sectionBadge: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sectionBadgeOrange: { backgroundColor: Colors.secondaryContainer },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimaryContainer },
  sectionSub: { fontSize: 13, color: Colors.onSurfaceVariant },

  // Featured
  featuredCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 14, height: 260 },
  featuredImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  featuredOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,54,29,0.55)' },
  featuredContent: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  featuredBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  matchBadgeFull: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  matchBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimaryContainer },
  cuisineBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  cuisineBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  featuredTitle: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30, marginBottom: 8 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  featuredMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  featuredMetaDot: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  featuredActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cookNowBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, flex: 1, alignItems: 'center' },
  cookNowText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  saveBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 18 },

  // Standard card
  recipeCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.outlineVariant },
  cardImage: { width: '100%', height: 140 },
  cardBookmark: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardBookmarkIcon: { fontSize: 16 },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurface, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardMetaText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  cardMetaDot: { fontSize: 12, color: Colors.outline },
  missingSection: { marginTop: 2 },
  missingLabel: { fontSize: 9, fontWeight: '700', color: Colors.secondary, letterSpacing: 1.2, marginBottom: 6 },
  missingChips: { flexDirection: 'row', gap: 6 },
  missingChip: { backgroundColor: Colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  missingChipMore: { backgroundColor: Colors.surfaceContainerHigh },
  missingChipText: { fontSize: 11, fontWeight: '600', color: Colors.onSecondaryContainer },

  // Horizontal scroll
  horizontalList: { paddingRight: 4, gap: 12, paddingBottom: 4 },
  horizontalCardWrap: { width: 220 },

  // Partial
  partialGrid: { gap: 14 },
  partialCardWrap: { width: '100%' },

  // All cooked
  allCookedCard: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40, gap: 12 },
  allCookedEmoji: { fontSize: 56 },
  allCookedTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  allCookedSub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },

  // Regenerate
  regenerateWrap: { paddingHorizontal: 20, marginBottom: 12 },
  regenerateBtn: { paddingVertical: 15, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.outlineVariant, alignItems: 'center', backgroundColor: Colors.surfaceContainerLowest },
  regenerateBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
});
