import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line } from 'react-native-svg';
import { CookbookRecipe, useCookbook } from '@/hooks/useCookbook';
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
  primaryMid:   '#52796F',
  primaryLight: '#D8F3DC',
} as const;

// ─── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ color = '#8FA899', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.5" />
      <Line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CookbookScreen() {
  const { user }                     = useAuth();
  const { recipes, removeRecipe }    = useCookbook(user?.uid ?? null);
  const router                       = useRouter();
  const [search, setSearch]          = useState('');
  const [filter, setFilter]          = useState<'all' | 'full' | 'partial'>('all');
  const deferredSearch               = useDeferredValue(search);

  const shown = useMemo(() => {
    const searchValue = deferredSearch.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesSearch = !searchValue || r.title.toLowerCase().includes(searchValue);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'full' && !r.missingIngredients?.length) ||
        (filter === 'partial' && !!r.missingIngredients?.length);
      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, filter, recipes]);

  const canMakeCount = useMemo(
    () => recipes.filter((r) => !r.missingIngredients?.length).length,
    [recipes]
  );

  const handleRecipePress = (recipeId: string) => {
    router.push({ pathname: '/recipe/[id]', params: { id: recipeId } });
  };

  const renderRecipe = ({ item }: { item: CookbookRecipe }) => {
    const canMake = !item.missingIngredients?.length;

    return (
      <TouchableOpacity style={styles.recipeCard}
        onPress={() => handleRecipePress(item.id)} activeOpacity={0.9}>
        <View style={styles.heroImageWrap}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.primaryMid }]} />
          )}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(8,20,12,0.35)' }]} />
          {canMake && (
            <View style={styles.canMakeBadge}>
              <Text style={styles.canMakeBadgeText}>Can Make</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={e => { e.stopPropagation(); removeRecipe(item.id); }}
            hitSlop={8}>
            <Text style={{ color: '#fff', fontSize: 11 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardMeta}>
              {[item.cookTime ? `${item.cookTime} min` : null, item.difficulty]
                .filter(Boolean).join(' · ')}
            </Text>
            <View style={styles.cardRight}>
              {item.savedAt && (
                <Text style={styles.savedText}>
                  Saved {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              )}
              <View style={styles.cookBtn}>
                <Text style={styles.cookBtnText}>Cook →</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipe}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, gap: 14 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Your Collection</Text>
            <Text style={styles.heroTitle}>Cookbook</Text>
            <StatCards stats={[
              { n: recipes.length, label: 'Saved' },
              { n: canMakeCount, label: 'Can Make' },
              { n: '4.5', label: 'Avg Rating' },
            ]} />

            <View style={styles.searchBar}>
              <SearchIcon color={C.textTer} />
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="Search your cookbook…" placeholderTextColor={C.textTer}
                style={styles.searchInput} />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={{ fontSize: 12, color: C.textTer }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterRow}>
              {([
                ['all', 'All Recipes'],
                ['full', 'Can Make'],
                ['partial', 'Need Ingredients'],
              ] as const).map(([v, l]) => (
                <PillChip key={v} label={l} active={filter === v} onPress={() => setFilter(v)} />
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📖</Text>
            <Text style={styles.emptyTitle}>
              {recipes.length === 0 ? 'Your cookbook is empty' : 'No recipes match'}
            </Text>
            {recipes.length === 0 && (
              <Text style={styles.emptySub}>
                Generate recipes and save your favourites here.
              </Text>
            )}
          </View>
        )}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: '600', color: C.textTer, letterSpacing: 1.1, marginBottom: 6 },
  heroTitle: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5, marginBottom: 0 },

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

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  // Filter
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
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
  pillLabel: { fontSize: 13, fontWeight: '500', color: C.textSec },
  pillLabelActive: { fontWeight: '600', color: '#fff' },

  // Recipe cards
  recipeCard: {
    backgroundColor: C.surface, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
  },
  heroImageWrap: { height: 165, position: 'relative' },
  canMakeBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  canMakeBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
  removeBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { fontSize: 12, color: C.textTer },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedText: { fontSize: 12, color: C.textTer },
  cookBtn: {
    backgroundColor: C.primaryLight, borderRadius: 100, paddingHorizontal: 13, paddingVertical: 5,
  },
  cookBtnText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: C.textSec },
  emptySub: { fontSize: 12, color: C.textTer, textAlign: 'center', marginTop: 4 },
});
