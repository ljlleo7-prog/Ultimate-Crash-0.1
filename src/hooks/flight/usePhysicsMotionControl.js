import { useEffect } from 'react';

export default function usePhysicsMotionControl({
    motionController,
    phaseType,
    takeoffClearanceReceived,
    isInitialized = true,
    isTutorial = false,
    onParkedPhaseChange
}) {
    useEffect(() => {
        if (!motionController || !isInitialized) return;

        const isParkedPhase = ['boarding', 'departure_clearance', 'pushback'].includes(phaseType);
        onParkedPhaseChange?.(isParkedPhase);

        const shouldFreeze = !isTutorial && isParkedPhase;

        if (typeof motionController === 'function') {
            motionController(!shouldFreeze);
            return;
        }

        motionController.setMotionEnabled?.(!shouldFreeze);
    }, [motionController, phaseType, takeoffClearanceReceived, isInitialized, isTutorial, onParkedPhaseChange]);
}
