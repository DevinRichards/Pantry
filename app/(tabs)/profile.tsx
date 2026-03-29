import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  right,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingIcon}>
        <Text style={styles.settingIconText}>{icon}</Text>
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel && <Text style={styles.settingSubLabel}>{sublabel}</Text>}
      </View>
      {right ?? (onPress && <Text style={styles.chevron}>›</Text>)}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const stats = [
    { label: 'Pantry Items', value: '—', icon: '🥦' },
    { label: 'Saved Recipes', value: '—', icon: '📖' },
    { label: 'Scans Done', value: '—', icon: '📷' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🍃</Text>
          <Text style={styles.headerTitle}>PantryChef</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>
            {user?.displayName ?? 'Chef'}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.statRow}>
            {stats.map(({ label, value, icon }) => (
              <View key={label} style={styles.statCell}>
                <Text style={styles.statIcon}>{icon}</Text>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            <SettingRow
              icon="📷"
              label="Scan Ingredients"
              sublabel="Add items by photo"
              onPress={() => router.push('/scan')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🍳"
              label="Find Recipes"
              sublabel="AI-powered suggestions"
              onPress={() => router.push('/(tabs)/recipes')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🛒"
              label="Shopping List"
              sublabel="See what you need"
              onPress={() => router.push('/(tabs)/shopping')}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingRow
              icon="🔔"
              label="Push Notifications"
              sublabel="Recipe suggestions & reminders"
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: Colors.outlineVariant, true: Colors.primaryContainer }}
                  thumbColor={notifications ? Colors.primary : Colors.outline}
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow
              icon="📧"
              label="Weekly Recipe Digest"
              sublabel="Get recipes emailed weekly"
              right={
                <Switch
                  value={weeklyDigest}
                  onValueChange={setWeeklyDigest}
                  trackColor={{ false: Colors.outlineVariant, true: Colors.primaryContainer }}
                  thumbColor={weeklyDigest ? Colors.primary : Colors.outline}
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🌿"
              label="Dietary Preferences"
              sublabel="Set restrictions & preferences"
              onPress={() => Alert.alert('Coming Soon', 'Dietary preferences will be available in a future update.')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🌍"
              label="Cuisine Preferences"
              sublabel="Favourite cuisines for suggestions"
              onPress={() => Alert.alert('Coming Soon', 'Cuisine preferences will be available in a future update.')}
            />
          </View>
        </View>

        {/* About & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingRow
              icon="⭐"
              label="Rate PantryChef"
              sublabel="Love the app? Leave us a review"
              onPress={() => Alert.alert('Thank you!', 'Rating will open the App Store in production.')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="↗️"
              label="Share with Friends"
              sublabel="Spread the word"
              onPress={() => Alert.alert('Share', 'Sharing sheet would open here.')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="❓"
              label="Help & Support"
              onPress={() => Alert.alert('Support', 'support@pantrychef.app')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="ℹ️"
              label="App Version"
              sublabel="1.0.0"
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Powered by badge */}
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.poweredByBrand}>Claude AI · Firebase</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  profileCard: {
    margin: 20,
    marginTop: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: Colors.onPrimary },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  email: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 20 },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.onSurface },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant, textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconText: { fontSize: 20 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  settingSubLabel: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.outline, fontWeight: '300' },
  divider: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 72 },
  signOutBtn: {
    backgroundColor: Colors.errorContainer,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signOutText: { color: Colors.onError, fontWeight: '700', fontSize: 16 },
  poweredBy: { alignItems: 'center', gap: 4, marginBottom: 8 },
  poweredByText: { fontSize: 12, color: Colors.outline },
  poweredByBrand: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant },
});
