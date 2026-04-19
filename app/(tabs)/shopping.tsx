import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { useMemo, useState, useRef } from 'react';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useAuth } from '@/hooks/useAuth';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           '#F3F5F2',
  surface:      '#FFFFFF',
  text:         '#111916',
  textSec:      '#4A5E54',
  textTer:      '#8FA899',
  border:       '#E4EBE6',
  primary:      '#1B4332',
  primaryLight: '#D8F3DC',
  inputBg:      '#F3F5F2',
} as const;

const SHOP_CATS = ['Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Snacks', 'Other'];

// ─── Icons ────────────────────────────────────────────────────────────────────
function CheckIcon({ color = 'white', size = 11 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Polyline points="2,6 5,9 10,3" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Pill Chip ────────────────────────────────────────────────────────────────
function PillChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────
function AddItemModal({
  visible, onClose, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, qty: string, cat: string) => void;
}) {
  const [name, setName] = useState('');
  const [qty, setQty]   = useState('');
  const [cat, setCat]   = useState('Produce');

  const swipeHandler = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderRelease: (_, { dy, vy }) => { if (dy > 60 || vy > 0.8) onClose(); },
    })
  ).current;

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), qty.trim() || '1', cat);
    setName(''); setQty(''); setCat('Produce');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handleArea} {...swipeHandler.panHandlers}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.modalTitle}>Add to List</Text>

            <Text style={styles.fieldLabel}>ITEM NAME</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName}
              placeholder="e.g. Mozzarella" placeholderTextColor={C.textTer}
              autoFocus returnKeyType="next" />

            <Text style={styles.fieldLabel}>QUANTITY</Text>
            <TextInput style={styles.modalInput} value={qty} onChangeText={setQty}
              placeholder="e.g. 250 g, 1 bag" placeholderTextColor={C.textTer}
              returnKeyType="done" onSubmitEditing={handleAdd} />

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.catRow}>
              {['Produce', 'Dairy & Eggs', 'Pantry', 'Bakery', 'Other'].map(c => (
                <PillChip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !name.trim() && styles.confirmBtnDisabled]}
                onPress={handleAdd} disabled={!name.trim()}>
                <Text style={[styles.confirmBtnText, !name.trim() && styles.confirmBtnTextDisabled]}>Add</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ShoppingScreen() {
  const { user }  = useAuth();
  const { items, toggleItem, addItem, removeItem, clearChecked } = useShoppingList(user?.uid ?? null);
  const [showAdd, setShowAdd] = useState(false);
  const insets = useSafeAreaInsets();
  // Tab bar height (49px standard) + device safe area + breathing room
  const fabBottom = insets.bottom + 49 + 16;

  const done  = useMemo(() => items.filter(i => i.done).length, [items]);
  const total = items.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const groups = useMemo(() => {
    const categorized = new Set(SHOP_CATS);
    const grouped = SHOP_CATS.reduce<Array<{ cat: string; items: typeof items }>>((acc, cat) => {
      const groupItems = items.filter((item) => item.category === cat);
      if (groupItems.length > 0) acc.push({ cat, items: groupItems });
      return acc;
    }, []);

    const uncategorized = items.filter((item) => !categorized.has(item.category));
    if (uncategorized.length > 0) {
      const otherGroup = grouped.find((group) => group.cat === 'Other');
      if (otherGroup) otherGroup.items = [...otherGroup.items, ...uncategorized];
      else grouped.push({ cat: 'Other', items: uncategorized });
    }

    return grouped;
  }, [items]);

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 49 + 80 }}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.eyebrow}>Smart Shopping</Text>
          <View style={styles.headerRow}>
            <Text style={styles.heroTitle}>Shopping List</Text>
            {done > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearChecked} activeOpacity={0.8}>
                <Text style={styles.clearBtnText}>Clear done ✓</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress card */}
          <View style={styles.progressCard}>
            <View style={styles.progressCardTop}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={styles.progressDone}>{done}</Text>
                <Text style={styles.progressTotal}>/ {total}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.progressPct}>{pct}%</Text>
                <Text style={styles.progressPctLabel}>complete</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]} />
            </View>
            {pct === 100 && total > 0 && (
              <Text style={styles.progressComplete}>All done — happy cooking! 🎉</Text>
            )}
          </View>
        </View>

        {/* Empty state */}
        {total === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
            <Text style={styles.emptyTitle}>Nothing on your list</Text>
            <Text style={styles.emptySub}>
              Add items manually, or visit a recipe and tap "Shop Missing".
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 20 }}>
            {groups.map(({ cat, items: gi }) => (
              <View key={cat}>
                <Text style={styles.groupLabel}>{cat.toUpperCase()}</Text>
                <View style={styles.groupCard}>
                  {gi.map((item, idx) => (
                    <View key={item.id}>
                      {idx > 0 && <View style={[styles.separator, { marginLeft: 54 }]} />}
                      <TouchableOpacity
                        style={[styles.itemRow, item.done && { opacity: 0.5 }]}
                        onPress={() => toggleItem(item.id)}
                        activeOpacity={0.75}>
                        {/* Checkbox */}
                        <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                          {item.done && <CheckIcon size={11} />}
                        </View>
                        {/* Text */}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, item.done && styles.itemNameDone]}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemMeta}>
                            {item.quantity}
                            {item.forRecipe ? ` · for ${item.forRecipe}` : ''}
                          </Text>
                        </View>
                        {/* Remove */}
                        <TouchableOpacity
                          onPress={e => { e.stopPropagation(); removeItem(item.id); }}
                          style={{ padding: 4 }} hitSlop={8}>
                          <Text style={{ fontSize: 12, color: C.textTer }}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB — sits above the tab bar */}
      <View style={[styles.fabWrap, { bottom: fabBottom }]}>
        <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Text style={styles.fabText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <AddItemModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(name, qty, cat) => addItem({ name, quantity: qty, category: cat })}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header — paddingTop applied dynamically via insets in JSX
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '600', color: C.textTer, letterSpacing: 1.1, marginBottom: 6 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  clearBtn: {
    backgroundColor: C.primaryLight, borderRadius: 100, paddingHorizontal: 13, paddingVertical: 7, flexShrink: 0, marginLeft: 12,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // Progress card
  progressCard: {
    backgroundColor: C.primary, borderRadius: 22, padding: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.27, shadowRadius: 24, elevation: 8,
  },
  progressCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  progressDone: { fontSize: 52, fontWeight: '700', color: '#fff', lineHeight: 56 },
  progressTotal: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  progressPct: { fontSize: 28, fontWeight: '700', color: '#fff' },
  progressPctLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressComplete: {
    marginTop: 10, textAlign: 'center', fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)',
  },

  // Empty
  emptyWrap: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSec, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.textTer, textAlign: 'center', lineHeight: 20 },

  // Groups
  groupLabel: {
    fontSize: 11, fontWeight: '600', color: C.textTer, letterSpacing: 0.8, marginBottom: 8,
  },
  groupCard: {
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  separator: { height: 1, backgroundColor: C.border },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
    borderWidth: 2, borderColor: C.border, backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: C.primary, borderColor: C.primary },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text },
  itemNameDone: { textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 12, color: C.textTer, marginTop: 1 },

  // FAB — bottom is set dynamically (insets.bottom + tabBar + gap)
  fabWrap: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: C.primary, borderRadius: 100,
    paddingHorizontal: 30, paddingVertical: 13,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.27, shadowRadius: 16, elevation: 6,
  },
  fabText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingBottom: 32, paddingTop: 0,
  },
  handleArea: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: C.textTer,
    letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase',
  },
  modalInput: {
    width: '100%', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, color: C.text, fontSize: 14, marginBottom: 16,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: {
    paddingHorizontal: 15, paddingVertical: 7, borderRadius: 100, backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 1,
  },
  pillActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.27, shadowRadius: 8, elevation: 4,
  },
  pillLabel: { fontSize: 13, fontWeight: '500', color: '#4A5E54' },
  pillLabelActive: { fontWeight: '600', color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: 'transparent', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#4A5E54' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: C.border },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  confirmBtnTextDisabled: { color: C.textTer },
});
