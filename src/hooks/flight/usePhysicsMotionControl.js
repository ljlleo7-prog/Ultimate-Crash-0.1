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

        const isParkedPhase = phaseType === 'boarding' || phaseType === 'departure_clearance';
        onParkedPhaseChange?.(isParkedPhase);

        const shouldFreeze = false;

        if (typeof motionController === 'function') {
            motionController(!shouldFreeze);
            return;
        }

        motionController.setMotionEnabled?.(!shouldFreeze);
    }, [motionController, phaseType, takeoffClearanceReceived, isInitialized, isTutorial, onParkedPhaseChange]);
}
