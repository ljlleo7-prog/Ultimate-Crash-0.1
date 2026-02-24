import React, { useState, useEffect } from 'react';
import eventBus from '../services/eventBus';

const SensoryFeedback = () => {
    const [messages, setMessages] = useState([]);
    const [shake, setShake] = useState(null);
    const [flash, setFlash] = useState(null);

    useEffect(() => {
        const handleSound = (data) => {
            addMessage(`🔊 Sound: ${formatSound(data.id)}`);
            // In a real app, play audio here
        };

        const handleVisual = (data) => {
            if (data.type.includes('shake')) {
                triggerShake(data.type);
            }
            if (data.type.includes('flash')) {
                triggerFlash('white');
            }
            if (data.type.includes('red_light')) {
                triggerFlash('red');
            }
            if (data.type.includes('smoke')) {
                addMessage(`👀 Visual: Smoke in Cockpit`);
            }
        };

        const handleSmell = (data) => {
            addMessage(`👃 Smell: ${formatSmell(data.type)}`);
        };
        
        const handleCritical = (data) => {
            // Also show narrative text here
            addMessage(`📝 ${data.content}`, 'narrative');
        };

        const unsubSound = eventBus.subscribe('SENSORY_SOUND', handleSound);
        const unsubVisual = eventBus.subscribe('SENSORY_VISUAL', handleVisual);
        const unsubSmell = eventBus.subscribe('SENSORY_SMELL', handleSmell);
        const unsubCrit = eventBus.subscribe(eventBus.Types.CRITICAL_MESSAGE, handleCritical);

        return () => {
            unsubSound();
            unsubVisual();
            unsubSmell();
            unsubCrit();
        };
    }, []);

    const triggerShake = (type) => {
        setShake(type);
        setTimeout(() => setShake(null), 1000); // 1s shake
    };

    const triggerFlash = (color) => {
        setFlash(color);
        setTimeout(() => setFlash(null), 200); // Short flash
    };

    const addMessage = (text, type = 'sensory') => {
        const id = Date.now() + Math.random();
        setMessages(prev => [...prev.slice(-4), { id, text, type }]); // Keep last 5
        setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== id));
        }, 5000); // Fade out
    };

    const formatSound = (id) => {
        return id.replace(/_/g, ' ').toUpperCase();
    };

    const formatSmell = (id) => {
        return id.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <div className={`sensory-overlay ${shake ? shake : ''}`} style={{
            position: 'fixed',
            top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: 9000,
            overflow: 'hidden'
        }}>
            {/* Screen Flash Overlay */}
            {flash && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: flash,
                    opacity: 0.3,
                    animation: 'flash-fade 0.2s ease-out'
                }} />
            )}

            {/* Sensory Log (Bottom Center) */}
            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
                {messages.map(m => (
                    <div key={m.id} style={{
                        background: m.type === 'narrative' ? 'rgba(0,0,0,0.7)' : 'rgba(50, 50, 50, 0.6)',
                        border: m.type === 'narrative' ? '1px solid #aaa' : 'none',
                        color: m.type === 'narrative' ? '#fff' : '#ccc',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: m.type === 'narrative' ? '16px' : '14px',
                        fontStyle: m.type === 'narrative' ? 'normal' : 'italic',
                        animation: 'fade-in-up 0.3s ease-out',
                        textAlign: 'center',
                        maxWidth: '80vw'
                    }}>
                        {m.text}
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .shake_minor { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
                .shake_medium { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; animation-iteration-count: 2; }
                .shake_violent { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; animation-iteration-count: infinite; }
                .shake_jolt { animation: jolt 0.3s ease-out; }
                
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                @keyframes jolt {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(0, -10px); }
                    50% { transform: translate(0, 5px); }
                    100% { transform: translate(0, 0); }
                }
            `}</style>
        </div>
    );
};

export default SensoryFeedback;
