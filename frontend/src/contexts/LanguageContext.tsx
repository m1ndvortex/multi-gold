import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDirection, type Language } from '@/utils/rtl';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>(
    (i18n.language as Language) || 'fa'
  );

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    i18n.changeLanguage(newLanguage);
    applyDirection(newLanguage);
    
    // Save to localStorage
    localStorage.setItem('language', newLanguage);
  };

  useEffect(() => {
    // Initialize from localStorage or default to Persian
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['fa', 'en'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    } else {
      setLanguage('fa');
    }
  }, []);

  useEffect(() => {
    // Apply direction when language changes
    applyDirection(language);
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    isRTL: language === 'fa',
    direction: language === 'fa' ? 'rtl' : 'ltr',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};