import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = ({ style = {} }) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div 
      onClick={toggleLanguage}
      style={{
        cursor: 'pointer',
        padding: '6px 12px',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        ...style
      }}
      className="language-switcher"
      title="Switch Language / 切换语言"
    >
      <span style={{ opacity: language === 'en' ? 1 : 0.5 }}>EN</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ opacity: language === 'zh' ? 1 : 0.5 }}>中</span>
    </div>
  );
};

export default LanguageSwitcher;
