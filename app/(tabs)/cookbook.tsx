import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { SavedRecipe, Recipe } from '@/types';
import { getSavedRecipes, removeSavedRecipe } from '@/services/recipeService';
import { useAuth } from '@/hooks/useAuth';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600',
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
];

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function SavedRecipeCard({
  savedRecipe,
  index,
  onPress,
  onRemove,
}: {
  savedRecipe: SavedRecipe;
  index: number;
  onPress: () => void;
  onRemove: () => void;
}) {
  const { recipe } = savedRecipe;
  const imageUri =
    recipe.imageUrl ??
    PLACEHOLDER_IMAGES[Math.abs(recipe.id.charCodeAt(0)) % PLACEHOLDER_IMAGES.length];

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(16)}
      layout={LinearTransition.springify()}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={onPress}
        style={styles.recipeCard}
      >
        {/* Image */}
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.cardImage} />
          <View style={styles.cardImageOverlay} />

          {/* Badges */}
          <View style={styles.cardBadges}>
            {recipe.matchType === 'full' && (
              <View style={styles.fullMatchBadge}>
                <Text style={styles.fullMatchText}>✅ Can Make</Text>
              </View>
            )}
            {savedRecipe.userRating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>⭐ {savedRecipe.userRating}</Text>
              </View>
            )}
          </View>

          {/* Remove button */}
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>

          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>⏱ {recipe.totalTime} min</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>📊 {recipe.difficulty}</Text>
            {recipe.cuisine && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>🌍 {recipe.cuisine}</Text>
              </>
            )}
          </View>

          {savedRecipe.userComment && (
            <View style={styles.noteBox}>
              <Text style={styles.noteText} numberOfLines={2}>
                "{savedRecipe.userComment}"
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.savedDate}>
              Saved {new Date(savedRecipe.savedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              })}
            </Text>
            <TouchableOpacity style={styles.cookBtn} onPress={onPress}>
              <Text style={styles.cookBtnText}>Cook →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CookbookScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'full' | 'partial'>('all');

  const fetchRecipes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getSavedRecipes(user.uid);
      setSavedRecipes(data);
    } catch {
      Alert.alert('Error', 'Could not load your cookbook.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);
  useFocusEffect(useCallback(() => { fetchRecipes(); }, [fetchRecipes]));

  const handleRemove = (savedId: string, title: string) => {
    Alert.alert('Remove Recipe', `Remove "${title}" from your cookbook?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeSavedRecipe(savedId);
          setSavedRecipes((prev) => prev.filter((r) => r.id !== savedId));
        },
      },
    ]);
  };

  const handlePress = (recipe: Recipe) => {
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id, recipe: JSON.stringify(recipe) } });
  };

  const displayed = savedRecipes.filter((sr) => {
    const matchSearch =
      !search ||
      sr.recipe.title.toLowerCase().includes(search.toLowerCase()) ||
      sr.recipe.cuisine?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'full' && sr.recipe.matchType === 'full') ||
      (filter === 'partial' && sr.recipe.matchType === 'partial');
    return matchSearch && matchFilter;
  });

  const fullCount = savedRecipes.filter((r) => r.recipe.matchType === 'full').length;
  const avgRating = savedRecipes.filter((r) => r.userRating).reduce((sum, r) => sum + (r.userRating ?? 0), 0) /
    (savedRecipes.filter((r) => r.userRating).length || 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🍃</Text>
          <Text style={styles.headerTitle}>PantryChef</Text>
        </View>
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroSection}>
          <Text style={styles.heroLabel}>YOUR COLLECTION</Text>
          <Text style={styles.heroTitle}>My Cookbook</Text>
          <Text style={styles.heroSub}>
            {savedRecipes.length} saved recipe{savedRecipes.length !== 1 ? 's' : ''}
          </Text>
        </Animated.View>

        {/* ── Stats Bento ── */}
        {savedRecipes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <Text style={styles.statNum}>{savedRecipes.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <Text style={styles.statNum}>{fullCount}</Text>
              <Text style={styles.statLabel}>Can Make</Text>
            </View>
            <View style={[styles.statCard, styles.statCardOrange]}>
              <Text style={styles.statNum}>
                {savedRecipes.filter((r) => r.userRating).length > 0
                  ? avgRating.toFixed(1)
                  : '—'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Search ── */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search your cookbook..."
              placeholderTextColor={Colors.outline}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Filter Chips ── */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {(['all', 'full', 'partial'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? '🍽️ All Recipes' : f === 'full' ? '✅ Can Make Now' : '🛒 Need Ingredients'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Content ── */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={Colors.primary} size="large" />
        ) : displayed.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>
              {savedRecipes.length === 0 ? 'Your cookbook is empty' : 'No recipes match'}
            </Text>
            <Text style={styles.emptySub}>
              {savedRecipes.length === 0
                ? 'Save recipes from the Recipes tab to build your personal collection.'
                : 'Try a different search or filter.'}
            </Text>
            {savedRecipes.length === 0 && (
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)/recipes')}
              >
                <Text style={styles.browseBtnText}>Browse Recipes →</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          <Animated.View style={styles.grid} layout={LinearTransition.springify()}>
            {displayed.map((sr, i) => (
              <SavedRecipeCard
                key={sr.id}
                savedRecipe={sr}
                index={i}
                onPress={() => handlePress(sr.recipe)}
                onRemove={() => handleRemove(sr.id, sr.recipe.title)}
              />
            ))}
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

  scroll: { flex: 1 },

  heroSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  heroLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2, marginBottom: 8 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontSize: 14, color: Colors.onSurfaceVariant },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statCardGreen: { backgroundColor: Colors.primaryContainer },
  statCardBlue: { backgroundColor: Colors.tertiaryContainer + '50' },
  statCardOrange: { backgroundColor: Colors.secondaryContainer },
  statNum: { fontSize: 26, fontWeight: '800', color: Colors.onSurface },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant },

  // Search
  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.onSurface },
  clearSearch: { fontSize: 14, color: Colors.outline },

  // Filter
  filterRow: { paddingHorizontal: 20, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.onPrimary },

  // Grid
  grid: { paddingHorizontal: 20, gap: 16 },

  // Recipe Card
  recipeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageWrap: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  cardBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  fullMatchBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fullMatchText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimaryContainer },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.onSurface },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  cardBody: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.onSurface, lineHeight: 23, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.outline },

  noteBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  noteText: { fontSize: 12, color: Colors.onSurfaceVariant, fontStyle: 'italic', lineHeight: 18 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedDate: { fontSize: 12, color: Colors.outline },
  cookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cookBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 13 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  browseBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  browseBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
});
