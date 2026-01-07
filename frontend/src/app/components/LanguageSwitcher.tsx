import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../types/language';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="group relative px-4 py-2 bg-gradient-to-r from-orange-600/90 to-orange-500/90 hover:from-orange-600 hover:to-orange-500 rounded-full text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm border border-orange-400/20"
    >
      {language === 'zh' ? 'EN' : '中'}
    </button>
  );
}