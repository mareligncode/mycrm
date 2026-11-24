import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('crm_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('crm_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'am' : 'en'));
  };

  const t = (key) => {
    if (translations[lang] && translations[lang][key] !== undefined) {
      return translations[lang][key];
    }
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return key;
  };

  const formatDate = (dateString, options = {}) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      const locale = lang === 'am' ? 'am-ET' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      }).format(date);
    } catch {
      return String(dateString);
    }
  };

  const formatDateTime = (dateString) => {
    return formatDate(dateString, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, formatDate, formatDateTime, isAmharic: lang === 'am' }}>
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
