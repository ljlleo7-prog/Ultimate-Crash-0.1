import React from 'react';
import './Sidebar.css';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar = ({ activePanel, onTogglePanel }) => {
  const { t } = useLanguage();

  const buttons = [
    { id: 'checklist', label: t('flight.sidebar.checklist'), icon: '📋', disabled: false },
    { id: 'flight_computer', label: t('flight.sidebar.f_comp'), icon: '💻', disabled: false },
    { id: 'systems', label: t('flight.sidebar.systems'), icon: '🔧', disabled: false },
    { id: 'timer', label: t('flight.sidebar.timer'), icon: '⏱️', disabled: false },
    { id: 'save_load', label: t('flight.sidebar.save_load'), icon: '💾', disabled: false },
    { id: 'inspect', label: t('flight.sidebar.inspect'), icon: '🔍', disabled: false },
    { id: 'settings', label: t('flight.sidebar.settings'), icon: '⚙️', disabled: true },
  ];

  return (
    <div className="flight-sidebar">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          className={`sidebar-btn ${activePanel === btn.id ? 'active' : ''} ${btn.disabled ? 'disabled' : ''}`}
          onClick={() => !btn.disabled && onTogglePanel(btn.id)}
          title={btn.label}
        >
          <span className="sidebar-icon">{btn.icon}</span>
          <span className="sidebar-label">{btn.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
