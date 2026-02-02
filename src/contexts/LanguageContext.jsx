import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.js';
import zh from '../locales/zh.js';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Default to English, or detect browser language if desired
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState(en);

  useEffect(() => {
    // Update translations when language changes
    setTranslations(language === 'zh' ? zh : en);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'zh' : 'en'));
  };

  const t = (key, params = {}) => {
    if (!key || typeof key !== 'string') return key || '';
    
    // Handle nested keys (e.g., "narrative.phases.boarding.title")
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to English if missing in current language
        let fallbackValue = en;
        for (const fk of keys) {
            if (fallbackValue && fallbackValue[fk] !== undefined) {
                fallbackValue = fallbackValue[fk];
            } else {
                return key; // Return key if not found in fallback either
            }
        }
        value = fallbackValue;
        break; // Found in fallback
      }
    }

    // Handle template replacement (e.g., "${callsign}")
    if (typeof value === 'string') {
      return value.replace(/\$\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
