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

// ─── Leaf logo mark (SVG) — same as login
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

type Field = {
  label: string;
  placeholder: string;
  secure?: boolean;
  keyboard?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'name' | 'email' | 'password' | 'off';
};

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const { register } = useAuth();
  const router       = useRouter();
  const insets       = useSafeAreaInsets();

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirm) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, displayName.trim());
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Registration Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fields: (Field & { value: string; setter: (v: string) => void })[] = [
    {
      label: 'YOUR NAME', placeholder: 'Chef Jane',
      keyboard: 'default', autoCapitalize: 'words', autoComplete: 'name',
      value: displayName, setter: setDisplayName,
    },
    {
      label: 'EMAIL', placeholder: 'you@example.com',
      keyboard: 'email-address', autoCapitalize: 'none', autoComplete: 'email',
      value: email, setter: setEmail,
    },
    {
      label: 'PASSWORD', placeholder: '••••••••',
      secure: true, autoComplete: 'password',
      value: password, setter: setPassword,
    },
    {
      label: 'CONFIRM PASSWORD', placeholder: '••••••••',
      secure: true, autoComplete: 'off',
      value: confirm, setter: setConfirm,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand mark ── */}
        <View style={styles.brand}>
          <LeafMark size={44} />
          <Text style={styles.appName}>Pantry</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.cardSub}>Free forever · takes 30 seconds</Text>

          {fields.map(f => (
            <View key={f.label}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={C.textTer}
                secureTextEntry={f.secure}
                keyboardType={f.keyboard ?? 'default'}
                autoCapitalize={f.autoCapitalize ?? 'none'}
                autoComplete={f.autoComplete ?? 'off'}
                returnKeyType={f.label === 'CONFIRM PASSWORD' ? 'done' : 'next'}
                onSubmitEditing={f.label === 'CONFIRM PASSWORD' ? handleRegister : undefined}
              />
            </View>
          ))}

          {/* Create Account button */}
          <TouchableOpacity
            style={[styles.btn, submitting && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity hitSlop={8}>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <Text style={styles.legal}>
          By creating an account you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
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
  brand: { alignItems: 'center', marginBottom: 28, gap: 8 },
  appName: {
    fontSize: 30, fontWeight: '800', color: C.text,
    letterSpacing: -0.8,
  },

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
    marginBottom: 20,
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

  legal: {
    fontSize: 11, color: C.textTer, textAlign: 'center',
    lineHeight: 17, paddingHorizontal: 16,
  },
  legalLink: { color: C.primaryMid, fontWeight: '600' },
});
