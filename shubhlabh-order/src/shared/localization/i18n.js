import React, { createContext, useContext, useState } from 'react';
import { en } from './en';
import { hi } from './hi';

const translations = { en, hi };

const I18nContext = createContext();

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage, toggleLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};
