import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect, Line, Polygon, Polyline } from 'react-native-svg';
import { useAuth } from '@/hooks/useAuth';
import { usePantry } from '@/hooks/usePantry';
import { useCookbook } from '@/hooks/useCookbook';

// ─── Design tokens ─────────────────────────────────────────────────────────────
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
} as const;

// ─── Icons ────────────────────────────────────────────────────────────────────
type IconProps = { color?: string; size?: number };

function BellIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2C9 2 5 4 5 9V13H13V9C13 4 9 2 9 2Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <Line x1="3" y1="13" x2="15" y2="13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M7.5 15.5C7.5 16.3 8.2 17 9 17C9.8 17 10.5 16.3 10.5 15.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}
function MailIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Rect x="2" y="4" width="14" height="10" rx="2" stroke={color} strokeWidth="1.4" />
      <Polyline points="2,4 9,10.5 16,4" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  );
}
function LeafIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M14 3C14 3 4 4 3 14C3 14 7 10 14 9C14 9 10 12 9 16C13 14 16 10 14 3Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  );
}
function CameraIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Rect x="1" y="5" width="16" height="10" rx="2" stroke={color} strokeWidth="1.4" />
      <Circle cx="9" cy="10" r="2.5" stroke={color} strokeWidth="1.4" />
      <Path d="M6 5V4C6 3.4 6.4 3 7 3H11C11.6 3 12 3.4 12 4V5" stroke={color} strokeWidth="1.4" />
    </Svg>
  );
}
function RecipesIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path d="M11 3C8 3 5 6 5 9.5V13H17V9.5C17 6 14 3 11 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Rect x="5" y="13" width="12" height="3" rx="1" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}
function ShoppingIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path d="M5.5 6H17.5L15.5 15H7.5L5.5 6Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M4 4H5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="9" cy="18" r="1.5" fill={color} />
      <Circle cx="14.5" cy="18" r="1.5" fill={color} />
    </Svg>
  );
}
function StarIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Polygon points="9,2 11.2,6.6 16.4,7.4 12.7,11 13.6,16.2 9,13.8 4.4,16.2 5.3,11 1.6,7.4 6.8,6.6"
        stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </Svg>
  );
}
function UpRightIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Line x1="5" y1="13" x2="13" y2="5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Polyline points="7,5 13,5 13,11" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function HelpIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.4" />
      <Path d="M7 7C7 5.9 7.9 5 9 5C10.1 5 11 5.9 11 7C11 8 9 8.8 9 10" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Circle cx="9" cy="12.5" r="0.9" fill={color} />
    </Svg>
  );
}
function InfoIcon({ color = '#52796F', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.4" />
      <Line x1="9" y1="8" x2="9" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="9" cy="5.5" r="0.9" fill={color} />
    </Svg>
  );
}
function ChevronRightIcon({ color = '#8FA899', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Polyline points="5,3 9,7 5,11" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      style={[styles.toggle, value && styles.toggleOn]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
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

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function SettingRow({
  icon, label, sub, right, idx, showDivider = true,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  idx: number;
  showDivider?: boolean;
}) {
  return (
    <View>
      {idx > 0 && showDivider && <View style={[styles.divider, { marginLeft: 56 }]} />}
      <View style={styles.settingRow}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>{label}</Text>
          {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
        </View>
        {right ?? <ChevronRightIcon color={C.textTer} />}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout: signOut }   = useAuth();
  const { items }                   = usePantry(user?.uid ?? null);
  const { recipes }                 = useCookbook(user?.uid ?? null);
  const router                      = useRouter();

  const [notifs, setNotifs]   = useState(true);
  const [digest, setDigest]   = useState(false);
  const [organic, setOrganic] = useState(true);

  const displayName = user?.displayName || 'User';
  const email       = user?.email || '';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <StatCards stats={[
            { n: items.length, label: 'Pantry Items' },
            { n: recipes.length, label: 'Saved Recipes' },
            { n: '8', label: 'Scans Done' },
          ]} />
        </View>

        {/* Quick Actions */}
        <Section title="Quick Actions">
          <SettingRow idx={0} icon={<CameraIcon color={C.primaryMid} />}
            label="Scan Ingredients" sub="Add items by photo"
            right={<ChevronRightIcon color={C.textTer} />} />
          <SettingRow idx={1} icon={<RecipesIcon color={C.primaryMid} />}
            label="Find Recipes" sub="AI-powered suggestions"
            right={<ChevronRightIcon color={C.textTer} />} />
          <SettingRow idx={2} icon={<ShoppingIcon color={C.primaryMid} />}
            label="Shopping List" sub="See what you need"
            right={<ChevronRightIcon color={C.textTer} />} />
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <SettingRow idx={0} icon={<BellIcon color={C.primaryMid} />}
            label="Push Notifications" sub="Recipe suggestions & reminders"
            right={<ToggleSwitch value={notifs} onChange={setNotifs} />} />
          <View style={[styles.divider, { marginLeft: 56 }]} />
          <SettingRow idx={1} icon={<MailIcon color={C.primaryMid} />}
            label="Weekly Recipe Digest" sub="Get recipes emailed weekly"
            right={<ToggleSwitch value={digest} onChange={setDigest} />}
            showDivider={false} />
          <View style={[styles.divider, { marginLeft: 56 }]} />
          <SettingRow idx={2} icon={<LeafIcon color={C.primaryMid} />}
            label="Prefer Organic" sub="Filter for organic ingredients"
            right={<ToggleSwitch value={organic} onChange={setOrganic} />}
            showDivider={false} />
        </Section>

        {/* About */}
        <Section title="About">
          <SettingRow idx={0} icon={<StarIcon color={C.primaryMid} />}
            label="Rate PantryChef" sub="Love the app? Leave a review" />
          <SettingRow idx={1} icon={<UpRightIcon color={C.primaryMid} />}
            label="Share with Friends" sub="Spread the word" />
          <SettingRow idx={2} icon={<HelpIcon color={C.primaryMid} />}
            label="Help & Support" sub="" />
          <SettingRow idx={3} icon={<InfoIcon color={C.primaryMid} />}
            label="App Version" sub="1.0.0" right={<Text style={styles.versionText}>1.0.0</Text>} />
        </Section>

        {/* Sign Out */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Powered by <Text style={{ color: C.textSec, fontWeight: '700' }}>Claude AI · Firebase</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Avatar
  avatarSection: { paddingTop: 52, paddingBottom: 24, alignItems: 'center' },
  avatar: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.27, shadowRadius: 18, elevation: 6,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  displayName: { fontSize: 20, fontWeight: '700', color: C.text },
  emailText: { fontSize: 13, color: C.textTer, marginTop: 3 },

  // Stat cards
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statN: { fontSize: 22, fontWeight: '700', color: C.primary, lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '500', color: C.textTer, marginTop: 4 },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: C.textTer, letterSpacing: 0.8,
    marginBottom: 8, paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  divider: { height: 1, backgroundColor: C.border },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  settingLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  settingSub: { fontSize: 12, color: C.textTer, marginTop: 2 },
  versionText: { fontSize: 13, color: C.textTer },

  // Toggle
  toggle: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: C.border,
    justifyContent: 'center', flexShrink: 0,
  },
  toggleOn: { backgroundColor: C.primary },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    marginLeft: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 2,
  },
  toggleThumbOn: { marginLeft: 21 },

  // Sign out
  signOutBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 16,
    backgroundColor: C.errorLight, alignItems: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: C.error },

  footerText: { textAlign: 'center', marginTop: 20, fontSize: 11, color: C.textTer },
});
