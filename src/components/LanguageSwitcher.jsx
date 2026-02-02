import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher = ({ style }) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <button 
      className="language-switcher" 
      onClick={toggleLanguage}
      style={style}
      title="Switch Language / 切换语言"
    >
      <span className="lang-icon">🌐</span>
      <span className="lang-text">{language === 'en' ? 'EN' : '中文'}</span>
    </button>
  );
};

export default LanguageSwitcher;
