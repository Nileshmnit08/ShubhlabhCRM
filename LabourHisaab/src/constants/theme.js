// Theme design tokens for LabourHisaab
// High-fidelity matching of the user's reference UI snapshot

export const theme = {
  colors: {
    // Header & Brand Orange Gradient
    headerGradientStart: '#FF7A00',
    headerGradientEnd: '#EE5A00',
    primary: '#EE5A00',
    primaryDark: '#C94700',
    primaryLight: '#FFF2E6',
    primarySubtle: '#FFF9F3',

    // High-Contrast Green (Used for KPI cards and Save buttons in snapshot)
    kpiGreen: '#137A38',
    kpiGreenDark: '#0D5C28',
    success: '#168A45',
    successDark: '#0E6838',
    successLight: '#EAF7EE',
    successBorder: '#B7E4C7',

    // Negative / Balance Red
    danger: '#D92D20',
    dangerDark: '#B42318',
    dangerLight: '#FEE4E2',

    // Warning / pending (same palette family as danger)
    warning: '#B54708',
    warningLight: '#FFFAEB',

    // Neutral & Surfaces
    background: '#F9F8F6',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F1EC',
    surfaceBorder: '#E8E5DF',
    cardBackground: '#FFFFFF',

    // Text hierarchy
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textWhite: '#FFFFFF',

    // Navigation
    navActive: '#EE5A00',
    navActiveBg: '#FFEEDB',
    navInactive: '#64748B',
  },

  typography: {
    titleHeader: { fontSize: 20, fontWeight: '900' },
    sectionTitle: { fontSize: 16, fontWeight: '800' },
    cardTitle: { fontSize: 14, fontWeight: '700' },
    kpiValue: { fontSize: 22, fontWeight: '900' },
    kpiLabel: { fontSize: 12, fontWeight: '700' },
    body: { fontSize: 13, fontWeight: '500' },
    bodySmall: { fontSize: 11, fontWeight: '500' },
  },

  // Referenced by screens/components as theme.spacing.*; missing before, which crashed
  // the release build at startup ("Cannot read property 'lg' of undefined").
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },

  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    round: 9999,
  },
};

export default theme;
