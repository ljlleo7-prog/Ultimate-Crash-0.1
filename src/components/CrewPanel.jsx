
import { useMemo, useState, useEffect, useRef } from 'react';
import eventBus from '../services/eventBus';
import { npcCrewService } from '../services/NPCCrewService';
import './CrewPanel.css';

const CrewPanel = ({ difficulty, quickCommands = [], onQuickCommand }) => {
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

    const visibleQuickCommands = useMemo(() => {
        if (!Array.isArray(quickCommands)) {
            return [];
        }
        return quickCommands.filter(command => difficulty !== 'devil' || command.category !== 'checklist');
    }, [difficulty, quickCommands]);

    const handleSummonFO = () => {
        npcCrewService.summon('FO');
    };

    const handleSummonCabin = () => {
        npcCrewService.summon('CABIN_CREW');
    };

    const getSenderClass = (sender) => {
        if (sender === 'First Officer' || sender === 'Copilot') return 'sender-fo';
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

            <div className="crew-panel-body">
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

                <div className="crew-panel-sidebar">
                    {visibleQuickCommands.length > 0 && (
                        <div className="crew-panel-quick-commands">
                            <div className="crew-panel-section-title">COMMANDS</div>
                            <div className="crew-panel-command-grid">
                                {visibleQuickCommands.map((command) => (
                                    <button
                                        key={command.id}
                                        className="crew-btn crew-btn-fo"
                                        onClick={() => onQuickCommand?.(command.command)}
                                    >
                                        {command.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="crew-panel-actions">
                        <div className="crew-panel-section-title">CALL</div>
                        <div className="crew-panel-command-grid">
                            <button className="crew-btn crew-btn-fo" onClick={handleSummonFO}>
                                CALL FO
                            </button>
                            <button className="crew-btn crew-btn-cabin" onClick={handleSummonCabin}>
                                CALL CABIN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrewPanel;
