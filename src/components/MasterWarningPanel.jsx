import React, { useState, useEffect } from 'react';
import eventBus from '../services/eventBus';
import './MasterWarningPanel.css';

const MasterWarningPanel = () => {
    const [alerts, setAlerts] = useState([]);
    const [masterWarning, setMasterWarning] = useState(false);
    const [masterCaution, setMasterCaution] = useState(false);

    useEffect(() => {
        const handleAlert = (payload) => {
            // payload: { id, message, level: 'WARNING' | 'CAUTION' }
            const newAlert = {
                id: payload.id,
                message: payload.message,
                level: payload.level || 'CAUTION',
                timestamp: Date.now()
            };

            setAlerts(prev => {
                // Avoid duplicates for same ID? Or just stack them?
                // Usually a system has one active alert state.
                // Let's replace if exists, or add.
                const filtered = prev.filter(a => a.id !== payload.id);
                return [newAlert, ...filtered];
            });

            if (payload.level === 'WARNING') {
                setMasterWarning(true);
            } else {
                setMasterCaution(true);
            }
        };

        const handleFailureResolved = (payload) => {
             // If a failure is resolved, remove its alert?
             // Payload usually has id.
             setAlerts(prev => prev.filter(a => a.id !== payload.id));
        };

        const unsubAlert = eventBus.subscribe('SYSTEM_ALERT_TRIGGERED', handleAlert);
        const unsubResolved = eventBus.subscribe(eventBus.Types.FAILURE_RESOLVED, handleFailureResolved);

        return () => {
            unsubAlert();
            unsubResolved();
        };
    }, []);

    const resetWarning = () => setMasterWarning(false);
    const resetCaution = () => setMasterCaution(false);

    return (
        <div className="master-warning-panel">
            <div className="mw-lights">
                <button 
                    className={`mw-btn warning ${masterWarning ? 'active' : ''}`} 
                    onClick={resetWarning}
                >
                    MASTER<br/>WARNING
                </button>
                <button 
                    className={`mw-btn caution ${masterCaution ? 'active' : ''}`} 
                    onClick={resetCaution}
                >
                    MASTER<br/>CAUTION
                </button>
            </div>
            
            <div className="mw-display">
                {alerts.length === 0 ? (
                    <div className="mw-empty">NO ACTIVE ALERTS</div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`mw-alert ${alert.level.toLowerCase()}`}>
                            <span className="alert-msg">{alert.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MasterWarningPanel;
