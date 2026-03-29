/**
 * PantryChef Design System — Material Design 3 Green Theme
 * Matches the prototype screens exactly.
 */
export const Colors = {
  // ── Primary ────────────────────────────────────────
  primary: '#006b1b',
  primaryDim: '#005d16',
  primaryContainer: '#91f78e',
  primaryFixed: '#91f78e',
  primaryFixedDim: '#83e881',
  onPrimary: '#d1ffc8',
  onPrimaryContainer: '#005e17',
  onPrimaryFixed: '#00480f',
  onPrimaryFixedVariant: '#00691a',
  inversePrimary: '#91f78e',

  // ── Secondary ──────────────────────────────────────
  secondary: '#874e00',
  secondaryDim: '#764400',
  secondaryContainer: '#ffc791',
  secondaryFixed: '#ffc791',
  secondaryFixedDim: '#ffb467',
  onSecondary: '#fff0e5',
  onSecondaryContainer: '#6a3c00',
  onSecondaryFixed: '#4f2c00',
  onSecondaryFixedVariant: '#774400',

  // ── Tertiary ───────────────────────────────────────
  tertiary: '#00656f',
  tertiaryDim: '#005861',
  tertiaryContainer: '#11eaff',
  tertiaryFixed: '#11eaff',
  tertiaryFixedDim: '#00dbee',
  onTertiary: '#d4f9ff',
  onTertiaryContainer: '#005159',
  onTertiaryFixed: '#003d43',
  onTertiaryFixedVariant: '#005c64',

  // ── Surface ────────────────────────────────────────
  surface: '#ddffe2',
  surfaceBright: '#ddffe2',
  surfaceDim: '#a0e4b1',
  surfaceVariant: '#acecbb',
  surfaceContainer: '#bef5ca',
  surfaceContainerLow: '#cafdd4',
  surfaceContainerHigh: '#b5f0c2',
  surfaceContainerHighest: '#acecbb',
  surfaceContainerLowest: '#ffffff',
  surfaceTint: '#006b1b',

  // ── On-surface ─────────────────────────────────────
  onSurface: '#0b361d',
  onSurfaceVariant: '#3b6447',
  inverseSurface: '#001206',
  inverseOnSurface: '#7ba785',

  // ── Background ─────────────────────────────────────
  background: '#ddffe2',
  onBackground: '#0b361d',

  // ── Outline ────────────────────────────────────────
  outline: '#568061',
  outlineVariant: '#8bb795',

  // ── Error ──────────────────────────────────────────
  error: '#b02500',
  errorDim: '#b92902',
  errorContainer: '#f95630',
  onError: '#ffefec',
  onErrorContainer: '#520c00',

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
    shadowColor: '#0b361d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  fab: {
    shadowColor: '#0b361d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  nav: {
    shadowColor: '#0b361d',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
