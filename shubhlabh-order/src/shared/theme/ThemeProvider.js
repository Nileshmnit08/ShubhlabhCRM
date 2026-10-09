import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { theme, colors as defaultColors, typography as defaultTypography } from './index';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const darkColors = {
  ...defaultColors,
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#333333',
};

const THEME_PREF_KEY = '@app_theme_pref';
const FONT_PREF_KEY = '@app_font_pref';

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('system'); // system, light, dark
  const [fontSize, setFontSize] = useState('standard'); // small, standard, large
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    loadPreferences();
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        applyTheme('system', fontSize);
      }
    });
    return () => subscription.remove();
  }, [themeMode, fontSize]);

  const loadPreferences = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_PREF_KEY);
      const storedFont = await AsyncStorage.getItem(FONT_PREF_KEY);
      
      const parsedTheme = storedTheme || 'system';
      const parsedFont = storedFont || 'standard';
      
      setThemeMode(parsedTheme);
      setFontSize(parsedFont);
      applyTheme(parsedTheme, parsedFont);
    } catch (e) {
      applyTheme('system', 'standard');
    }
  };

  const applyTheme = (mode, fontScale) => {
    // Determine actual colors
    const isDark = mode === 'dark' || (mode === 'system' && Appearance.getColorScheme() === 'dark');
    
    // Mutate global theme colors
    Object.assign(theme.colors, isDark ? darkColors : defaultColors);
    
    // Mutate global typography scales
    const scaleFactor = fontScale === 'small' ? 0.85 : fontScale === 'large' ? 1.15 : 1;
    
    Object.keys(defaultTypography).forEach(key => {
      if (theme.typography[key] && defaultTypography[key].fontSize) {
        theme.typography[key].fontSize = Math.round(defaultTypography[key].fontSize * scaleFactor);
        // Also ensure colors are updated in typography
        theme.typography[key].color = key === 'caption' || key === 'label' ? theme.colors.textSecondary : (
          key === 'button' ? theme.colors.white : (
            key === 'price' ? theme.colors.primary : theme.colors.textPrimary
          )
        );
      }
    });

    setRenderKey(prev => prev + 1);
  };

  const updateTheme = async (mode) => {
    setThemeMode(mode);
    applyTheme(mode, fontSize);
    await AsyncStorage.setItem(THEME_PREF_KEY, mode);
  };

  const updateFontSize = async (size) => {
    setFontSize(size);
    applyTheme(themeMode, size);
    await AsyncStorage.setItem(FONT_PREF_KEY, size);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, updateTheme, fontSize, updateFontSize }}>
      <React.Fragment key={renderKey}>
        {children}
      </React.Fragment>
    </ThemeContext.Provider>
  );
};
