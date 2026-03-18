import { useState, useCallback } from 'react';

export default function useRadioSystem(physicsService, atcLogic) {
    const [radioState, setRadioState] = useState({ frequency: 118.0, transmitting: false });

    const handleRadioTransmit = useCallback((message) => {
        if (!physicsService || !atcLogic) return;

        const freq = radioState.frequency;
        const detectedFreq = atcLogic.detectFrequency?.(message, freq);

        if (detectedFreq) {
            setRadioState(prev => ({ ...prev, frequency: detectedFreq }));
        }

        atcLogic.handleTransmission?.(message, freq);
    }, [physicsService, atcLogic, radioState.frequency]);

    return { handleRadioTransmit, radioState, setRadioState };
}
