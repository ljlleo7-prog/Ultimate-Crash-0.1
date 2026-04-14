import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activePanel, onTogglePanel }) => {
  const buttons = [
    { id: 'checklist', label: 'Checklist', icon: '📋', disabled: false },
    { id: 'flight_computer', label: 'F-Comp', icon: '💻', disabled: false },
    { id: 'systems', label: 'Systems', icon: '🔧', disabled: false },
    { id: 'timer', label: 'Timer', icon: '⏱️', disabled: false },
    { id: 'save_load', label: 'Save/Load', icon: '💾', disabled: false },
    { id: 'inspect', label: 'Inspect', icon: '🔍', disabled: false },
    { id: 'settings', label: 'Settings', icon: '⚙️', disabled: false },
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
