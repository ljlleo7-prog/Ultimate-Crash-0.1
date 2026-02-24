import React, { useState, useEffect, useCallback } from 'react';
import eventBus from '../services/eventBus';
import './CircuitBreakerPanel.css';

const CircuitBreakerPanel = ({ onClose }) => {
    // Breaker definitions
    // Format: { id, label, system, row, col, failureId }
    const initialBreakers = [
        // OVERHEAD - ELEC
        { id: 'cb_gen1', label: 'GEN 1', system: 'ELEC', section: 'OVERHEAD', failureId: 'generator_drive_disconnect' },
        { id: 'cb_gen2', label: 'GEN 2', system: 'ELEC', section: 'OVERHEAD', failureId: 'generator_drive_disconnect' },
        { id: 'cb_apu_gen', label: 'APU GEN', system: 'ELEC', section: 'OVERHEAD', failureId: 'electrical_bus_failure' },
        { id: 'cb_batt', label: 'BATTERY', system: 'ELEC', section: 'OVERHEAD', failureId: 'battery_overheat' },
        
        // OVERHEAD - FUEL
        { id: 'cb_fuel_l_fwd', label: 'L FWD PUMP', system: 'FUEL', section: 'OVERHEAD', failureId: 'fuel_pump_fail' },
        { id: 'cb_fuel_l_aft', label: 'L AFT PUMP', system: 'FUEL', section: 'OVERHEAD', failureId: 'fuel_pump_fail' },
        { id: 'cb_fuel_r_fwd', label: 'R FWD PUMP', system: 'FUEL', section: 'OVERHEAD', failureId: 'fuel_pump_fail' },
        { id: 'cb_fuel_r_aft', label: 'R AFT PUMP', system: 'FUEL', section: 'OVERHEAD', failureId: 'fuel_pump_fail' },
        { id: 'cb_fuel_htr', label: 'FUEL HEAT', system: 'FUEL', section: 'OVERHEAD', failureId: 'fuel_heat_fail' },

        // OVERHEAD - HYD
        { id: 'cb_hyd_a_eng', label: 'HYD A ENG', system: 'HYD', section: 'OVERHEAD', failureId: 'hydraulic_failure' },
        { id: 'cb_hyd_a_elec', label: 'HYD A ELEC', system: 'HYD', section: 'OVERHEAD', failureId: 'hydraulic_failure' },
        { id: 'cb_hyd_b_eng', label: 'HYD B ENG', system: 'HYD', section: 'OVERHEAD', failureId: 'hydraulic_failure' },
        { id: 'cb_hyd_b_elec', label: 'HYD B ELEC', system: 'HYD', section: 'OVERHEAD', failureId: 'hydraulic_failure' },

        // MAIN - AVIONICS
        { id: 'cb_pfd_l', label: 'PFD L', system: 'AVIONICS', section: 'MAIN', failureId: 'avionics_overheat' },
        { id: 'cb_nd_l', label: 'ND L', system: 'AVIONICS', section: 'MAIN', failureId: 'avionics_overheat' },
        { id: 'cb_fmc_l', label: 'FMC L', system: 'AVIONICS', section: 'MAIN', failureId: 'avionics_overheat' },
        { id: 'cb_rad_alt', label: 'RAD ALT', system: 'AVIONICS', section: 'MAIN', failureId: 'radalt_fail' },
        { id: 'cb_gps_l', label: 'GPS L', system: 'AVIONICS', section: 'MAIN', failureId: 'gps_loss' },

        // MAIN - INST
        { id: 'cb_stby_att', label: 'STBY ATT', system: 'INST', section: 'MAIN', failureId: 'avionics_overheat' },
        { id: 'cb_clock', label: 'CLOCK', system: 'INST', section: 'MAIN', failureId: null },
        
        // PEDESTAL - COMM
        { id: 'cb_vhf_1', label: 'VHF 1', system: 'COMM', section: 'PEDESTAL', failureId: 'radio_fail' },
        { id: 'cb_vhf_2', label: 'VHF 2', system: 'COMM', section: 'PEDESTAL', failureId: 'radio_fail' },
        { id: 'cb_nav_1', label: 'NAV 1', system: 'COMM', section: 'PEDESTAL', failureId: 'nav_fail' },
        
        // PEDESTAL - FIRE
        { id: 'cb_det_loops', label: 'DET LOOPS', system: 'FIRE', section: 'PEDESTAL', failureId: 'fire_loop_fail' },
        { id: 'cb_squib_l', label: 'SQUIB L', system: 'FIRE', section: 'PEDESTAL', failureId: 'fire_bottle_fail' },
        
        // MISC
        { id: 'cb_window_heat', label: 'WIND HEAT', system: 'ICE', section: 'OVERHEAD', failureId: 'windshield_heat_fail' },
        { id: 'cb_wing_ai', label: 'WING AI', system: 'ICE', section: 'OVERHEAD', failureId: 'wing_anti_ice_fail' },
        { id: 'cb_pack_l', label: 'PACK L', system: 'AIR', section: 'OVERHEAD', failureId: 'pack_failure' },
        { id: 'cb_pack_r', label: 'PACK R', system: 'AIR', section: 'OVERHEAD', failureId: 'pack_failure' },
    ];

    const [breakers, setBreakers] = useState(() => {
        const state = {};
        initialBreakers.forEach(cb => {
            state[cb.id] = { ...cb, popped: false };
        });
        return state;
    });

    const [lastPopped, setLastPopped] = useState(null);

    // Toggle breaker state
    const toggleBreaker = (id) => {
        setBreakers(prev => {
            const cb = prev[id];
            const newPopped = !cb.popped;
            
            // Publish event
            eventBus.publish('BREAKER_ACTION', {
                id: id,
                popped: newPopped,
                system: cb.system,
                label: cb.label
            });

            // If manually popping, maybe trigger the associated failure?
            // For now, let's just be visual unless we want advanced interaction.
            if (newPopped && cb.failureId) {
                // Optional: We could trigger the failure here
                // eventBus.publish('TRIGGER_FAILURE', { id: cb.failureId });
            }

            return {
                ...prev,
                [id]: { ...cb, popped: newPopped }
            };
        });
    };

    // Listen for external failures that might pop breakers
    useEffect(() => {
        const handleFailure = (payload) => {
            // Check if this failure is associated with any breaker
            // If so, maybe pop it (simulate overload)
            
            if (payload.type === 'circuit_arc') {
                // Randomly pop 1-3 breakers
                const keys = Object.keys(breakers);
                const num = Math.floor(Math.random() * 3) + 1;
                
                setBreakers(prev => {
                    const next = { ...prev };
                    for (let i = 0; i < num; i++) {
                        const randomKey = keys[Math.floor(Math.random() * keys.length)];
                        if (!next[randomKey].popped) {
                            next[randomKey] = { ...next[randomKey], popped: true };
                            setLastPopped(randomKey);
                        }
                    }
                    return next;
                });
            } else {
                // Check direct association
                Object.values(breakers).forEach(cb => {
                    if (cb.failureId === payload.type && !cb.popped) {
                        // 50% chance to pop on failure
                        if (Math.random() > 0.5) {
                            setBreakers(prev => ({
                                ...prev,
                                [cb.id]: { ...prev[cb.id], popped: true }
                            }));
                            setLastPopped(cb.id);
                        }
                    }
                });
            }
        };

        const unsub = eventBus.subscribe(eventBus.Types.FAILURE_OCCURRED, handleFailure);
        return () => unsub();
    }, [breakers]);

    // Group by section
    const getSectionBreakers = (section) => {
        return Object.values(breakers).filter(cb => cb.section === section);
    };

    return (
        <div className="circuit-breaker-panel">
            <div className="cb-header">
                <h3>CIRCUIT BREAKERS</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            <div className="cb-content">
                <div className="cb-section">
                    <h4>OVERHEAD P18-1</h4>
                    <div className="cb-grid">
                        {getSectionBreakers('OVERHEAD').map(cb => (
                            <Breaker key={cb.id} data={cb} onClick={() => toggleBreaker(cb.id)} />
                        ))}
                    </div>
                </div>

                <div className="cb-section">
                    <h4>MAIN P18-2</h4>
                    <div className="cb-grid">
                        {getSectionBreakers('MAIN').map(cb => (
                            <Breaker key={cb.id} data={cb} onClick={() => toggleBreaker(cb.id)} />
                        ))}
                    </div>
                </div>

                <div className="cb-section">
                    <h4>PEDESTAL P18-3</h4>
                    <div className="cb-grid">
                        {getSectionBreakers('PEDESTAL').map(cb => (
                            <Breaker key={cb.id} data={cb} onClick={() => toggleBreaker(cb.id)} />
                        ))}
                    </div>
                </div>
            </div>
            
            {lastPopped && (
                <div className="cb-alert">
                    BREAKER POPPED: {breakers[lastPopped].label}
                </div>
            )}
        </div>
    );
};

const Breaker = ({ data, onClick }) => {
    return (
        <div className={`breaker-container ${data.popped ? 'popped' : 'closed'}`} onClick={onClick}>
            <div className="breaker-head">
                <div className="breaker-val">{data.system.substring(0, 3)}</div>
            </div>
            <div className="breaker-label">{data.label}</div>
        </div>
    );
};

export default CircuitBreakerPanel;
