import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import { PantryItem, IngredientCategory, NeedsReviewItem } from '@/types';
import { usePantry } from '@/hooks/usePantry';
import { useAuth } from '@/hooks/useAuth';
import { getNeedsReviewItems, dismissNeedsReviewItem } from '@/services/cookedRecipes';

// ─── Design tokens — matched 1:1 to pantry-tokens.jsx forest/light ────────────
const C = {
  bg:           '#F3F5F2',
  surface:      '#FFFFFF',
  text:         '#111916',
  textSec:      '#4A5E54',
  textTer:      '#8FA899',
  border:       '#E4EBE6',
  error:        '#B91C1C',
  errorLight:   '#FEF2F2',
  primary:      '#1B4332',
  primaryMid:   '#52796F',
  primaryLight: '#D8F3DC',
  inputBg:      '#F3F5F2',
  amber:        '#B45309',
  amberLight:   '#FEF3C7',
} as const;

// CAT_DOT colors — matched to pantry-tokens.jsx
const CAT_DOT: Record<IngredientCategory, string> = {
  fridge:  '#3B82F6',
  pantry:  '#16A34A',
  freezer: '#6366F1',
  spices:  '#EA580C',
  other:   '#6B7280',
};

const CAT_LABEL: Record<IngredientCategory, string> = {
  fridge: 'Fridge', pantry: 'Pantry', freezer: 'Freezer', spices: 'Spices', other: 'Other',
};

const CATS: (IngredientCategory | 'all')[] = ['all', 'fridge', 'pantry', 'freezer', 'spices'];
const CAT_DISPLAY: Record<string, string> = {
  all: 'All', fridge: 'Fridge', pantry: 'Pantry', freezer: 'Freezer', spices: 'Spices',
};

// ─── Camera icon (SVG, matches Icons.Camera in tokens) ───────────────────────
function CameraIcon({ color = '#52796F', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect x="1" y="4" width="14" height="9" rx="2" stroke={color} strokeWidth="1.3" />
      <Circle cx="8" cy="8.5" r="2.3" stroke={color} strokeWidth="1.3" />
      <Path d="M5.5 4V3C5.5 2.4 5.9 2 6.5 2H9.5C10.1 2 10.5 2.4 10.5 3V4" stroke={color} strokeWidth="1.3" />
    </Svg>
  );
}

// ─── Plus icon (SVG) ─────────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Line x1="9" y1="3" x2="9" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <Line x1="3" y1="9" x2="15" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Pill Chip — matches PillChip in pantry-shared.jsx exactly ────────────────
function PillChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Ingredient Card — single flat row, matches design exactly ────────────────
function IngredientCard({
  item, index, onDelete, selectMode, selected, onSelect,
}: {
  item: PantryItem; index: number; onDelete: () => void;
  selectMode: boolean; selected: boolean; onSelect: () => void;
}) {
  const pct = item.amount && item.maxAmount
    ? Math.min(100, Math.round((item.amount / item.maxAmount) * 100))
    : null;
  const isLow = pct !== null && pct <= 25;
  const borderColor = selected
    ? C.primary
    : isLow
    ? C.error
    : CAT_DOT[item.category] ?? C.border;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(18)}
      layout={LinearTransition.springify()}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
        onPress={selectMode ? onSelect : undefined}
        style={[styles.card, { borderLeftColor: borderColor }, selected && styles.cardSelected]}
      >
        {/* Checkbox — select mode only */}
        {selectMode && (
          <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
        )}

        {/* Name + subtitle — flex:1 */}
        <View style={styles.cardText}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardSub, isLow && !selectMode && { color: C.error }]}>
            {item.expiryDate
              ? `Expires ${item.expiryDate}`
              : (item.quantity || CAT_LABEL[item.category])}
            {isLow && !selectMode ? ' · Running low' : ''}
          </Text>
        </View>

        {/* Pct + mini progress bar — hidden in select mode */}
        {pct !== null && !selectMode && (
          <View style={styles.pctCol}>
            <Text style={[styles.pctText, isLow && { color: C.error }]}>{pct}%</Text>
            <View style={styles.miniTrack}>
              <View style={[styles.miniFill, {
                width: `${pct}%` as `${number}%`,
                backgroundColor: isLow ? C.error : C.primary,
              }]} />
            </View>
          </View>
        )}

        {/* × delete — hidden in select mode */}
        {!selectMode && (
          <TouchableOpacity onPress={onDelete} style={styles.xBtn} hitSlop={8}>
            <Text style={styles.xBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Add Item Modal (BottomSheet) ─────────────────────────────────────────────
function AddItemModal({
  visible, onClose, onAdd,
}: {
  visible: boolean; onClose: () => void;
  onAdd: (item: Omit<PantryItem, 'id' | 'addedAt'>) => void;
}) {
  const [name, setName]         = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('fridge');
  const cats: IngredientCategory[] = ['fridge', 'pantry', 'freezer', 'spices', 'other'];

  const swipeHandler = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, { dy }) => dy > 5,
      onPanResponderRelease:        (_, { dy, vy }) => { if (dy > 60 || vy > 0.8) onClose(); },
    })
  ).current;

  const handleAdd = () => {
    if (!name.trim()) { Alert.alert('Missing Name', 'Please enter an ingredient name.'); return; }
    onAdd({ name: name.trim(), quantity: quantity.trim() || '1', category });
    setName(''); setQuantity(''); setCategory('fridge');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            {/* Swipe handle */}
            <View style={styles.handleArea} {...swipeHandler.panHandlers}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.modalTitle}>Add Ingredient</Text>

            {/* Name */}
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName}
              placeholder="e.g. Free Range Eggs" placeholderTextColor={C.textTer}
              autoFocus returnKeyType="next" />

            {/* Quantity */}
            <Text style={styles.fieldLabel}>QUANTITY</Text>
            <TextInput style={styles.modalInput} value={quantity} onChangeText={setQuantity}
              placeholder="e.g. 6 pieces, 500 g" placeholderTextColor={C.textTer}
              returnKeyType="done" onSubmitEditing={handleAdd} />

            {/* Category */}
            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.catRow}>
              {cats.map(cat => (
                <PillChip key={cat} label={CAT_LABEL[cat]}
                  active={category === cat} onPress={() => setCategory(cat)} />
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !name.trim() && styles.confirmBtnDisabled]}
                onPress={handleAdd} disabled={!name.trim()}>
                <Text style={[styles.confirmBtnText, !name.trim() && styles.confirmBtnTextDisabled]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PantryScreen() {
  const { user } = useAuth();
  const { items, loading, addItem, removeItem, removeItems, refetch } =
    usePantry(user?.uid ?? null);
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [showAdd, setShowAdd]         = useState(false);
  const [activeCat, setActiveCat]     = useState<IngredientCategory | 'all'>('all');
  const [needsReview, setNeedsReview] = useState<NeedsReviewItem[]>([]);
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      refetch();
      if (!user?.uid) {
        setNeedsReview([]);
        return;
      }
      getNeedsReviewItems(user.uid).then(setNeedsReview);
    }, [refetch, user?.uid])
  );

  const handleDismissReview = async (id: string) => {
    if (!user?.uid) return;
    const updated = await dismissNeedsReviewItem(user.uid, id);
    setNeedsReview(updated);
  };

  const lowCount = useMemo(() => items.filter((item) => item.isLow).length, [items]);
  const displayed = useMemo(
    () => items.filter((item) => activeCat === 'all' || item.category === activeCat),
    [activeCat, items]
  );
  const allDisplayedSelected = useMemo(
    () => displayed.length > 0 && displayed.every((item) => selectedIds.has(item.id)),
    [displayed, selectedIds]
  );

  const handleDelete = (id: string) => {
    Alert.alert('Remove Item', 'Remove this item from your pantry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(id) },
    ]);
  };

  const enterSelect  = () => { setSelectMode(true); setSelectedIds(new Set()); };
  const exitSelect   = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
  };
  const selectAll = () => {
    setSelectedIds(allDisplayedSelected ? new Set() : new Set(displayed.map((item) => item.id)));
  };
  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (!count) return;
    Alert.alert('Remove Items', `Remove ${count} item${count === 1 ? '' : 's'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: `Remove ${count}`, style: 'destructive', onPress: async () => {
        await removeItems(Array.from(selectedIds)); exitSelect();
      }},
    ]);
  };

  // Design: header padding = insets.top + 12 (matches 52px in HTML where StatusBar mock is 44px)
  const headerPaddingTop = insets.top + 12;

  return (
    <View style={styles.root}>

      {/* ── Header ── matches <div style={{ padding:'52px 20px 0' }}> ── */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        {selectMode ? (
          /* Select mode header */
          <>
            <TouchableOpacity onPress={exitSelect} hitSlop={8}>
              <Text style={styles.selectBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.selectCount}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select Items'}
            </Text>
            <TouchableOpacity onPress={handleDeleteSelected} disabled={!selectedIds.size} hitSlop={8}>
              <Text style={[styles.selectDelete, !selectedIds.size && { opacity: 0.3 }]}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Normal header — left column + right buttons */
          <>
            {/* Left: eyebrow + title + stats */}
            <View style={{ flex: 1 }}>
              {/* Eyebrow: "My Kitchen" — 11px 600w textTer 0.1em spacing uppercase */}
              <Text style={styles.eyebrow}>My Kitchen</Text>
              {/* Title: "{n} Items" — 30px 700w */}
              <Text style={styles.heroTitle}>
                {items.length > 0 ? `${items.length} Items` : 'Pantry'}
              </Text>
              {/* Stats row */}
              <View style={styles.statsRow}>
                {lowCount > 0 && (
                  <View style={styles.lowPill}>
                    <Text style={styles.lowPillText}>{lowCount} running low</Text>
                  </View>
                )}
                {items.length > 0 && (
                  <Text style={styles.freshText}>{items.length - lowCount} fresh</Text>
                )}
              </View>
            </View>

            {/* Right: Scan pill + 42×42 green circle + */}
            <View style={styles.headerRight}>
              {/* Scan button: surface bg, 1.5px border, borderRadius:100, 9px 14px padding */}
              <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/scan')} activeOpacity={0.8}>
                <CameraIcon color={C.primaryMid} size={15} />
                <Text style={styles.scanBtnText}>Scan</Text>
              </TouchableOpacity>
              {/* + button: 42×42 circle, primary bg, shadow */}
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
                <PlusIcon />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Needs Review Banner — amberLight bg, 18px margin, border amber30 ── */}
      {needsReview.length > 0 && (
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.reviewBanner}>
          <View style={styles.reviewBannerRow}>
            <Text style={styles.reviewBannerTitle}>⚠ Needs Review</Text>
            <Text style={styles.reviewBannerSub}>Adjust manually</Text>
          </View>
          {needsReview.map((item, i) => (
            <Animated.View key={item.id}
              entering={FadeInDown.delay(i * 40).springify()}
              layout={LinearTransition.springify()}
              style={styles.reviewItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewItemName}>{item.ingredientName}</Text>
                <Text style={styles.reviewItemSrc}>· from {item.recipeName}</Text>
              </View>
              <TouchableOpacity style={styles.reviewDismiss}
                onPress={() => handleDismissReview(item.id)}>
                <Text style={styles.reviewDismissText}>Done ✓</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* ── Category Pills — horizontal scroll, 18px margin top ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}>
        {CATS.map(cat => (
          <PillChip key={cat} label={CAT_DISPLAY[cat]}
            active={activeCat === cat} onPress={() => setActiveCat(cat)} />
        ))}
      </ScrollView>

      {/* ── Item List ── */}
      <FlatList
        style={{ flex: 1 }}
        data={displayed}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <IngredientCard item={item} index={index}
            onDelete={() => handleDelete(item.id)}
            selectMode={selectMode} selected={selectedIds.has(item.id)}
            onSelect={() => toggleSelect(item.id)} />
        )}
        ListHeaderComponent={displayed.length > 0 ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              {activeCat === 'all' ? 'ALL ITEMS' : CAT_DISPLAY[activeCat].toUpperCase()} · {displayed.length}
            </Text>
            {selectMode ? (
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectLink}>
                  {allDisplayedSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={enterSelect}>
                <Text style={styles.selectLink}>Select</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={C.primary} size="large" />
          ) : (
            <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>
                {items.length === 0 ? 'Your pantry is empty' : `Nothing in ${CAT_DISPLAY[activeCat]}`}
              </Text>
              <Text style={styles.emptySub}>
                {items.length === 0 ? 'Scan your fridge or add items manually.' : 'Tap + to add an item'}
              </Text>
            </Animated.View>
          )
        }
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
      />

      {/* ── Select Bar (floating, above tab bar) ── */}
      {selectMode && (
        <Animated.View entering={FadeInDown.springify()}
          style={[styles.selectBar, { bottom: insets.bottom + 68 + 12 }]}>
          <Text style={styles.selectBarLabel}>
            {selectedIds.size === 0 ? 'Tap items to select'
              : `${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'} selected`}
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, !selectedIds.size && { opacity: 0.4 }]}
            onPress={handleDeleteSelected} disabled={!selectedIds.size} activeOpacity={0.8}>
            <Text style={styles.deleteBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <AddItemModal visible={showAdd} onClose={() => setShowAdd(false)}
        onAdd={item => addItem(item)} />
    </View>
  );
}

// ─── Styles — every value traced back to the design source ────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Header
  // Design: padding:'52px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start'
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  eyebrow: {
    // Design: fontSize:11, fontWeight:600, color:C.textTer, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6
    fontSize: 11, fontWeight: '600', color: C.textTer,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6,
  },
  heroTitle: {
    // Design: fontSize:30, fontWeight:700, color:C.text, letterSpacing:'-0.5px'
    fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5,
  },
  statsRow: {
    // Design: marginTop:8, display:'flex', gap:7, flexWrap:'wrap'
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap',
  },
  lowPill: {
    // Design: fontSize:12, fontWeight:600, color:C.error, background:C.errorLight, padding:'3px 10px', borderRadius:100
    backgroundColor: C.errorLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  lowPillText: { fontSize: 12, fontWeight: '600', color: C.error },
  freshText: {
    // Design: fontSize:12, color:C.textTer, fontWeight:500
    fontSize: 12, color: C.textTer, fontWeight: '500',
  },
  headerRight: {
    // Design: display:'flex', gap:8, alignItems:'center', marginTop:4
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
  },
  scanBtn: {
    // Design: display:'flex', alignItems:'center', gap:7, background:C.surface,
    // border:'1.5px solid C.border', borderRadius:100, padding:'9px 14px', fontSize:13, fontWeight:600
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  scanBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
  addBtn: {
    // Design: width:42, height:42, borderRadius:21, background:C.primary, boxShadow:'0 4px 14px C.primary44'
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.27, shadowRadius: 14, elevation: 6,
  },

  // Select mode header
  selectBtn:    { fontSize: 16, fontWeight: '600', color: C.primary },
  selectCount:  { fontSize: 16, fontWeight: '700', color: C.text },
  selectDelete: { fontSize: 16, fontWeight: '700', color: C.error },

  // ── Needs Review Banner
  // Design: margin:'18px 20px 0', background:C.amberLight, borderRadius:16, padding:'14px 16px', border:'1px solid C.amber30'
  reviewBanner: {
    marginHorizontal: 20, marginTop: 18,
    backgroundColor: C.amberLight, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.amber + '30',
  },
  reviewBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reviewBannerTitle: { fontSize: 13, fontWeight: '700', color: C.amber, flex: 1 },
  reviewBannerSub: { fontSize: 12, color: C.amber, opacity: 0.7 },
  reviewItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reviewItemName: { fontSize: 13, fontWeight: '600', color: C.text },
  reviewItemSrc: { fontSize: 11, color: C.textTer },
  reviewDismiss: {
    backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  reviewDismissText: { fontSize: 11, fontWeight: '700', color: C.primary },

  // ── Category Pills
  // Design: overflowX:'auto', paddingLeft:20, marginTop:18, paddingBottom:4 / gap:8, paddingRight:20
  // `alignItems:'center'` prevents pills from stretching full height in a horizontal ScrollView
  pillsScroll: { marginTop: 18, flexGrow: 0, flexShrink: 0 },
  pillsRow: {
    paddingLeft: 20, paddingRight: 20, gap: 8, paddingBottom: 4,
    alignItems: 'center',  // KEY FIX — stops pills stretching vertically
  },
  // PillChip — matches PillChip in pantry-shared.jsx
  pill: {
    // inactive: background:C.surface, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', padding:'7px 15px', borderRadius:100
    paddingHorizontal: 15, paddingVertical: 7, borderRadius: 100,
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 1,
  },
  pillActive: {
    // active: background:C.primary, boxShadow:'0 2px 8px C.primary44'
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.27, shadowRadius: 8, elevation: 4,
  },
  pillLabel:       { fontSize: 13, fontWeight: '500', color: C.textSec },
  pillLabelActive: { fontWeight: '600', color: '#fff' },

  // ── List
  // Design: padding:'16px 20px 0', display:'flex', flexDirection:'column', gap:8
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 160, gap: 8 },

  // Section header: "ALL ITEMS · N | Select"
  // Design: display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  sectionLabel: {
    // Design: fontSize:11, fontWeight:600, color:C.textTer, letterSpacing:'0.08em'
    fontSize: 11, fontWeight: '600', color: C.textTer, letterSpacing: 0.8,
  },
  selectLink: {
    // Design: fontSize:12, fontWeight:600, color:C.primaryMid
    fontSize: 12, fontWeight: '600', color: C.primaryMid,
  },

  // ── Ingredient card
  // Design: background:C.surface, borderRadius:16, padding:'13px 14px',
  // display:'flex', alignItems:'center', gap:12,
  // boxShadow:'0 1px 0 rgba(0,0,0,0.03), 0 2px 10px rgba(0,0,0,0.05)',
  // borderLeft:'3px solid ...'
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardSelected: { backgroundColor: '#D8F3DC30', borderLeftColor: C.primary },
  cardText: { flex: 1, minWidth: 0 },
  cardName: {
    // Design: fontSize:14, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
    fontSize: 14, fontWeight: '600', color: C.text,
  },
  cardSub: {
    // Design: fontSize:12, color:item.low?C.error:C.textTer, fontWeight:500, marginTop:2
    fontSize: 12, fontWeight: '500', color: C.textTer, marginTop: 2,
  },
  // Pct + mini track column
  pctCol: { alignItems: 'center', gap: 4 },
  pctText: {
    // Design: fontSize:11, fontWeight:700, color:item.low?C.error:C.primary
    fontSize: 11, fontWeight: '700', color: C.primary,
  },
  miniTrack: {
    // Design: width:38, height:4, background:C.border, borderRadius:2, overflow:'hidden'
    width: 38, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden',
  },
  miniFill: { height: '100%', borderRadius: 2 },
  // × button
  xBtn: {
    // Design: width:28, height:28, borderRadius:14, background:C.bg
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  xBtnText: { fontSize: 11, color: C.textTer },

  // Checkbox (select mode)
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Empty state
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSec },
  emptySub: { fontSize: 12, color: C.textTer, textAlign: 'center', marginTop: 4 },

  // ── Select bar (absolute, above tab bar)
  selectBar: {
    position: 'absolute', left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 22,
    paddingVertical: 14, paddingHorizontal: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: C.border,
  },
  selectBarLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.textSec },
  deleteBtn: {
    backgroundColor: C.error, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Modal (BottomSheet — matches BottomSheet in pantry-shared.jsx)
  // Design: position:absolute, inset:0, overlay rgba(0,0,0,0.45)
  // Sheet: background:C.surface, borderRadius:'28px 28px 0 0', padding:'16px 22px 32px', maxHeight:'82%'
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingBottom: 32,
  },
  // Design: width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 20px'
  handleArea: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2 },
  // Design: fontSize:20, fontWeight:700, color:C.text, marginBottom:20
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20 },
  // FieldLabel: fontSize:12, fontWeight:600, color:C.textTer, marginBottom:6, letterSpacing:'0.04em'
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.4,
    marginBottom: 6, textTransform: 'uppercase',
  },
  // TextFieldInput: width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid C.border', background:C.inputBg
  modalInput: {
    width: '100%', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, color: C.text, fontSize: 14, marginBottom: 16,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  // ModalActions: display:'flex', gap:10, marginTop:8
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  // Cancel: flex:1, padding:13, borderRadius:14, border:'1.5px solid C.border', color:C.textSec
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: 'transparent', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.textSec },
  // Confirm: flex:1, padding:13, borderRadius:14, background:C.primary
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: C.border },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  confirmBtnTextDisabled: { color: C.textTer },
});
