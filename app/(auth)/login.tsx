import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAuth } from '@/hooks/useAuth';

// ─── Design tokens — matches the botanical editorial system used across all screens
const C = {
  bg:           '#F3F5F2',
  surface:      '#FFFFFF',
  text:         '#111916',
  textSec:      '#4A5E54',
  textTer:      '#8FA899',
  border:       '#E4EBE6',
  primary:      '#1B4332',
  primaryLight: '#D8F3DC',
  primaryMid:   '#52796F',
  error:        '#B91C1C',
  errorLight:   '#FEF2F2',
} as const;

// ─── Leaf logo mark (SVG)
function LeafMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="18" fill={C.primary} />
      <Path
        d="M18 8C18 8 10 13 10 20C10 24.4 13.6 28 18 28C22.4 28 26 24.4 26 20C26 13 18 8 18 8Z"
        fill={C.primaryLight}
      />
      <Path
        d="M18 28V16"
        stroke={C.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M18 21C18 21 14 18 12 15"
        stroke={C.primary}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand mark ── */}
        <View style={styles.brand}>
          <LeafMark size={52} />
          <Text style={styles.appName}>Pantry</Text>
          <Text style={styles.tagline}>Your AI kitchen companion</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your account</Text>

          {/* Email */}
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.textTer}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />

          {/* Password */}
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.textTer}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.btn, submitting && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity hitSlop={8}>
                <Text style={styles.footerLink}>Sign up free</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* ── Feature bullets ── */}
        <View style={styles.features}>
          {[
            { icon: '📸', label: 'Scan your fridge & pantry instantly' },
            { icon: '🤖', label: 'AI recipes from what you have' },
            { icon: '🛒', label: 'Smart shopping lists, auto-generated' },
          ].map(f => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // ── Brand
  brand: { alignItems: 'center', marginBottom: 32, gap: 10 },
  appName: {
    fontSize: 34, fontWeight: '800', color: C.text,
    letterSpacing: -0.8, marginTop: 4,
  },
  tagline: { fontSize: 14, color: C.textTer, fontWeight: '500' },

  // ── Card
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: C.textTer, marginBottom: 24 },

  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: C.textTer,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
    marginBottom: 16,
  },

  btn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 13, color: C.textTer },
  footerLink: { fontSize: 13, fontWeight: '700', color: C.primaryMid },

  // ── Feature bullets
  features: { width: '100%', gap: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: { fontSize: 20 },
  featureLabel: { fontSize: 13, fontWeight: '500', color: C.textSec, flex: 1 },
});
