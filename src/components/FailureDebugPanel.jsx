import React, { useState, useEffect } from 'react';
import { FailureTypes } from '../services/FailureSystem';

const FailureDebugPanel = ({ physicsService }) => {
    const [activeFailures, setActiveFailures] = useState([]);
    const [settings, setSettings] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    useEffect(() => {
        if (!physicsService || !physicsService.failureSystem) return;

        const interval = setInterval(() => {
            const fs = physicsService.failureSystem;
            
            // Convert Map to Array for display
            const failures = Array.from(fs.activeFailures.values());
            setActiveFailures(failures);
            setSettings(fs.settings);
            setLastUpdate(Date.now());
        }, 500); // Update every 500ms

        return () => clearInterval(interval);
    }, [physicsService]);

    const handleTrigger = (type) => {
        if (physicsService && physicsService.failureSystem) {
            physicsService.failureSystem.triggerFailure(type, physicsService.state);
        }
    };

    const handleReset = () => {
        if (physicsService && physicsService.failureSystem) {
            physicsService.failureSystem.reset();
        }
    };

    if (!physicsService || !physicsService.failureSystem) {
        console.warn('⚠️ FailureDebugPanel: physicsService or failureSystem missing', { physicsService });
        return null;
    }

    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            left: '80px', // Adjusted to avoid sidebar overlap
            background: 'rgba(50, 0, 0, 0.95)', // Increased opacity
            color: '#ffcccc',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 9999, // Ensure top layer
            border: '2px solid #ff3333',
            minWidth: '220px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)'
        }}>
            <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '10px', 
                borderBottom: '1px solid #ff6666', 
                paddingBottom: '5px', 
                color: '#ff6666',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>FAILURE CONTROL</span>
                <button 
                    onClick={handleReset}
                    style={{
                        background: '#440000',
                        border: '1px solid #ff6666',
                        color: '#ff6666',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '2px 5px'
                    }}
                >
                    RESET ALL
                </button>
            </div>

            {settings && (
                <div style={{ marginBottom: '10px', fontSize: '10px', color: '#aaa' }}>
                    <div>Difficulty: {physicsService.failureSystem.difficulty}</div>
                    <div>Max Failures: {settings.maxFailures}</div>
                    <div>Prob Mult: {settings.probMultiplier}</div>
                </div>
            )}

            <div style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '5px' }}>TRIGGER FAILURE:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {Object.values(FailureTypes).map(type => (
                        <button
                            key={type}
                            onClick={() => handleTrigger(type)}
                            style={{
                                background: '#330000',
                                border: '1px solid #883333',
                                color: '#ffaaaa',
                                padding: '4px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '10px'
                            }}
                        >
                            {type.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '5px' }}>ACTIVE FAILURES ({activeFailures.length}):</div>
                {activeFailures.length === 0 ? (
                    <div style={{ color: '#888', fontStyle: 'italic' }}>No active failures</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeFailures.map((f, i) => (
                            <div key={i} style={{ 
                                background: 'rgba(255, 0, 0, 0.2)', 
                                border: '1px solid #ff0000', 
                                padding: '5px',
                                borderRadius: '3px'
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#ff3333' }}>{f.type}</div>
                                <div>Severity: {f.severity}</div>
                                <div>Time: {f.startTime.toFixed(1)}s</div>
                                {f.data && (
                                    <div style={{ fontSize: '9px', color: '#ccc', marginTop: '3px' }}>
                                        {JSON.stringify(f.data).slice(0, 50)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FailureDebugPanel;
