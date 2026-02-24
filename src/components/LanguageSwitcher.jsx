import PropTypes from 'prop-types';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher = ({ style }) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <button 
      className="language-switcher" 
      onClick={toggleLanguage}
      style={style}
      title={t('ui.menu.language')}
    >
      <span className="lang-icon">🌐</span>
      <span className="lang-text">{language === 'en' ? 'EN' : '中文'}</span>
    </button>
  );
};

export default LanguageSwitcher;

LanguageSwitcher.propTypes = {
  style: PropTypes.object
};
