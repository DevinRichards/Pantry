/**
 * PantryChef Design System — Botanical Editorial Theme
 * Forest green (#1B4332) primary on warm off-white (#F3F5F2) background.
 */
export const Colors = {
  // ── Primary ────────────────────────────────────────
  primary: '#1B4332',
  primaryDim: '#163828',
  primaryContainer: '#D8F3DC',
  primaryFixed: '#D8F3DC',
  primaryFixedDim: '#B7E4BC',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1B4332',
  onPrimaryFixed: '#0D2B1F',
  onPrimaryFixedVariant: '#1B4332',
  inversePrimary: '#D8F3DC',

  // ── Secondary ──────────────────────────────────────
  secondary: '#B45309',
  secondaryDim: '#9A4706',
  secondaryContainer: '#FEF3C7',
  secondaryFixed: '#FEF3C7',
  secondaryFixedDim: '#FDE68A',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#78350F',
  onSecondaryFixed: '#451A03',
  onSecondaryFixedVariant: '#92400E',

  // ── Tertiary ───────────────────────────────────────
  tertiary: '#52796F',
  tertiaryDim: '#435E56',
  tertiaryContainer: '#CAE8E0',
  tertiaryFixed: '#CAE8E0',
  tertiaryFixedDim: '#A8D5CB',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#1D3D37',
  onTertiaryFixed: '#0D2925',
  onTertiaryFixedVariant: '#3A6159',

  // ── Surface ────────────────────────────────────────
  surface: '#FFFFFF',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#DDE5DF',
  surfaceVariant: '#EEF2EF',
  surfaceContainer: '#F3F5F2',
  surfaceContainerLow: '#F7FAF7',
  surfaceContainerHigh: '#EEF2EF',
  surfaceContainerHighest: '#E8EDE9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceTint: '#1B4332',

  // ── On-surface ─────────────────────────────────────
  onSurface: '#111916',
  onSurfaceVariant: '#4A5E54',
  inverseSurface: '#1A2E22',
  inverseOnSurface: '#D8F3DC',

  // ── Background ─────────────────────────────────────
  background: '#F3F5F2',
  onBackground: '#111916',

  // ── Outline ────────────────────────────────────────
  outline: '#8FA899',
  outlineVariant: '#E4EBE6',

  // ── Error ──────────────────────────────────────────
  error: '#B91C1C',
  errorDim: '#991B1B',
  errorContainer: '#FEF2F2',
  onError: '#FFFFFF',
  onErrorContainer: '#7F1D1D',

  // ── Category dot colors ────────────────────────────
  catFridge: '#3B82F6',
  catPantry: '#16A34A',
  catFreezer: '#6366F1',
  catSpices: '#EA580C',
  catOther: '#6B7280',

  // ── White / utility ────────────────────────────────
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const FontFamily = {
  headline: 'PlusJakartaSans-Bold',
  headlineBold: 'PlusJakartaSans-ExtraBold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#111916',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  fab: {
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  nav: {
    shadowColor: '#111916',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;
