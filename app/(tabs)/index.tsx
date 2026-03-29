import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  ZoomIn,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { PantryItem, IngredientCategory } from '@/types';
import { usePantry } from '@/hooks/usePantry';
import { useAuth } from '@/hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  fridge: '🧊',
  pantry: '📦',
  freezer: '❄️',
  spices: '🌶️',
  other: '🍽️',
};

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  fridge: 'Fridge',
  pantry: 'Pantry',
  freezer: 'Freezer',
  spices: 'Spices',
  other: 'Other',
};

const CATEGORY_BG: Record<IngredientCategory, string> = {
  fridge: Colors.surfaceContainerLow,
  pantry: Colors.primaryContainer,
  freezer: '#e0f7fa',
  spices: Colors.secondaryContainer,
  other: Colors.surfaceContainerHigh,
};

// ─── Animated Ingredient Card ─────────────────────────────────────────────────

function IngredientCard({
  item,
  index,
  onDelete,
}: {
  item: PantryItem;
  index: number;
  onDelete: () => void;
}) {
  const pct = item.amount && item.maxAmount
    ? Math.min(100, Math.round((item.amount / item.maxAmount) * 100))
    : null;
  const isLow = pct !== null && pct <= 25;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      layout={LinearTransition.springify()}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        style={styles.ingredientCard}
      >
        {/* Low stock indicator */}
        {isLow && (
          <View style={styles.lowBanner}>
            <Text style={styles.lowBannerText}>⚠ Running Low</Text>
          </View>
        )}

        <View style={styles.cardInner}>
          {/* Icon */}
          <View style={[
            styles.iconBox,
            { backgroundColor: CATEGORY_BG[item.category] ?? Colors.surfaceContainerLow }
          ]}>
            <Text style={styles.iconEmoji}>
              {CATEGORY_EMOJI[item.category] ?? '🍽️'}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.ingredientSub, isLow && styles.ingredientSubLow]}>
              {item.expiryDate
                ? `Expires ${item.expiryDate}`
                : item.quantity || CATEGORY_LABELS[item.category]}
            </Text>
          </View>

          {/* Delete */}
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        {pct !== null && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: isLow ? Colors.error : Colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPct, isLow && { color: Colors.error }]}>
              {pct}%
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Bento Category Card ──────────────────────────────────────────────────────

function CategoryBentoCard({
  category,
  items,
  isActive,
  onPress,
  delay = 0,
}: {
  category: IngredientCategory;
  items: PantryItem[];
  isActive: boolean;
  onPress: () => void;
  delay?: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.delay(delay).springify().damping(16)}
      style={[styles.bentoCard, animStyle, isActive && styles.bentoCardActive]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={onPress}
        style={styles.bentoPressable}
      >
        <Text style={styles.bentoEmoji}>{CATEGORY_EMOJI[category]}</Text>
        <Text style={[styles.bentoCount, isActive && styles.bentoCountActive]}>
          {items.length}
        </Text>
        <Text style={[styles.bentoLabel, isActive && styles.bentoLabelActive]}>
          {CATEGORY_LABELS[category]}
        </Text>
        {items.some((i) => i.isLow) && (
          <View style={styles.bentoBadge}>
            <Text style={styles.bentoBadgeText}>Low</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PantryItem, 'id' | 'addedAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('fridge');
  const categories: IngredientCategory[] = ['fridge', 'pantry', 'freezer', 'spices', 'other'];

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter an ingredient name.');
      return;
    }
    onAdd({ name: name.trim(), quantity: quantity.trim() || '1', category });
    setName('');
    setQuantity('');
    setCategory('fridge');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Ingredient</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Fresh Eggs"
            placeholderTextColor={Colors.outline}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.modalInput}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 6 pieces, 500g"
            placeholderTextColor={Colors.outline}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catChip, category === cat && styles.catChipActive]}
              >
                <Text style={styles.catChipIcon}>{CATEGORY_EMOJI[cat]}</Text>
                <Text style={[styles.catChipLabel, category === cat && styles.catChipLabelActive]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PantryScreen() {
  const { user } = useAuth();
  const { items, loading, addItem, removeItem, refetch, fridgeItems, pantryItems, freezerItems } =
    usePantry(user?.uid ?? null);
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<IngredientCategory | 'all'>('all');

  // FAB animation
  const fabScale = useSharedValue(0);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      refetch();
      // Pop in the FAB
      fabScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      return () => {
        fabScale.value = withTiming(0, { duration: 150 });
      };
    }, [refetch])
  );

  const lowItems = items.filter((i) => i.isLow);
  const organicCount = items.filter((i) => i.isOrganic).length;
  const organicPct = items.length ? Math.round((organicCount / items.length) * 100) : 0;

  const displayed = items.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  const handleDeleteItem = (id: string) => {
    Alert.alert('Remove Item', 'Remove this item from your pantry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(id) },
    ]);
  };

  const categoryGroups: IngredientCategory[] = ['fridge', 'pantry', 'freezer', 'spices', 'other'];
  const getCategoryItems = (cat: IngredientCategory) => items.filter((i) => i.category === cat);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🍃</Text>
          <Text style={styles.headerTitle}>PantryChef</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowAddModal(true)}>
          <Text style={styles.headerActionText}>＋</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroSection}>
          <Text style={styles.heroLabel}>YOUR KITCHEN</Text>
          <Text style={styles.heroTitle}>
            {items.length > 0
              ? `${items.length} Items\nStocked & Ready.`
              : 'Start Building\nYour Pantry.'}
          </Text>

          {/* Stat chips */}
          <View style={styles.statRow}>
            {organicPct > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>🌿 {organicPct}% Organic</Text>
              </View>
            )}
            {lowItems.length > 0 && (
              <View style={[styles.statChip, styles.statChipWarning]}>
                <Text style={[styles.statChipText, { color: Colors.error }]}>
                  ⚠ {lowItems.length} Running Low
                </Text>
              </View>
            )}
            {items.length > 0 && (
              <View style={[styles.statChip, styles.statChipGreen]}>
                <Text style={[styles.statChipText, { color: Colors.onPrimaryContainer }]}>
                  ✅ {items.filter((i) => !i.isLow).length} Fresh
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Bento Category Grid ── */}
        {items.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.bentoSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bentoScroll}
            >
              <CategoryBentoCard
                category="fridge"
                items={getCategoryItems('fridge')}
                isActive={activeCategory === 'fridge'}
                onPress={() => setActiveCategory(activeCategory === 'fridge' ? 'all' : 'fridge')}
                delay={0}
              />
              <CategoryBentoCard
                category="pantry"
                items={getCategoryItems('pantry')}
                isActive={activeCategory === 'pantry'}
                onPress={() => setActiveCategory(activeCategory === 'pantry' ? 'all' : 'pantry')}
                delay={60}
              />
              <CategoryBentoCard
                category="freezer"
                items={getCategoryItems('freezer')}
                isActive={activeCategory === 'freezer'}
                onPress={() => setActiveCategory(activeCategory === 'freezer' ? 'all' : 'freezer')}
                delay={120}
              />
              <CategoryBentoCard
                category="spices"
                items={getCategoryItems('spices')}
                isActive={activeCategory === 'spices'}
                onPress={() => setActiveCategory(activeCategory === 'spices' ? 'all' : 'spices')}
                delay={180}
              />
              <CategoryBentoCard
                category="other"
                items={getCategoryItems('other')}
                isActive={activeCategory === 'other'}
                onPress={() => setActiveCategory(activeCategory === 'other' ? 'all' : 'other')}
                delay={240}
              />
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Search ── */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${activeCategory === 'all' ? 'all items' : CATEGORY_LABELS[activeCategory as IngredientCategory]}...`}
              placeholderTextColor={Colors.outline}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Items List ── */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={Colors.primary} size="large" />
        ) : displayed.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥬</Text>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? 'Your pantry is empty' : 'No items found'}
            </Text>
            <Text style={styles.emptySub}>
              {items.length === 0
                ? 'Snap a photo of your fridge or add items manually to get started.'
                : 'Try a different search or category.'}
            </Text>
            {items.length === 0 && (
              <TouchableOpacity
                style={styles.scanPromptBtn}
                onPress={() => router.push('/scan')}
              >
                <Text style={styles.scanPromptBtnText}>📷  Scan Your Fridge</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          <Animated.View style={styles.itemsGrid} layout={LinearTransition.springify()}>
            {/* Section header */}
            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>
                {activeCategory === 'all'
                  ? `All Items (${displayed.length})`
                  : `${CATEGORY_LABELS[activeCategory as IngredientCategory]} (${displayed.length})`}
              </Text>
              {activeCategory !== 'all' && (
                <TouchableOpacity onPress={() => setActiveCategory('all')}>
                  <Text style={styles.clearFilterText}>Show all ×</Text>
                </TouchableOpacity>
              )}
            </View>

            {displayed.map((item, i) => (
              <IngredientCard
                key={item.id}
                item={item}
                index={i}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
          </Animated.View>
        )}

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* ── FAB Row ── */}
      <Animated.View style={[styles.fabContainer, fabAnimStyle]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/scan')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>📷</Text>
          <Text style={styles.fabText}>Scan Fridge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabSecondary}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabSecondaryText}>＋ Add Manually</Text>
        </TouchableOpacity>
      </Animated.View>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(item) => addItem(item)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
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
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: { fontSize: 22, color: Colors.onPrimary, lineHeight: 28, fontWeight: '300' },

  scroll: { flex: 1 },

  // Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.onSurface,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  statRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  statChipWarning: { borderColor: Colors.error + '60', backgroundColor: Colors.errorContainer + '20' },
  statChipGreen: { borderColor: Colors.primaryContainer, backgroundColor: Colors.primaryContainer + '80' },
  statChipText: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },

  // Bento
  bentoSection: { marginBottom: 4 },
  bentoScroll: { paddingHorizontal: 20, gap: 10 },
  bentoCard: {
    width: 82,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  bentoCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bentoPressable: {
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  bentoEmoji: { fontSize: 22 },
  bentoCount: { fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  bentoCountActive: { color: Colors.onPrimary },
  bentoLabel: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant },
  bentoLabelActive: { color: Colors.onPrimary },
  bentoBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  bentoBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // Search
  searchRow: { paddingHorizontal: 20, paddingVertical: 12 },
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
  clearSearch: { fontSize: 14, color: Colors.outline, padding: 2 },

  // Items
  itemsGrid: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listSectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant },
  clearFilterText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Ingredient Card
  ingredientCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  lowBanner: {
    backgroundColor: Colors.error + '15',
    borderBottomWidth: 1,
    borderBottomColor: Colors.error + '30',
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  lowBannerText: { fontSize: 11, fontWeight: '700', color: Colors.error },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  ingredientSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  ingredientSubLow: { color: Colors.error },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 12, color: Colors.outline },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },
  progressPct: { fontSize: 11, fontWeight: '700', color: Colors.primary, width: 34, textAlign: 'right' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  scanPromptBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  scanPromptBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  fabIcon: { fontSize: 20 },
  fabText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
  fabSecondary: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  fabSecondaryText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant, marginBottom: 6 },
  modalInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.onSurface,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  catRow: { marginBottom: 20 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipIcon: { fontSize: 16 },
  catChipLabel: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  catChipLabelActive: { color: Colors.onPrimary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', color: Colors.onSurfaceVariant, fontSize: 15 },
  addBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  addBtnText: { fontWeight: '700', color: Colors.onPrimary, fontSize: 15 },
});
