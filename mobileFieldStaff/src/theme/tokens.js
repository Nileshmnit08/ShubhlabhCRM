export const colors = {
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#404942',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  outline: '#707971',
  outlineVariant: '#bfc9c0',
  surfaceTint: '#226b47',
  primary: '#0d5c3a',
  onPrimary: '#ffffff',
  primaryContainer: '#0d5c3a',
  onPrimaryContainer: '#8ad2a7',
  inversePrimary: '#8ed6aa',
  secondary: '#d97706',
  onSecondary: '#ffffff',
  secondaryContainer: '#fe932c',
  onSecondaryContainer: '#663500',
  tertiary: '#1e293b',
  onTertiary: '#ffffff',
  tertiaryContainer: '#465165',
  onTertiaryContainer: '#b8c4db',
  error: '#dc2626',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  background: '#f8f9ff',
  onBackground: '#0b1c30',

  status: {
    overdue: { bg: '#FEF2F2', text: '#991B1B', border: '#F87171' },
    pending: { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
    inProgress: { bg: '#F0F9FF', text: '#075985', border: '#7DD3FC' },
    completed: { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
    syncActive: { bg: '#F0FDFA', text: '#115E59', border: '#5EEAD4' },
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
