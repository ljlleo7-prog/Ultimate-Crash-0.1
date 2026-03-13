
import React, { useState, useEffect, useRef } from 'react';
import eventBus from '../services/eventBus';
import { npcCrewService } from '../services/NPCCrewService';

const CrewPanel = ({ difficulty }) => {
    const [messages, setMessages] = useState([]);
    const [foStress, setFoStress] = useState(0);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Subscribe to crew messages
        const unsubscribe = eventBus.subscribe('NPC_CREW_MESSAGE', (msg) => {
            setMessages(prev => [...prev, msg]);
            if (msg.stress !== undefined && msg.role === 'FO') {
                setFoStress(msg.stress);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSummonFO = () => {
        npcCrewService.summon('FO');
    };

    const handleSummonCabin = () => {
        npcCrewService.summon('CABIN_CREW');
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '350px', // Positioned to the left of other panels
            width: '280px',
            height: '200px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #334155',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
        }}>
            {/* Header */}
            <div style={{
                padding: '8px',
                background: 'rgba(30, 41, 59, 0.8)',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>CREW INTERCOM</span>
                <span style={{ fontSize: '10px', color: foStress > 50 ? '#ef4444' : '#4ade80' }}>
                    FO STRESS: {foStress}%
                </span>
            </div>

            {/* Message Log */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
            }}>
                {messages.length === 0 && (
                    <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                        No recent communications.
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'System' ? 'center' : 'flex-start'
                    }}>
                        <span style={{ 
                            fontSize: '10px', 
                            color: msg.sender === 'First Officer' ? '#38bdf8' : (msg.sender === 'Cabin Crew' ? '#f472b6' : '#94a3b8'),
                            fontWeight: 'bold',
                            marginBottom: '1px'
                        }}>
                            {msg.sender}
                        </span>
                        <div style={{
                            fontSize: '11px',
                            color: '#e2e8f0',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            maxWidth: '100%'
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div style={{
                padding: '8px',
                borderTop: '1px solid #334155',
                display: 'flex',
                gap: '8px'
            }}>
                <button 
                    onClick={handleSummonFO}
                    style={{
                        flex: 1,
                        background: '#0f172a',
                        border: '1px solid #38bdf8',
                        color: '#38bdf8',
                        borderRadius: '4px',
                        padding: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    CALL FO
                </button>
                <button 
                    onClick={handleSummonCabin}
                    style={{
                        flex: 1,
                        background: '#0f172a',
                        border: '1px solid #f472b6',
                        color: '#f472b6',
                        borderRadius: '4px',
                        padding: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    CALL CABIN
                </button>
            </div>
        </div>
    );
};

export default CrewPanel;
