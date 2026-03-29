import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { ShoppingItem, ShoppingList, ShoppingCategory } from '@/types';
import {
  getShoppingLists,
  createShoppingList,
  addItemToList,
  toggleItemChecked,
  removeItemFromList,
  clearCheckedItems,
} from '@/services/shoppingService';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES: ShoppingCategory[] = [
  'Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Pantry',
  'Frozen', 'Bakery', 'Beverages', 'Snacks', 'Other',
];

const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  'Produce': '🥦',
  'Dairy & Eggs': '🥛',
  'Meat & Seafood': '🥩',
  'Pantry': '📦',
  'Frozen': '❄️',
  'Bakery': '🍞',
  'Beverages': '🥤',
  'Snacks': '🍿',
  'Other': '🛒',
};

const CATEGORY_COLORS: Record<ShoppingCategory, string> = {
  'Produce': Colors.primaryContainer,
  'Dairy & Eggs': '#fff9c4',
  'Meat & Seafood': '#ffebee',
  'Pantry': Colors.surfaceContainerHigh,
  'Frozen': '#e1f5fe',
  'Bakery': Colors.secondaryContainer,
  'Beverages': Colors.tertiaryContainer + '60',
  'Snacks': '#fce4ec',
  'Other': Colors.surfaceContainerLow,
};

// ─── Shopping Item Row ────────────────────────────────────────────────────────

function ShoppingItemRow({
  item,
  index,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(item.isChecked ? 1 : 0);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withTiming(item.isChecked ? 0.65 : 1, { duration: 200 }),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggle = () => {
    checkScale.value = withSpring(item.isChecked ? 0 : 1, { damping: 14 });
    onToggle();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).springify().damping(18)}
      layout={LinearTransition.springify()}
      style={rowStyle}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        style={[styles.itemRow, item.isChecked && styles.itemRowChecked]}
      >
        {/* Checkbox */}
        <TouchableOpacity
          onPress={handleToggle}
          style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}
        >
          <Animated.Text style={[styles.checkmark, checkStyle]}>✓</Animated.Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.isChecked && styles.itemNameChecked]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.itemSubRow}>
            <Text style={styles.itemQty}>{item.quantity}</Text>
            {item.recipeName && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <View style={styles.recipeTag}>
                  <Text style={styles.recipeTagText}>🍳 {item.recipeName}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
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
  onAdd: (item: Omit<ShoppingItem, 'id' | 'addedAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('Produce');

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter an item name.');
      return;
    }
    onAdd({ name: name.trim(), quantity: quantity.trim() || '1', category, isChecked: false });
    setName('');
    setQuantity('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add to List</Text>

          <Text style={styles.fieldLabel}>Item Name</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Parmesan Cheese"
            placeholderTextColor={Colors.outline}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.modalInput}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 200g, 1 bag"
            placeholderTextColor={Colors.outline}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catChip, category === cat && styles.catChipActive]}
              >
                <Text style={styles.catChipIcon}>{CATEGORY_ICONS[cat]}</Text>
                <Text style={[styles.catChipLabel, category === cat && styles.catChipLabelActive]}>
                  {cat}
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

export default function ShoppingScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fabScale = useSharedValue(0);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const fetchList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const lists = await getShoppingLists(user.uid);
      if (lists.length > 0) setList(lists[0]);
      else {
        const newList = await createShoppingList(user.uid);
        setList(newList);
      }
    } catch {
      Alert.alert('Error', 'Could not load shopping list.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useFocusEffect(
    useCallback(() => {
      fetchList();
      fabScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      return () => { fabScale.value = withTiming(0, { duration: 150 }); };
    }, [fetchList])
  );

  const handleAdd = async (item: Omit<ShoppingItem, 'id' | 'addedAt'>) => {
    if (!list) return;
    const updated = await addItemToList(list.id, list.items, item);
    setList((prev) => prev ? { ...prev, items: updated } : prev);
  };

  const handleToggle = async (itemId: string) => {
    if (!list) return;
    const updated = await toggleItemChecked(list.id, list.items, itemId);
    setList((prev) => prev ? { ...prev, items: updated } : prev);
  };

  const handleDelete = async (itemId: string) => {
    if (!list) return;
    const updated = await removeItemFromList(list.id, list.items, itemId);
    setList((prev) => prev ? { ...prev, items: updated } : prev);
  };

  const handleClearChecked = () => {
    const checkedCount = list?.items.filter((i) => i.isChecked).length ?? 0;
    if (checkedCount === 0) return;
    Alert.alert('Clear Checked', `Remove ${checkedCount} checked item${checkedCount > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          if (!list) return;
          const updated = await clearCheckedItems(list.id, list.items);
          setList((prev) => prev ? { ...prev, items: updated } : prev);
        },
      },
    ]);
  };

  const grouped = CATEGORIES.reduce<{ title: ShoppingCategory; data: ShoppingItem[] }[]>(
    (acc, cat) => {
      const catItems = list?.items.filter((i) => i.category === cat) ?? [];
      if (catItems.length > 0) acc.push({ title: cat, data: catItems });
      return acc;
    }, []
  );

  const checkedCount = list?.items.filter((i) => i.isChecked).length ?? 0;
  const totalCount = list?.items.length ?? 0;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🍃</Text>
          <Text style={styles.headerTitle}>PantryChef</Text>
        </View>
        {checkedCount > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearChecked}>
            <Text style={styles.clearBtnText}>Clear Done ✓</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroSection}>
          <Text style={styles.heroLabel}>SMART SHOPPING</Text>
          <Text style={styles.heroTitle}>Shopping List</Text>
          <Text style={styles.heroSub}>
            {totalCount > 0
              ? `${totalCount - checkedCount} item${totalCount - checkedCount !== 1 ? 's' : ''} left to grab`
              : 'Your list is empty'}
          </Text>
        </Animated.View>

        {/* ── Progress Bento Card ── */}
        {totalCount > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.progressCard}>
            <View style={styles.progressStats}>
              <View style={styles.progressStatLeft}>
                <Text style={styles.progressBigNum}>{checkedCount}</Text>
                <Text style={styles.progressStatLabel}>/ {totalCount} items</Text>
              </View>
              <View style={styles.progressStatRight}>
                <Text style={styles.progressPctText}>{pct}%</Text>
                <Text style={styles.progressPctLabel}>complete</Text>
              </View>
            </View>

            <View style={styles.progressTrackWrap}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%` as any },
                    pct === 100 && styles.progressFillComplete,
                  ]}
                />
              </View>
            </View>

            {pct === 100 && (
              <Animated.View entering={ZoomIn.springify()} style={styles.allDoneBanner}>
                <Text style={styles.allDoneText}>🎉 Shopping complete!</Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* ── List Content ── */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={Colors.primary} size="large" />
        ) : totalCount === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>Nothing on your list</Text>
            <Text style={styles.emptySub}>
              Add items manually, or visit a recipe and tap "Shop Missing" to auto-fill ingredients.
            </Text>
          </Animated.View>
        ) : (
          <Animated.View style={styles.listContent} layout={LinearTransition.springify()}>
            {grouped.map((group, gi) => (
              <Animated.View
                key={group.title}
                entering={FadeInDown.delay(gi * 50).springify()}
                style={styles.categoryGroup}
              >
                {/* Category Header */}
                <View style={[styles.categoryHeader, { backgroundColor: CATEGORY_COLORS[group.title] ?? Colors.surfaceContainerLow }]}>
                  <Text style={styles.categoryIcon}>{CATEGORY_ICONS[group.title]}</Text>
                  <Text style={styles.categoryTitle}>{group.title}</Text>
                  <View style={styles.categoryCount}>
                    <Text style={styles.categoryCountText}>
                      {group.data.filter((i) => !i.isChecked).length}/{group.data.length}
                    </Text>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.categoryItems}>
                  {group.data.map((item, idx) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      index={idx}
                      onToggle={() => handleToggle(item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <Animated.View style={[styles.fabContainer, fabStyle]}>
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
          <Text style={styles.fabText}>＋  Add Item</Text>
        </TouchableOpacity>
      </Animated.View>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
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
  clearBtn: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onPrimaryContainer },

  scroll: { flex: 1 },

  heroSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  heroLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2, marginBottom: 8 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontSize: 14, color: Colors.onSurfaceVariant },

  // Progress card
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 20,
  },
  progressStats: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  progressStatLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  progressBigNum: { fontSize: 42, fontWeight: '800', color: Colors.onPrimary, lineHeight: 46 },
  progressStatLabel: { fontSize: 16, color: Colors.onPrimary + 'aa', fontWeight: '600' },
  progressStatRight: { alignItems: 'flex-end' },
  progressPctText: { fontSize: 28, fontWeight: '800', color: Colors.onPrimary },
  progressPctLabel: { fontSize: 12, color: Colors.onPrimary + 'aa', fontWeight: '600' },
  progressTrackWrap: {},
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.onPrimary,
    borderRadius: 8,
  },
  progressFillComplete: { backgroundColor: Colors.primaryContainer },
  allDoneBanner: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  allDoneText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },

  // List
  listContent: { paddingHorizontal: 20, gap: 16 },
  categoryGroup: { gap: 8 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  categoryIcon: { fontSize: 18 },
  categoryTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  categoryCount: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryCountText: { fontSize: 11, fontWeight: '700', color: Colors.onSurface + 'cc' },
  categoryItems: { gap: 8 },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  itemRowChecked: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.outlineVariant + '80',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.onPrimary, fontSize: 14, fontWeight: '800' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.outline },
  itemSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  itemQty: { fontSize: 12, color: Colors.onSurfaceVariant },
  metaDot: { fontSize: 12, color: Colors.outline },
  recipeTag: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recipeTagText: { fontSize: 10, fontWeight: '600', color: Colors.onSecondaryContainer },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 12, color: Colors.outline },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
  },
  fab: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  fabText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.outlineVariant,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
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
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipIcon: { fontSize: 16 },
  catChipLabel: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },
  catChipLabelActive: { color: Colors.onPrimary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow, alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', color: Colors.onSurfaceVariant, fontSize: 15 },
  addBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  addBtnText: { fontWeight: '700', color: Colors.onPrimary, fontSize: 15 },
});
