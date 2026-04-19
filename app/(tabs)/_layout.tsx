import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  PantryIcon,
  RecipesIcon,
  ShoppingIcon,
  CookbookIcon,
  ProfileIcon,
} from '@/constants/TabIcons';
import { useAuth } from '@/hooks/useAuth';

// Design tokens — matched to pantry-tokens.jsx forest theme
const PRIMARY       = '#1B4332';
const PRIMARY_LIGHT = '#D8F3DC';
const TEXT_TER      = '#8FA899';
const BORDER        = '#E4EBE6';

type IconName = 'pantry' | 'recipes' | 'shopping' | 'cookbook' | 'profile';

const ICONS: Record<IconName, (color: string) => React.ReactElement> = {
  pantry:   c => <PantryIcon color={c} size={22} />,
  recipes:  c => <RecipesIcon color={c} size={22} />,
  shopping: c => <ShoppingIcon color={c} size={22} />,
  cookbook: c => <CookbookIcon color={c} size={22} />,
  profile:  c => <ProfileIcon color={c} size={22} />,
};

/**
 * TabIcon — matches the TabBar component in pantry-shared.jsx exactly.
 *
 * Active state: 34×34, borderRadius:10 square container (primaryLight bg)
 * around just the icon. Label below in primary color, weight 700.
 * Inactive: transparent container, textTer color, weight 500.
 */
function TabIcon({ focused, icon, label }: { focused: boolean; icon: IconName; label: string }) {
  const bgOpacity = useSharedValue(focused ? 1 : 0);
  bgOpacity.value = withTiming(focused ? 1 : 0, { duration: 180 });
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const iconColor = focused ? PRIMARY : TEXT_TER;
  const Icon = ICONS[icon];

  return (
    <View style={styles.tabItem}>
      {/* 34×34 rounded-square icon container */}
      <View style={styles.iconWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconActiveBg, bgStyle]} />
        {Icon(iconColor)}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/(auth)/login');
  }, [user, loading]);

  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />
        ),
      }}
    >
      <Tabs.Screen name="index"    options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="pantry"   label="Pantry"   /> }} />
      <Tabs.Screen name="recipes"  options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="recipes"  label="Recipes"  /> }} />
      <Tabs.Screen name="shopping" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="shopping" label="Shopping" /> }} />
      <Tabs.Screen name="cookbook" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="cookbook" label="Cookbook" /> }} />
      <Tabs.Screen name="profile"  options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="profile"  label="Profile"  /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: Platform.OS === 'ios' ? 84 : 68,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  // Makes each icon slot fill the full tab width/height
  tabBarIcon: { width: '100%', height: 56 },

  // Outer tab column: icon container + label
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  // 34×34 borderRadius:10 square — matches design exactly
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconActiveBg: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
  },

  tabLabel: { fontSize: 10, fontWeight: '500', color: TEXT_TER },
  tabLabelActive: { color: PRIMARY, fontWeight: '700' },
});
