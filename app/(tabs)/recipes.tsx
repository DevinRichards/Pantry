import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { useAuth } from '@/hooks/useAuth';
import { usePantry } from '@/hooks/usePantry';
import { generateRecipes } from '@/services/recipes';
import {
  buildPantryHash,
  cacheRecipes,
  getCachedRecipes,
  timeAgo,
} from '@/services/recipeCache';
import type { Recipe } from '@/types';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           '#F3F5F2',
  surface:      '#FFFFFF',
  text:         '#111916',
  textSec:      '#4A5E54',
  textTer:      '#8FA899',
  border:       '#E4EBE6',
  primary:      '#1B4332',
  primaryMid:   '#52796F',
  primaryLight: '#D8F3DC',
  amber:        '#B45309',
  amberLight:   '#FEF3C7',
} as const;

// ─── Icons ────────────────────────────────────────────────────────────────────
function SparkleIcon({ color = '#1B4332', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L13.8 9.2L21 12L13.8 14.8L12 22L10.2 14.8L3 12L10.2 9.2L12 2Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="19" cy="5" r="1.5" stroke={color} strokeWidth="1.2" />
      <Circle cx="5" cy="19" r="1" stroke={color} strokeWidth="1.2" />
    </Svg>
  );
}

function CheckIcon({ color = 'white', size = 9 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Polyline points="2,6 5,9 10,3" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color = '#8FA899', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Polyline points="5,3 9,7 5,11" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────
function StatCards({ stats }: { stats: Array<{ n: number | string; label: string }> }) {
  return (
    <View style={styles.statRow}>
      {stats.map(({ n, label }) => (
        <View key={label} style={styles.statCard}>
          <Text style={styles.statN}>{n}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
function LoadingScreen({ progress, progLabel }: { progress: number; progLabel: string }) {
  const steps = ['Pantry', 'Full Match', 'Near Match', 'Nutrition'];
  return (
    <Animated.View entering={FadeIn} style={styles.loadingWrap}>
      <View style={styles.sparkleBubble}>
        <SparkleIcon color={C.primary} size={32} />
      </View>
      <Text style={styles.loadingTitle}>Generating Recipes</Text>
      <Text style={styles.loadingLabel}>{progLabel}</Text>
      <View style={{ width: '100%', maxWidth: 280 }}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]} />
        </View>
        <View style={styles.stepsRow}>
          {steps.map((l, i) => {
            const done = progress >= ((i + 1) / 4) * 100;
            return (
              <View key={l} style={styles.stepItem}>
                <View style={[styles.stepDot, done && styles.stepDotDone]}>
                  {done && <CheckIcon size={9} />}
                </View>
                <Text style={styles.stepLabel}>{l}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Pre-generate State ────────────────────────────────────────────────────────
function PreGenerateScreen({ pantryCount, onGenerate }: { pantryCount: number; onGenerate: () => void }) {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>AI-Powered</Text>
        <Text style={styles.heroTitle}>Recipes</Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <StatCards stats={[
          { n: pantryCount, label: 'Pantry items' },
          { n: '—', label: 'Ready now' },
          { n: '—', label: 'Near matches' },
        ]} />
        <View style={styles.generateCard}>
          <View style={styles.sparkleBubble}>
            <SparkleIcon color={C.primary} size={32} />
          </View>
          <Text style={styles.generateTitle}>Claude AI Recipe Discovery</Text>
          <Text style={styles.generateDesc}>
            Analyses your {pantryCount} pantry items and finds the best recipes — with real nutrition data.
          </Text>
          <TouchableOpacity style={styles.generateBtn} onPress={onGenerate} activeOpacity={0.85}>
            <SparkleIcon color="white" size={16} />
            <Text style={styles.generateBtnText}>Generate Recipes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Generated State ──────────────────────────────────────────────────────────
function GeneratedScreen({
  recipes, pantryCount, onGenerate, onRecipePress, cacheLabel, isStale,
}: {
  recipes: Recipe[];
  pantryCount: number;
  onGenerate: () => void;
  onRecipePress: (recipe: Recipe) => void;
  cacheLabel?: string | null;
  isStale?: boolean;
}) {
  const full    = recipes.filter(r => !r.missingIngredients?.length);
  const partial = recipes.filter(r => r.missingIngredients && r.missingIngredients.length > 0);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={[styles.screenHeader, { paddingBottom: 18 }]}>
        <Text style={styles.eyebrow}>AI-Powered</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.heroTitle}>Recipes</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onGenerate} activeOpacity={0.8}>
            <Text style={styles.refreshBtnText}>↺ Refresh</Text>
          </TouchableOpacity>
        </View>
        <StatCards stats={[
          { n: pantryCount, label: 'Pantry items' },
          { n: full.length, label: 'Ready now' },
          { n: partial.length, label: 'Near matches' },
        ]} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {cacheLabel ? (
          <View style={[styles.cacheBanner, isStale && styles.cacheBannerStale]}>
            <Text style={[styles.cacheBannerText, isStale && styles.cacheBannerTextStale]}>
              {isStale ? `Showing cached recipes from ${cacheLabel}. Refresh for your latest pantry.` : `Loaded cached recipes from ${cacheLabel}.`}
            </Text>
          </View>
        ) : null}

        {/* Ready to Cook */}
        {full.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Ready to Cook</Text>
              <Text style={styles.sectionCount}>{full.length} recipes</Text>
            </View>

            {/* Hero card — 240px */}
            <TouchableOpacity style={styles.heroCard} onPress={() => onRecipePress(full[0])} activeOpacity={0.9}>
              {full[0].imageUrl ? (
                <Image source={{ uri: full[0].imageUrl }}
                  style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.primaryMid }]} />
              )}
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(8,20,12,0.65)' }]} />
              <View style={styles.heroCardContent}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={styles.fullMatchBadge}>
                    <Text style={styles.fullMatchBadgeText}>Full Match</Text>
                  </View>
                  {full[0].cuisine ? (
                    <View style={styles.cuisineBadge}>
                      <Text style={styles.cuisineBadgeText}>{full[0].cuisine}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroCardTitle}>{full[0].title}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.heroCardMeta}>
                    {[full[0].cookTime ? `${full[0].cookTime} min` : null,
                      full[0].difficulty, full[0].nutrition?.calories ? `${full[0].nutrition?.calories} kcal` : null]
                      .filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.cookBtn}>
                    <Text style={styles.cookBtnText}>Cook →</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* 2nd full match — horizontal 88px */}
            {full[1] && (
              <TouchableOpacity style={styles.horizCard} onPress={() => onRecipePress(full[1])} activeOpacity={0.9}>
                {full[1].imageUrl ? (
                  <Image source={{ uri: full[1].imageUrl }} style={styles.horizCardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.horizCardImage, { backgroundColor: C.primaryMid }]} />
                )}
                <View style={styles.horizCardBody}>
                  <Text style={styles.horizCardTitle} numberOfLines={2}>{full[1].title}</Text>
                  <Text style={styles.horizCardMeta}>
                    {[full[1].cookTime ? `${full[1].cookTime} min` : null, full[1].difficulty, full[1].cuisine]
                      .filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 14 }}>
                  <ChevronRightIcon color={C.textTer} />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Worth the Trip — partial matches */}
        {partial.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Worth the Trip</Text>
              <Text style={styles.sectionCount}>{partial.length} recipes</Text>
            </View>
            {partial.map(r => (
              <TouchableOpacity key={r.id} style={styles.partialCard}
                onPress={() => onRecipePress(r)} activeOpacity={0.9}>
                {r.imageUrl ? (
                  <Image source={{ uri: r.imageUrl }} style={styles.partialCardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.partialCardImage, { backgroundColor: C.primaryMid }]} />
                )}
                <View style={styles.partialCardBody}>
                  <View>
                    <Text style={styles.partialCardTitle} numberOfLines={2}>{r.title}</Text>
                    <Text style={styles.partialCardMeta}>
                      {[r.cookTime ? `${r.cookTime} min` : null, r.difficulty].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {r.missingIngredients && r.missingIngredients.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {r.missingIngredients.slice(0, 2).map(m => (
                        <View key={m} style={styles.missingBadge}>
                          <Text style={styles.missingBadgeText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {recipes.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 48 }}>🍽</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.textSec }}>No recipes found</Text>
            <Text style={{ fontSize: 12, color: C.textTer, textAlign: 'center' }}>
              Try adding more items to your pantry
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.refreshCardBtn} onPress={onGenerate} activeOpacity={0.8}>
          <Text style={styles.refreshCardBtnText}>↺ Generate New Recipes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function RecipesScreen() {
  const { user }  = useAuth();
  const { items } = usePantry(user?.uid ?? null);
  const router    = useRouter();

  const [recipes, setRecipes]     = useState<Recipe[]>([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [progLabel, setProgLabel] = useState('');
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);
  const [cacheStale, setCacheStale] = useState(false);

  const pantryHash = useMemo(
    () => buildPantryHash(items.map((item) => item.name)),
    [items]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadCached = async () => {
        if (!user?.uid) {
          if (active) {
            setRecipes([]);
            setGenerated(false);
            setCacheLabel(null);
            setCacheStale(false);
          }
          return;
        }

        const cached = await getCachedRecipes(user.uid);
        if (!active || !cached?.recipes?.length) return;

        setRecipes(cached.recipes);
        setGenerated(true);
        setCacheLabel(timeAgo(cached.generatedAt));
        setCacheStale(cached.pantryHash !== pantryHash);
      };

      void loadCached();

      return () => {
        active = false;
      };
    }, [pantryHash, user?.uid])
  );

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    setProgLabel('Analysing your pantry…');

    try {
      const result = await generateRecipes(items, {
        onProgress: ({ current, total, step }) => {
          setProgress(((current + 1) / total) * 100);
          setProgLabel(step);
        },
      });
      setRecipes(result);
      setGenerated(true);
      setCacheLabel('just now');
      setCacheStale(false);
      if (user?.uid) {
        await cacheRecipes(result, items.map((item) => item.name), user.uid);
      }
    } catch (error) {
      setGenerated((prev) => prev || recipes.length > 0);
      Alert.alert(
        'Recipe generation unavailable',
        error instanceof Error ? error.message : 'Please try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  }, [items, recipes.length, user?.uid]);

  const handleRecipePress = (recipe: Recipe) => {
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingScreen progress={progress} progLabel={progLabel} />
      </View>
    );
  }

  if (!generated) {
    return (
      <View style={styles.root}>
        <PreGenerateScreen pantryCount={items.length} onGenerate={handleGenerate} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GeneratedScreen recipes={recipes} pantryCount={items.length}
        onGenerate={handleGenerate} onRecipePress={handleRecipePress}
        cacheLabel={cacheLabel} isStale={cacheStale} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  screenHeader: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 0 },
  eyebrow: { fontSize: 11, fontWeight: '600', color: C.textTer, letterSpacing: 1.1, marginBottom: 6 },
  heroTitle: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5 },

  refreshBtn: {
    backgroundColor: C.primaryLight, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7,
  },
  refreshBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // Stat cards
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statN: { fontSize: 22, fontWeight: '700', color: C.primary, lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '500', color: C.textTer, marginTop: 4 },

  // Loading
  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 40,
  },
  sparkleBubble: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  loadingLabel: { fontSize: 13, color: C.textTer, textAlign: 'center', lineHeight: 20 },
  progressTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: C.primary },
  stepLabel: { fontSize: 9, color: C.textTer, fontWeight: '500' },

  // Pre-generate card
  generateCard: {
    backgroundColor: C.surface, borderRadius: 24, padding: 28, marginTop: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07, shadowRadius: 24, elevation: 4,
  },
  generateTitle: { fontSize: 19, fontWeight: '700', color: C.text, marginBottom: 10, textAlign: 'center' },
  generateDesc: { fontSize: 13, color: C.textSec, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  generateBtn: {
    backgroundColor: C.primary, borderRadius: 100, paddingHorizontal: 36, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.31, shadowRadius: 20, elevation: 6,
  },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Section
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14, marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  sectionCount: { fontSize: 13, color: C.textTer },

  // Hero card 240px
  heroCard: {
    borderRadius: 22, overflow: 'hidden', height: 240, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 32, elevation: 8,
  },
  heroCardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  fullMatchBadge: {
    backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  fullMatchBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
  cuisineBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  cuisineBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  heroCardTitle: { fontSize: 22, fontWeight: '700', color: '#fff', lineHeight: 27, marginBottom: 10 },
  heroCardMeta: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500', flex: 1 },
  cookBtn: { backgroundColor: '#fff', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  cookBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },

  // Horizontal card 88px
  horizCard: {
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', height: 88, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  horizCardImage: { width: 88, height: 88, flexShrink: 0 },
  horizCardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
  horizCardTitle: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19, marginBottom: 3 },
  horizCardMeta: { fontSize: 12, color: C.textTer },

  // Partial match card 96px
  partialCard: {
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', height: 96, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  partialCardImage: { width: 96, height: 96, flexShrink: 0 },
  partialCardBody: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between',
  },
  partialCardTitle: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19 },
  partialCardMeta: { fontSize: 11, color: C.textTer, marginTop: 2 },
  missingBadge: {
    backgroundColor: C.amberLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100,
  },
  missingBadgeText: { fontSize: 10, fontWeight: '600', color: C.amber },

  refreshCardBtn: {
    width: '100%', marginTop: 24, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: 'transparent', alignItems: 'center',
  },
  refreshCardBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  cacheBanner: {
    backgroundColor: C.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  cacheBannerStale: {
    backgroundColor: C.amberLight,
  },
  cacheBannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.primary,
    fontWeight: '600',
  },
  cacheBannerTextStale: {
    color: C.amber,
  },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
});
