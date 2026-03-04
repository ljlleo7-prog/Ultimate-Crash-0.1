import React from 'react';

const ContinueSaveMenu = ({ onBack, t }) => {
  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">{t('main_menu.continue_save')}</h2>
        <p className="text-xl text-gray-400 mb-8">{t('main_menu.coming_soon')}</p>
        <button 
          onClick={onBack}
          className="px-6 py-2 border border-white/20 hover:bg-white/10 transition-colors"
        >
          {t('main_menu.back')}
        </button>
      </div>
    </div>
  );
};

export default ContinueSaveMenu;
