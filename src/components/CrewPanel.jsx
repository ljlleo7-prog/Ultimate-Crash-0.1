
import { useState, useEffect, useRef } from 'react';
import eventBus from '../services/eventBus';
import { npcCrewService } from '../services/NPCCrewService';
import './CrewPanel.css';

const CrewPanel = () => {
    const [messages, setMessages] = useState([]);
    const [foStress, setFoStress] = useState(0);
    const [cabinStress, setCabinStress] = useState(0);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Subscribe to crew messages
        const unsubscribe = eventBus.subscribe(eventBus.Types.NPC_CREW_MESSAGE, (msg) => {
            setMessages(prev => [...prev, msg]);
            if (msg.stress !== undefined) {
                if (msg.role === 'FO') {
                    setFoStress(msg.stress);
                } else if (msg.role === 'CABIN_CREW') {
                    setCabinStress(msg.stress);
                }
            }
        });

        // Also we can poll npcCrewService for stress decay updates periodically
        const interval = setInterval(() => {
            setFoStress(npcCrewService.crewState.FO.stress);
            setCabinStress(npcCrewService.crewState.CABIN_CREW.stress);
        }, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
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

    const getSenderClass = (sender) => {
        if (sender === 'First Officer') return 'sender-fo';
        if (sender === 'Cabin Crew') return 'sender-cabin';
        return 'sender-system';
    };

    return (
        <div className="crew-panel">
            {/* Header */}
            <div className="crew-panel-header">
                <span className="crew-panel-title">CREW INTERCOM</span>
                <div className="crew-panel-stress-container">
                    <span className={`crew-stress-indicator ${foStress > 50 ? 'stress-high' : 'stress-low'}`}>
                        FO: {foStress}%
                    </span>
                    <span className={`crew-stress-indicator ${cabinStress > 50 ? 'stress-high' : 'stress-low'}`}>
                        CABIN: {cabinStress}%
                    </span>
                </div>
            </div>

            {/* Message Log */}
            <div className="crew-panel-messages">
                {messages.length === 0 && (
                    <div className="crew-panel-empty">
                        No recent communications.
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className="crew-message-item" style={{ alignItems: msg.sender === 'System' ? 'center' : 'flex-start' }}>
                        <span className={`crew-message-sender ${getSenderClass(msg.sender)}`}>
                            {msg.sender}
                        </span>
                        <div className="crew-message-content">
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="crew-panel-controls">
                <button className="crew-btn crew-btn-fo" onClick={handleSummonFO}>
                    CALL FO
                </button>
                <button className="crew-btn crew-btn-cabin" onClick={handleSummonCabin}>
                    CALL CABIN
                </button>
            </div>
        </div>
    );
};

export default CrewPanel;
