import React, { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const MainMenu = ({ onStartSinglePlayer, onStartMultiPlayer, onStartTutorial, onContinueSave, onOpenSettings, t }) => {
  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-cover bg-center z-0 opacity-40" 
           style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80")' }}>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90 z-10"></div>

      {/* Content */}
      <div className="z-20 flex flex-col items-center animate-fade-in-up">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-lg">
          {t('main_menu.title')}
        </h1>
        <h2 className="text-xl md:text-2xl font-light tracking-[0.5em] mb-12 text-gray-300">
          {t('main_menu.subtitle')}
        </h2>

        <div className="flex flex-col gap-4 w-64 md:w-80">
          <MenuButton onClick={onStartSinglePlayer} primary>
            {t('main_menu.single_player')}
          </MenuButton>
          
          <MenuButton onClick={onStartMultiPlayer}>
            {t('main_menu.multi_player')}
          </MenuButton>
          
          <MenuButton onClick={onStartTutorial} highlight>
            {t('main_menu.tutorial')}
          </MenuButton>
          
          <MenuButton onClick={onContinueSave}>
            {t('main_menu.continue_save')}
          </MenuButton>
          
          <MenuButton onClick={onOpenSettings}>
            {t('main_menu.settings')}
          </MenuButton>
        </div>
      </div>

      {/* Footer / Language */}
      <div className="absolute bottom-8 right-8 z-20">
        <LanguageSwitcher />
      </div>
      
      <div className="absolute bottom-8 left-8 z-20 text-xs text-gray-500 font-mono">
        v0.1-legacy | BUILD 2024.10.27
      </div>
    </div>
  );
};

const MenuButton = ({ children, onClick, primary, highlight }) => (
  <button
    onClick={onClick}
    className={`
      py-3 px-6 text-center font-bold tracking-widest transition-all duration-300 transform hover:scale-105
      border-l-4 
      ${primary 
        ? 'bg-blue-600/20 border-blue-500 hover:bg-blue-600/40 text-blue-100' 
        : highlight
          ? 'bg-cyan-600/20 border-cyan-400 hover:bg-cyan-600/40 text-cyan-100'
          : 'bg-gray-800/40 border-gray-600 hover:bg-gray-700/60 text-gray-300 hover:text-white'
      }
      backdrop-blur-sm
    `}
  >
    {children}
  </button>
);

export default MainMenu;
