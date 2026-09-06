// Shubh Labh CRM Mobile Design System Tokens (Stitch Light Mode)

export const theme = {
  colors: {
    // Brand Core
    primary: '#000000',
    onPrimary: '#ffffff',
    primaryContainer: '#131b2e',
    onPrimaryContainer: '#7c839b',
    secondary: '#0051d5',
    onSecondary: '#ffffff',
    secondaryContainer: '#316bf3',
    onSecondaryContainer: '#fefcff',
    secondaryFixed: '#dbe1ff',
    onSecondaryFixed: '#00174b',
    
    // Background & Surface
    background: '#f8f9ff',
    onBackground: '#0b1c30',
    surface: '#f8f9ff',
    onSurface: '#0b1c30',
    onSurfaceVariant: '#45464d',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#eff4ff',
    surfaceContainer: '#e5eeff',
    surfaceContainerHigh: '#dce9ff',
    surfaceContainerHighest: '#d3e4fe',
    
    // Status
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    success: '#10b981',
    successContainer: '#ecfdf5',
    onSuccessContainer: '#047857',
    warning: '#f59e0b',
    warningContainer: '#fffbeb',
    onWarningContainer: '#b45309',
    info: '#0284C7',
    infoContainer: '#F0F9FF',
    onInfoContainer: '#0369A1',

    // Borders & Lines
    outline: '#76777d',
    outlineVariant: '#c6c6cd',
    border: '#e2e8f0', // standard card border
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    'screen-edge': 16,
    'gutter-card': 12,
    'touch-target': 48,
    'touch-target-dense': 44,
  },
  typography: {
    fontFamily: {
      display: 'Plus Jakarta Sans',
      body: 'Inter',
    },
    sizes: {
      labelSm: 11,
      labelMd: 12,
      labelLg: 14,
      bodySm: 13,
      bodyMd: 14,
      bodyLg: 16,
      titleMd: 16,
      headlineSm: 18,
      headlineLg: 22,
      displayMd: 26,
      displayLg: 32,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  borders: {
    radius: {
      sm: 4,
      md: 8, // Standard Card
      lg: 12, // Bottom Sheet Top
      full: 9999, // Pills & Buttons
    },
    width: 1,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    },
  }
};
