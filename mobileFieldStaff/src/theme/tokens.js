export const colors = {
  // Brand Core
  primary: '#176B4D',
  secondary: '#31566B',
  accent: '#E7A62B',
  
  // Backgrounds & Surfaces
  background: '#F7F8F5',
  surface: '#FFFFFF',
  surfaceContainerLow: '#F4F5F2',
  surfaceContainer: '#EAECE7',
  surfaceContainerHigh: '#E1E3DF',
  
  // Text & Icons
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onAccent: '#FFFFFF',
  onBackground: '#1A1C19',
  onSurface: '#1A1C19',
  onSurfaceVariant: '#404943',
  outline: '#707973',
  outlineVariant: '#BFC9C2',
  
  // Extended / Legacy Mappings (Prevent Crashes)
  primaryContainer: '#E8F5E9',
  onPrimaryContainer: '#176B4D',
  inversePrimary: '#E8F5E9',
  secondaryContainer: '#E3F2FD',
  onSecondaryContainer: '#31566B',
  tertiary: '#E7A62B',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFF8E1',
  onTertiaryContainer: '#E7A62B',
  inverseSurface: '#1A1C19',
  inverseOnSurface: '#F7F8F5',
  surfaceTint: '#176B4D',
  surfaceDim: '#E1E3DF',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHighest: '#BFC9C2',
  
  // Semantic
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Status mapping
  status: {
    overdue: { bg: '#FFDAD6', text: '#BA1A1A', border: '#BA1A1A' },
    pending: { bg: '#FFF8E1', text: '#E7A62B', border: '#E7A62B' },
    inProgress: { bg: '#E3F2FD', text: '#31566B', border: '#31566B' },
    completed: { bg: '#E8F5E9', text: '#176B4D', border: '#176B4D' },
    syncActive: { bg: '#E8F5E9', text: '#176B4D', border: '#176B4D' },
  }
};

export const typography = {
  headlineLg: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  headlineLgMobile: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  headlineMd: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  headlineSm: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  bodyLg: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySm: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  labelLg: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  labelMd: { fontSize: 13, fontWeight: '600', lineHeight: 16 },
  labelSm: { fontSize: 11, fontWeight: '700', lineHeight: 14, letterSpacing: 0.44 },
  currencyDisplay: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
  margin: 16,
};

export const rounded = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const touchTargets = {
  min: 48,
  standard: 52,
  stepper: 54,
};

export const elevation = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#0f1722',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  level2: {
    shadowColor: '#0f1722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  level3: {
    shadowColor: '#0f1722',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  }
};
