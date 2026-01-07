import { createContext, useContext, useState, ReactNode } from 'react';
import { Language, translations, Translations } from '../types/language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 从localStorage读取保存的语言偏好，如果没有则默认为中文
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
    return savedLanguage === 'zh' || savedLanguage === 'en' ? savedLanguage : 'zh';
  });

  // 包装setLanguage，同时保存到localStorage
  const setLanguageWithStorage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  const value = {
    language,
    setLanguage: setLanguageWithStorage,
    t: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
