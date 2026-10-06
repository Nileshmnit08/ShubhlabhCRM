// Google Stitch V1 Design Tokens

export const colors = {
  // Brand
  primary: '#F28C28',       // Primary Orange
  primaryPressed: '#D97A20', // Darker orange for pressed state
  
  // Neutral / Backgrounds
  background: '#FFFDF8',    // Warm White
  surface: '#FFFFFF',
  
  // Semantic Colors
  success: '#138A4B',       // India Green
  warning: '#F2C94C',
  error: '#D93025',         // Alert Red
  navy: '#1A4B8C',          // Subtle Navy
  
  // Text
  textPrimary: '#202124',   // Charcoal
  textSecondary: '#5F6368',
  textMuted: '#9AA0A6',
  
  // Borders & States
  border: '#E0E0E0',
  disabled: '#D3D3D3',
  white: '#FFFFFF',
};

export const typography = {
  display: { fontSize: 32, fontWeight: '700', color: colors.textPrimary },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400', color: colors.textPrimary },
  bodyMedium: { fontSize: 14, fontWeight: '400', color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
  button: { fontSize: 16, fontWeight: '600', color: colors.white },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  price: { fontSize: 18, fontWeight: '700', color: colors.primary },
  numeric: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  small: 4,
  medium: 8,
  large: 12,
  button: 8,
  card: 12,
  pill: 9999,
};

export const elevation = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  md: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  elevation,
};

export default theme;
