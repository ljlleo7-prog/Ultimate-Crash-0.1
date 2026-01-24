
import React, { useState, useEffect, useMemo } from 'react';
import { Checklists, ChecklistCategories } from '../services/ChecklistData';
import './ChecklistPanel.css';

const ChecklistPanel = ({ onClose, physicsState, flightState }) => {
  const [activeTab, setActiveTab] = useState(ChecklistCategories.STARTUP);
  const [checkedItems, setCheckedItems] = useState({});
  const [isFolding, setIsFolding] = useState(false);

  const currentItems = useMemo(() => Checklists[activeTab] || [], [activeTab]);

  // Auto-check logic
  useEffect(() => {
    if (!physicsState || !physicsState.systems) return;

    const newChecks = {};
    let hasChanges = false;

    currentItems.forEach(item => {
      // If already checked, skip (unless we want to enforce state sync, but user override is requested)
      // Actually, if we want to allow user to uncheck, we shouldn't force re-check constantly.
      // But if the system detects completion, it should check.
      // Let's only auto-check if NOT checked.
      if (checkedItems[item.id]) return;

      if (item.validate) {
        try {
          const isValid = item.validate(physicsState.systems, flightState);
          if (isValid) {
            newChecks[item.id] = true;
            hasChanges = true;
          }
        } catch (e) {
          console.warn(`Checklist validation error for ${item.id}`, e);
        }
      }
    });

    if (hasChanges) {
      setCheckedItems(prev => ({ ...prev, ...newChecks }));
    }
  }, [physicsState, flightState, currentItems, checkedItems]);

  // Auto-fold logic
  useEffect(() => {
    const allChecked = currentItems.length > 0 && currentItems.every(item => checkedItems[item.id]);
    
    if (allChecked && !isFolding) {
      setIsFolding(true);
      const timer = setTimeout(() => {
        // Fold (Close)
        onClose();
        
        // Reset current category checks after a delay (so user doesn't see them pop off instantly)
        setTimeout(() => {
            setCheckedItems(prev => {
                const next = { ...prev };
                currentItems.forEach(item => delete next[item.id]);
                return next;
            });
            setIsFolding(false);
        }, 500);
        
      }, 1500); // Wait 1.5s before folding

      return () => clearTimeout(timer);
    }
  }, [checkedItems, currentItems, onClose, isFolding]);

  const toggleItem = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const completedCount = currentItems.filter(item => checkedItems[item.id]).length;
  const progress = currentItems.length > 0 ? (completedCount / currentItems.length) * 100 : 0;

  return (
    <div className="checklist-panel">
      <div className="checklist-header">
        <h3>CHECKLIST</h3>
        <button className="checklist-close" onClick={onClose}>×</button>
      </div>

      <div className="checklist-tabs">
        {Object.values(ChecklistCategories).map(cat => (
          <button
            key={cat}
            className={`checklist-tab ${activeTab === cat ? 'active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="checklist-content">
        {currentItems.map(item => (
          <div 
            key={item.id} 
            className={`checklist-item ${checkedItems[item.id] ? 'checked' : ''}`}
            onClick={() => toggleItem(item.id)}
          >
            <div className="checkbox">
              {checkedItems[item.id] && <span className="check-icon">✓</span>}
            </div>
            <span className="item-label">{item.label}</span>
          </div>
        ))}
        {currentItems.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            No items in this checklist.
          </div>
        )}
      </div>

      <div className="checklist-progress">
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text">
          {completedCount} / {currentItems.length} COMPLETED
        </div>
      </div>
    </div>
  );
};

export default ChecklistPanel;
