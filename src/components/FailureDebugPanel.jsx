import React, { useState, useEffect, useMemo } from 'react';

const FailureDebugPanel = ({ physicsService, onClose }) => {
    const [activeFailures, setActiveFailures] = useState([]);
    const [registry, setRegistry] = useState(new Map());
    const [settings, setSettings] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    useEffect(() => {
        if (!physicsService || !physicsService.failureSystem) return;

        // Initial Load of Registry
        if (physicsService.failureSystem.registry) {
            setRegistry(new Map(physicsService.failureSystem.registry));
        }

        const interval = setInterval(() => {
            const fs = physicsService.failureSystem;
            if (!fs) return;

            // Sync Active Failures
            // fs.activeFailures is a Map<id, FailureInstance>
            const failures = Array.from(fs.activeFailures.values());
            setActiveFailures(failures);
            
            // Sync Settings
            if (fs.settings) setSettings(fs.settings);
            
            setLastUpdate(Date.now());
        }, 200); // 5Hz update for UI

        return () => clearInterval(interval);
    }, [physicsService]);

    const handleTrigger = (id) => {
        if (physicsService && physicsService.failureSystem) {
            physicsService.failureSystem.triggerFailure(id);
        }
    };

    const handleReset = () => {
        if (physicsService && physicsService.failureSystem) {
            physicsService.failureSystem.reset();
        }
    };

    // Group failures by system/category
    const categories = useMemo(() => {
        const groups = {};
        registry.forEach((def, id) => {
            const cat = def.system || 'OTHER'; // e.g., 'ENGINE', 'SYSTEMS'
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(def);
        });
        return groups;
    }, [registry]);

    if (!physicsService || !physicsService.failureSystem) {
        return null;
    }

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(10, 15, 20, 0.95)',
            color: '#e0e0e0',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            padding: '20px',
            borderRadius: '12px',
            zIndex: 9999,
            border: '1px solid #334455',
            width: '900px',
            height: '700px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 80px rgba(0, 0, 0, 0.8)'
        }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid #334455',
                paddingBottom: '15px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                        width: '12px', height: '12px', 
                        background: activeFailures.length > 0 ? '#ff3333' : '#4ade80',
                        borderRadius: '50%',
                        boxShadow: activeFailures.length > 0 ? '0 0 10px #ff3333' : '0 0 10px #4ade80'
                    }} />
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>FAILURE INJECTION CONSOLE</span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#8899aa', display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                        DIFFICULTY: <span style={{ color: '#fff', marginLeft: '5px' }}>{(physicsService.difficulty || 'ROOKIE').toUpperCase()}</span>
                    </div>
                    <button 
                        onClick={handleReset}
                        style={{
                            background: '#2d1b1b',
                            border: '1px solid #552222',
                            color: '#ff6666',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        RESET ALL
                    </button>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#667788',
                            cursor: 'pointer',
                            fontSize: '20px'
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
                
                {/* Left Column: Library */}
                <div style={{ flex: 2, overflowY: 'auto', paddingRight: '10px' }}>
                    {Object.entries(categories).map(([catName, items]) => (
                        <div key={catName} style={{ marginBottom: '25px' }}>
                            <div style={{ 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                color: '#66aaee', 
                                borderBottom: '1px solid #223344',
                                paddingBottom: '5px',
                                marginBottom: '10px',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>{catName}</span>
                                <span style={{ opacity: 0.5 }}>{items.length}</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                                {items.map(def => {
                                    const isActive = activeFailures.some(f => f.id === def.id);
                                    return (
                                        <button
                                            key={def.id}
                                            onClick={() => handleTrigger(def.id)}
                                            disabled={isActive}
                                            style={{
                                                background: isActive ? 'linear-gradient(45deg, #331111, #220000)' : '#1a222a',
                                                border: isActive ? '1px solid #ff3333' : '1px solid #2a3b4c',
                                                color: isActive ? '#ff9999' : '#ccddee',
                                                padding: '10px',
                                                cursor: isActive ? 'default' : 'pointer',
                                                textAlign: 'left',
                                                fontSize: '11px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                transition: 'all 0.2s',
                                                opacity: isActive ? 0.8 : 1
                                            }}
                                        >
                                            <span style={{ fontWeight: 'bold' }}>{def.label || def.name || def.id}</span>
                                            {isActive && <span style={{ fontSize: '9px', color: '#ff3333' }}>ACTIVE</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Column: Active Status */}
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '15px', borderLeft: '1px solid #334455', paddingLeft: '20px' }}>
                    
                    {/* System Monitor */}
                    <div style={{ background: '#11161b', padding: '15px', borderRadius: '6px', border: '1px solid #223344' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8899aa', marginBottom: '10px', textTransform: 'uppercase' }}>
                            Vitals Monitor
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                            <StatusIndicator label="ENG 1" status={physicsService.engines[0]?.failed ? 'FAIL' : 'OK'} />
                            <StatusIndicator label="ENG 2" status={physicsService.engines[1]?.failed ? 'FAIL' : 'OK'} />
                            <StatusIndicator label="HYD A" status={physicsService.systems.hydraulics?.sysA?.pressure > 2000 ? 'OK' : 'LOW'} />
                            <StatusIndicator label="HYD B" status={physicsService.systems.hydraulics?.sysB?.pressure > 2000 ? 'OK' : 'LOW'} />
                            <StatusIndicator label="ELEC" status={physicsService.systems.electrical?.dcVolts > 20 ? 'OK' : 'FAIL'} />
                            <StatusIndicator label="CABIN" status={physicsService.systems.pressurization?.breach ? 'BREACH' : 'OK'} />
                            <StatusIndicator label="GEAR" status={physicsService.controls.gear === 1 ? 'DOWN' : 'UP'} />
                            <StatusIndicator label="FLAPS" status={`${(physicsService.controls.flaps * 100).toFixed(0)}%`} color="#aaa" />
                        </div>
                    </div>

                    {/* Active Failures List */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff6666', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>ACTIVE ALERTS</span>
                            <span>{activeFailures.length}</span>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
                            {activeFailures.length === 0 ? (
                                <div style={{ 
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    color: '#334455', fontStyle: 'italic', border: '1px dashed #223344', borderRadius: '6px' 
                                }}>
                                    System Nominal
                                </div>
                            ) : (
                                activeFailures.map((failure, idx) => (
                                    <div key={failure.id + idx} style={{ 
                                        background: 'linear-gradient(90deg, rgba(60, 20, 20, 0.5), rgba(40, 10, 10, 0.2))', 
                                        borderLeft: '3px solid #ff3333',
                                        padding: '10px',
                                        borderRadius: '0 4px 4px 0'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#ffaaaa' }}>{failure.name || failure.id}</span>
                                            <span style={{ fontSize: '10px', color: '#ff6666', border: '1px solid #552222', padding: '0 4px', borderRadius: '2px' }}>
                                                {(failure.currentStage || 'UNKNOWN').toUpperCase()}
                                            </span>
                                        </div>
                                        
                                        <div style={{ fontSize: '10px', color: '#998888', marginBottom: '4px', lineHeight: '1.4' }}>
                                            {failure.getDescription()}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#665555', marginTop: '6px' }}>
                                            <span>T+{failure.timeInStage.toFixed(1)}s</span>
                                            {failure.context && Object.keys(failure.context).length > 0 && (
                                                <span style={{ fontFamily: 'monospace' }}>
                                                    {Object.keys(failure.context).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const StatusIndicator = ({ label, status, color }) => {
    const isOk = status === 'OK' || status === 'DOWN' || status === 'UP';
    const displayColor = color || (isOk ? '#4ade80' : '#ef4444');
    
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px' }}>
            <span style={{ color: '#667788' }}>{label}</span>
            <span style={{ fontWeight: 'bold', color: displayColor }}>{status}</span>
        </div>
    );
};

export default FailureDebugPanel;