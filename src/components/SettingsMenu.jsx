import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const SettingsMenu = ({ onBack, t }) => {
  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
      <div className="w-full max-w-2xl p-8 bg-gray-800/50 backdrop-blur-md rounded-lg border border-gray-700">
        <h2 className="text-3xl font-bold mb-8 text-center border-b border-gray-700 pb-4">
          {t('settings.title')}
        </h2>
        
        <div className="space-y-6">
          {/* Audio */}
          <div className="flex justify-between items-center">
            <span className="text-lg">{t('settings.audio')}</span>
            <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-blue-500"></div>
            </div>
          </div>

          {/* Graphics */}
          <div className="flex justify-between items-center">
            <span className="text-lg">{t('settings.graphics')}</span>
            <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>

          {/* Language */}
          <div className="flex justify-between items-center">
            <span className="text-lg">{t('settings.language')}</span>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <button 
            onClick={onBack}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors"
          >
            {t('main_menu.back')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
