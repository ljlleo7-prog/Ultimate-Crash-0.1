import { useEffect } from 'react';

export default function usePhysicsMotionControl(physicsService, scenePhase, atcClearance) {
    useEffect(() => {
        if (!physicsService) return;

        const shouldFreeze = ['PRE_FLIGHT', 'GROUND_HOLD', 'AWAITING_CLEARANCE'].includes(scenePhase) ||
                           (scenePhase === 'TAXI' && !atcClearance?.taxiApproved);

        physicsService.setMotionEnabled(!shouldFreeze);
    }, [physicsService, scenePhase, atcClearance]);
}
