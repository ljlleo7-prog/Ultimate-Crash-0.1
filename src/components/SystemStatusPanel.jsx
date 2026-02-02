import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// System Status Panel Component
const SystemStatusPanel = ({ flightState }) => {
  const { t } = useLanguage();
  // Safety check for flightState
  if (!flightState) return null;

  // Helper to safely format numbers with default value
  const formatValue = (val, decimals = 0) => (val != null && typeof val === 'number') ? val.toFixed(decimals) : '0';

  const warnings = flightState.activeWarnings || [];

  return (
    <div className="system-status-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <h3 style={{ margin: '5px 0', textAlign: 'center', borderBottom: '1px solid #444' }}>{t('ui.systems.status') || 'System Status'}</h3>
      
      <div className="panel-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Column: System Values */}
        <div className="system-values" style={{ flex: 1, padding: '5px', overflowY: 'auto', borderRight: '1px solid #444' }}>
          <div className="system-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <div className="system-item">
              <span className="label">N1</span>
              <span className="value">{flightState.engineN1 ? flightState.engineN1.map(v => formatValue(v, 1)).join(' | ') : '0'}%</span>
            </div>
            <div className="system-item">
              <span className="label">EGT</span>
              <span className="value">{flightState.engineEGT ? flightState.engineEGT.map(v => formatValue(v)).join(' | ') : '0'}°C</span>
            </div>
            <div className="system-item">
              <span className="label">{t('ui.flight.fuel')}</span>
              <span className="value">{formatValue(flightState.fuel)}</span>
            </div>
            <div className="system-item">
              <span className="label">Oil</span>
              <span className="value">{formatValue(flightState.oilPressure)}psi</span>
            </div>
            <div className="system-item">
              <span className="label">{t('ui.systems.hydraulics').substring(0, 3)}</span>
              <span className="value">{formatValue(flightState.hydraulicPressure)}psi</span>
            </div>
            <div className="system-item">
              <span className="label">{t('ui.systems.electrics').substring(0, 4)}</span>
              <span className="value">{formatValue(flightState.electricalVoltage, 1)}V</span>
            </div>
            <div className="system-item">
              <span className="label">{t('ui.flight.gear')}</span>
              <span className={`value ${flightState.gearDown ? 'down' : 'up'}`}>
                {flightState.gearDown ? t('ui.systems.on') : t('ui.systems.off')}
              </span>
            </div>
            <div className="system-item">
              <span className="label">{t('ui.flight.flaps')}</span>
              <span className="value">{formatValue(flightState.flaps)}°</span>
            </div>
          </div>
        </div>

        {/* Right Column: Warnings Log */}
        <div className="warnings-log" style={{ flex: 1, padding: '5px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#aaa' }}>Warnings</h4>
            {warnings.length === 0 ? (
                <div style={{ color: '#555', fontStyle: 'italic', fontSize: '0.8em' }}>No active warnings</div>
            ) : (
                warnings.map((w, idx) => (
                    <div key={`${w.id}-${idx}`} style={{ 
                        marginBottom: '4px', 
                        padding: '2px 4px', 
                        backgroundColor: w.level === 'CRITICAL' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 165, 0, 0.1)',
                        borderLeft: `3px solid ${w.level === 'CRITICAL' ? 'red' : 'orange'}`,
                        fontSize: '0.85em',
                        color: w.level === 'CRITICAL' ? '#ff4444' : '#ffcc00'
                    }}>
                        {w.message}
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;
