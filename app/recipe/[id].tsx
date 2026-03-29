import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Pressable,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  ZoomIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Recipe, RecipeStep } from '@/types';
import { saveRecipe, removeSavedRecipe, isRecipeSaved, addRating } from '@/services/recipeService';
import { addItemToList, getShoppingLists, createShoppingList } from '@/services/shoppingService';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'ingredients' | 'instructions' | 'reviews';

function StarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange?.(star)}
          disabled={!onChange}
        >
          <Text style={{ fontSize: size }}>{star <= value ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RecipeDetailScreen() {
  const { id, recipe: recipeParam } = useLocalSearchParams<{ id: string; recipe: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('ingredients');
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [cookingStep, setCookingStep] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (recipeParam) {
      try {
        setRecipe(JSON.parse(recipeParam));
      } catch {}
    }
  }, [recipeParam]);

  useEffect(() => {
    if (!user || !recipe) return;
    isRecipeSaved(user.uid, recipe.id).then((sid) => {
      setIsSaved(!!sid);
      setSavedId(sid);
    });
  }, [user, recipe]);

  const handleSaveToggle = async () => {
    if (!user || !recipe) return;
    if (isSaved && savedId) {
      await removeSavedRecipe(savedId);
      setIsSaved(false);
      setSavedId(null);
    } else {
      const saved = await saveRecipe(user.uid, recipe);
      setIsSaved(true);
      setSavedId(saved.id);
    }
  };

  const handleShare = async () => {
    if (!recipe) return;
    try {
      await Share.share({
        title: recipe.title,
        message: `🍳 Check out this recipe: ${recipe.title}\n\nIngredients: ${recipe.ingredients.map(i => i.name).join(', ')}\n\nShared from PantryChef`,
      });
    } catch {}
  };

  const handleAddMissingToCart = async () => {
    if (!user || !recipe) return;
    try {
      let lists = await getShoppingLists(user.uid);
      let list = lists[0];
      if (!list) list = await createShoppingList(user.uid);

      const missing = recipe.ingredients.filter((i) => !i.inPantry);
      for (const ing of missing) {
        await addItemToList(list.id, list.items, {
          name: ing.name,
          quantity: ing.amount,
          category: 'Other',
          isChecked: false,
          recipeName: recipe.title,
        });
      }
      Alert.alert('Added to Shopping List!', `${missing.length} missing ingredient${missing.length !== 1 ? 's' : ''} added to your shopping list.`);
    } catch {
      Alert.alert('Error', 'Could not add items to shopping list.');
    }
  };

  const handleSubmitRating = async () => {
    if (!user || !recipe || userRating === 0) return;
    setSubmittingRating(true);
    try {
      await addRating(user.uid, recipe.id, userRating, userComment);
      setShowRatingModal(false);
      Alert.alert('Thanks!', 'Your rating has been submitted.');
    } catch {
      Alert.alert('Error', 'Could not submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!recipe) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const inPantryCount = recipe.ingredients.filter((i) => i.inPantry).length;
  const heroImage = recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';

  // Cooking mode: full screen step view
  if (cookingStep !== null) {
    const step = recipe.steps[cookingStep];
    const total = recipe.steps.length;
    return (
      <SafeAreaView style={styles.cookingMode}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.cookingHeader}>
          <TouchableOpacity onPress={() => setCookingStep(null)}>
            <Text style={styles.cookingExit}>✕ Exit</Text>
          </TouchableOpacity>
          <Text style={styles.cookingProgress}>{cookingStep + 1} / {total}</Text>
          <View style={{ width: 60 }} />
        </Animated.View>
        <View style={styles.cookingProgressBar}>
          <View style={[styles.cookingProgressFill, { width: `${((cookingStep + 1) / total) * 100}%` }]} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cookingContent}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          {step.duration && (
            <View style={styles.stepDuration}>
              <Text style={styles.stepDurationText}>⏱ {step.duration}</Text>
            </View>
          )}
          <Text style={styles.stepDescription}>{step.description}</Text>
          {step.tip && (
            <View style={styles.stepTip}>
              <Text style={styles.stepTipLabel}>💡 Pro Tip</Text>
              <Text style={styles.stepTipText}>{step.tip}</Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.cookingNav}>
          <TouchableOpacity
            style={[styles.cookingNavBtn, styles.cookingNavPrev]}
            onPress={() => setCookingStep(Math.max(0, cookingStep - 1))}
            disabled={cookingStep === 0}
          >
            <Text style={styles.cookingNavPrevText}>← Previous</Text>
          </TouchableOpacity>
          {cookingStep < total - 1 ? (
            <TouchableOpacity
              style={[styles.cookingNavBtn, styles.cookingNavNext]}
              onPress={() => setCookingStep(cookingStep + 1)}
            >
              <Text style={styles.cookingNavNextText}>Next Step →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.cookingNavBtn, styles.cookingNavNext, { backgroundColor: Colors.secondaryContainer }]}
              onPress={() => { setCookingStep(null); setShowRatingModal(true); }}
            >
              <Text style={[styles.cookingNavNextText, { color: Colors.onSecondaryContainer }]}>🎉 Finished!</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <View style={styles.heroGradient} />
          <SafeAreaView style={styles.heroOverlay}>
            <View style={styles.heroHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.heroBackBtn}>
                <Text style={styles.heroBackText}>←</Text>
              </TouchableOpacity>
              <View style={styles.heroActions}>
                <TouchableOpacity onPress={handleSaveToggle} style={styles.heroActionBtn}>
                  <Text style={{ fontSize: 22 }}>{isSaved ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.heroActionBtn}>
                  <Text style={{ fontSize: 22 }}>↗️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.heroBadgeRow}>
            {recipe.matchType === 'full' && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>✅ 100% Match</Text>
              </View>
            )}
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.85)' }]}>
              <Text style={[styles.heroBadgeText, { color: Colors.onSurface }]}>⏱ {recipe.totalTime} Mins</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{recipe.title}</Text>
        </View>

        {/* Content Card */}
        <Animated.View entering={FadeInUp.delay(100).springify().damping(18)} style={styles.contentCard}>
          {/* Meta Grid */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.metaGrid}>
            {[
              { icon: '⏰', label: 'PREP', value: `${recipe.prepTime} min` },
              { icon: '🍳', label: 'COOK', value: `${recipe.cookTime} min` },
              { icon: '👥', label: 'SERVINGS', value: `${recipe.servings}` },
              { icon: '🔥', label: 'CALORIES', value: recipe.nutrition ? `${recipe.nutrition.calories}` : '—' },
            ].map(({ icon, label, value }, i) => (
              <Animated.View key={label} entering={ZoomIn.delay(200 + i * 60).springify()} style={styles.metaCell}>
                <Text style={styles.metaCellIcon}>{icon}</Text>
                <Text style={styles.metaCellLabel}>{label}</Text>
                <Text style={styles.metaCellValue}>{value}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Description */}
          {recipe.description && (
            <Text style={styles.description}>{recipe.description}</Text>
          )}

          {/* Missing ingredients CTA */}
          {recipe.missingIngredients.length > 0 && (
            <TouchableOpacity style={styles.missingCTA} onPress={handleAddMissingToCart}>
              <View>
                <Text style={styles.missingCTATitle}>Missing {recipe.missingIngredients.length} ingredient{recipe.missingIngredients.length > 1 ? 's' : ''}</Text>
                <Text style={styles.missingCTAText}>
                  {recipe.missingIngredients.slice(0, 3).join(', ')}
                  {recipe.missingIngredients.length > 3 ? '…' : ''}
                </Text>
              </View>
              <Text style={styles.missingCTABtn}>+ Add to List</Text>
            </TouchableOpacity>
          )}

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['ingredients', 'instructions', 'reviews'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.tabContent}>
              <Text style={styles.pantrySummary}>
                ✅ {inPantryCount} of {recipe.ingredients.length} ingredients in your pantry
              </Text>
              {recipe.ingredients.map((ing, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(i * 50).springify().damping(18)}
                  style={[styles.ingredientRow, ing.inPantry && styles.ingredientRowInPantry]}
                >
                  <View style={[styles.ingredientCheck, ing.inPantry && styles.ingredientCheckDone]}>
                    {ing.inPantry && <Text style={styles.checkText}>✓</Text>}
                  </View>
                  <View style={styles.ingredientInfo}>
                    <Text style={[styles.ingredientName, !ing.inPantry && styles.ingredientNameMuted]}>
                      {ing.name}
                    </Text>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  </View>
                  {ing.inPantry ? (
                    <View style={styles.inPantryTag}>
                      <Text style={styles.inPantryTagText}>In Pantry</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={handleAddMissingToCart}
                    >
                      <Text style={styles.addToCartText}>🛒 Add</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.tabContent}>
              {recipe.steps.map((step, i) => (
                <Animated.View key={i} entering={FadeInDown.delay(i * 60).springify().damping(18)} style={styles.stepRow}>
                  <View style={[styles.stepNum, i === 0 && styles.stepNumActive]}>
                    <Text style={[styles.stepNumText, i === 0 && { color: Colors.onPrimary }]}>{step.stepNumber}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitleSmall}>{step.title}</Text>
                    <Text style={styles.stepDescSmall}>{step.description}</Text>
                    {step.tip && (
                      <Text style={styles.stepTipSmall}>💡 {step.tip}</Text>
                    )}
                  </View>
                </Animated.View>
              ))}
              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <TouchableOpacity
                  style={styles.startCookingBtn}
                  onPress={() => setCookingStep(0)}
                >
                  <Text style={styles.startCookingText}>▶  Start Cooking Mode</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.tabContent}>
              <View style={styles.ratingOverview}>
                <Text style={styles.ratingBig}>{recipe.rating?.toFixed(1) ?? '—'}</Text>
                {recipe.rating && <StarRating value={Math.round(recipe.rating)} />}
                <Text style={styles.ratingCount}>{recipe.ratingCount ?? 0} reviews</Text>
              </View>
              <TouchableOpacity
                style={styles.leaveReviewBtn}
                onPress={() => setShowRatingModal(true)}
              >
                <Text style={styles.leaveReviewText}>✏️  Write a Review</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom action bar */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.bottomBar}>
        <SafeAreaView style={styles.bottomBarInner}>
          <TouchableOpacity style={styles.saveBottomBtn} onPress={handleSaveToggle}>
            <Text style={styles.saveBottomBtnIcon}>{isSaved ? '❤️' : '🔖'}</Text>
            <Text style={styles.saveBottomBtnText}>{isSaved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
          {recipe.rating && (
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>⭐ {recipe.rating} ({recipe.ratingCount})</Text>
            </View>
          )}
          <TouchableOpacity style={styles.shareBottomBtn} onPress={handleShare}>
            <Text style={styles.shareBottomBtnIcon}>↗️</Text>
            <Text style={styles.shareBottomBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.collectBtn}
            onPress={handleAddMissingToCart}
          >
            <Text style={styles.collectBtnText}>🛒  Shop Missing</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModal}>
            <Text style={styles.ratingModalTitle}>Rate This Recipe</Text>
            <Text style={styles.ratingModalSub}>{recipe.title}</Text>
            <View style={styles.starRow}>
              <StarRating value={userRating} onChange={setUserRating} size={36} />
            </View>
            <TextInput
              style={styles.commentInput}
              value={userComment}
              onChangeText={setUserComment}
              placeholder="Share your thoughts... (optional)"
              placeholderTextColor={Colors.outline}
              multiline
              numberOfLines={3}
            />
            <View style={styles.ratingModalBtns}>
              <TouchableOpacity style={styles.ratingCancelBtn} onPress={() => setShowRatingModal(false)}>
                <Text style={styles.ratingCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingSubmitBtn, userRating === 0 && { opacity: 0.5 }]}
                onPress={handleSubmitRating}
                disabled={userRating === 0 || submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.ratingSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  // Hero
  heroContainer: { position: 'relative', height: 380 },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(11,54,29,0.45)',
    bottom: 0, left: 0, right: 0,
  },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  heroBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBackText: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadgeRow: {
    position: 'absolute', bottom: 64, left: 20, flexDirection: 'row', gap: 8,
  },
  heroBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.onSecondaryContainer },
  heroTitle: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    fontSize: 30, fontWeight: '800', color: Colors.white, lineHeight: 36,
  },
  // Content
  contentCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 24,
  },
  metaGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metaCell: {
    flex: 1, backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14, padding: 12, alignItems: 'center',
  },
  metaCellIcon: { fontSize: 22, marginBottom: 4 },
  metaCellLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.8 },
  metaCellValue: { fontSize: 16, fontWeight: '800', color: Colors.onSurface },
  description: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20, marginBottom: 16 },
  missingCTA: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  missingCTATitle: { fontSize: 14, fontWeight: '700', color: Colors.onSecondaryContainer },
  missingCTAText: { fontSize: 12, color: Colors.secondary, marginTop: 2 },
  missingCTABtn: { fontSize: 13, fontWeight: '700', color: Colors.secondary },
  // Tabs
  tabs: { flexDirection: 'row', gap: 0, borderBottomWidth: 1.5, borderBottomColor: Colors.outlineVariant, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabContent: { gap: 10 },
  pantrySummary: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant, marginBottom: 8 },
  // Ingredients
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, backgroundColor: Colors.surfaceContainerLow,
  },
  ingredientRowInPantry: { backgroundColor: Colors.surface },
  ingredientCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  ingredientCheckDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkText: { color: Colors.onPrimary, fontSize: 13, fontWeight: '700' },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  ingredientNameMuted: { opacity: 0.7 },
  ingredientAmount: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  inPantryTag: {
    backgroundColor: Colors.primaryContainer, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  inPantryTagText: { fontSize: 11, fontWeight: '700', color: Colors.onPrimaryContainer },
  addToCartBtn: {
    backgroundColor: Colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  addToCartText: { fontSize: 12, fontWeight: '700', color: Colors.onSecondaryContainer },
  // Steps
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  stepNum: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumActive: { backgroundColor: Colors.primary },
  stepNumText: { fontSize: 18, fontWeight: '800', color: Colors.onSurface },
  stepContent: { flex: 1 },
  stepTitleSmall: { fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginBottom: 6 },
  stepDescSmall: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },
  stepTipSmall: { fontSize: 12, color: Colors.tertiary, marginTop: 8, fontStyle: 'italic' },
  startCookingBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  startCookingText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 16 },
  // Rating
  ratingOverview: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  ratingBig: { fontSize: 56, fontWeight: '800', color: Colors.onSurface },
  ratingCount: { fontSize: 14, color: Colors.onSurfaceVariant },
  leaveReviewBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  leaveReviewText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06,
    shadowRadius: 16, elevation: 8,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  bottomBarInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  saveBottomBtn: { alignItems: 'center', gap: 2 },
  saveBottomBtnIcon: { fontSize: 22 },
  saveBottomBtnText: { fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant },
  ratingPill: {
    flex: 1, backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center',
  },
  ratingPillText: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  shareBottomBtn: { alignItems: 'center', gap: 2 },
  shareBottomBtnIcon: { fontSize: 22 },
  shareBottomBtnText: { fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant },
  collectBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  collectBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  ratingModal: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28,
  },
  ratingModalTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, marginBottom: 4 },
  ratingModalSub: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 20 },
  starRow: { alignItems: 'center', marginBottom: 20 },
  commentInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14, padding: 16, fontSize: 14,
    color: Colors.onSurface, minHeight: 80,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    textAlignVertical: 'top', marginBottom: 20,
  },
  ratingModalBtns: { flexDirection: 'row', gap: 12 },
  ratingCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow, alignItems: 'center',
  },
  ratingCancelText: { fontWeight: '600', color: Colors.onSurfaceVariant, fontSize: 15 },
  ratingSubmitBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  ratingSubmitText: { fontWeight: '700', color: Colors.onPrimary, fontSize: 15 },
  // Cooking mode
  cookingMode: { flex: 1, backgroundColor: Colors.background },
  cookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  cookingExit: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  cookingProgress: { fontSize: 14, fontWeight: '600', color: Colors.onSurfaceVariant },
  cookingProgressBar: { height: 4, backgroundColor: Colors.surfaceContainerLow, marginHorizontal: 20 },
  cookingProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  cookingContent: { padding: 28, flex: 1 },
  stepNumber: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  stepNumberText: { fontSize: 28, fontWeight: '800', color: Colors.onPrimary },
  stepTitle: { fontSize: 26, fontWeight: '800', color: Colors.onSurface, marginBottom: 12 },
  stepDuration: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  stepDurationText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  stepDescription: { fontSize: 18, color: Colors.onSurface, lineHeight: 28 },
  stepTip: {
    backgroundColor: Colors.tertiaryContainer, borderRadius: 14, padding: 16, marginTop: 20,
  },
  stepTipLabel: { fontSize: 13, fontWeight: '700', color: Colors.onTertiaryContainer, marginBottom: 4 },
  stepTipText: { fontSize: 14, color: Colors.onTertiaryContainer, lineHeight: 20 },
  cookingNav: { flexDirection: 'row', gap: 12, padding: 20 },
  cookingNavBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cookingNavPrev: { backgroundColor: Colors.surfaceContainerLow },
  cookingNavNext: { backgroundColor: Colors.primary },
  cookingNavPrevText: { fontWeight: '700', color: Colors.onSurface, fontSize: 15 },
  cookingNavNextText: { fontWeight: '700', color: Colors.onPrimary, fontSize: 15 },
});
