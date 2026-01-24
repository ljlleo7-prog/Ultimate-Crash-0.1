
/**
 * StartupChecklist.js
 * 
 * Manages the "Cold & Dark" startup requirements for Professional and Devil difficulty modes.
 * Enforces strict system dependencies before allowing phase progression.
 */

export const StartupPhases = {
    POWER_UP: 'POWER_UP',       // Battery -> APU
    ENGINE_START: 'ENGINE_START' // APU -> Engines -> Systems
};

/**
 * Checks if the current startup phase requirements are met.
 * @param {string} phase - The current startup phase (POWER_UP or ENGINE_START)
 * @param {object} systems - The aircraft systems state object
 * @param {array} engines - Array of engine objects (optional, for N2 checks)
 * @returns {object} { canContinue: boolean, missingItems: string[] }
 */
export const checkStartupRequirements = (phase, systems, engines = []) => {
    const missingItems = [];

    if (!systems) {
        return { canContinue: false, missingItems: ['Systems not initialized'] };
    }

    // Helper to check electrical bus status (simplified)
    const isACAvailable = systems.electrical && (
        systems.electrical.gen1 || 
        systems.electrical.gen2 || 
        systems.electrical.apuGen || 
        systems.electrical.extPower
    );

    if (phase === StartupPhases.POWER_UP) {
        // SCENE 1: POWER UP
        // Goal: Get APU Running and APU Gen ON
        
        // 1. Battery must be ON (implicit if we are checking APU, but let's check)
        if (!systems.electrical?.battery) {
            missingItems.push('Battery Switch ON');
        }

        // 2. ADIRS Alignment (NAV Mode)
        // User requested ADIRS
        if (systems.adirs) {
             if (systems.adirs.ir1 !== 'NAV' || systems.adirs.ir2 !== 'NAV') {
                 missingItems.push('ADIRS IR 1 & 2 to NAV');
             }
             if (!systems.adirs.aligned) {
                 // Warn if not aligned, but maybe allow continue if switches are correct?
                 // Let's enforce switches first. Alignment takes time.
                 // Ideally, we wait for alignment.
                 if (systems.adirs.alignState < 100) {
                     missingItems.push(`ADIRS Aligning (${Math.floor(systems.adirs.alignState)}%)`);
                 }
             }
        }

        // 3. APU Bleed must be ON (User: "only after APU bleed starts")
        if (!systems.apu?.bleed) {
            missingItems.push('APU Bleed Switch ON');
        }

        // 3. APU Generator must be ON (User: "powered the batteries and stuff")
        if (!systems.electrical?.apuGen) {
            missingItems.push('APU Generator Switch ON');
        }

        // 4. APU must be running (stabilized)
        if (!systems.apu?.running || systems.apu?.n2 < 90) {
            missingItems.push('APU Running & Stabilized (>90%)');
        }

    } else if (phase === StartupPhases.ENGINE_START) {
        // SCENE 2: ENGINE START
        // Goal: Engines Running, Gens ON, APU OFF, Fuel Pumps ON, Hydraulics
        
        // 1. All Engines Started
        // Check N2 > 50% for all engines
        let allEnginesRunning = true;
        const engineCount = engines.length > 0 ? engines.length : 2; // Default to 2 if not provided (should be provided)

        for (let i = 0; i < engineCount; i++) {
            const eng = engines[i];
            const engRunning = eng && (eng.n2 > 50 || (eng.state && eng.state.n2 > 50));
            if (!engRunning) {
                allEnginesRunning = false;
                missingItems.push(`Engine ${i + 1} Running (N2 > 50%)`);
            }
        }
        
        // 2. Generators ON
        // Check corresponding generators for each engine
        for (let i = 0; i < engineCount; i++) {
            const genKey = `gen${i + 1}`;
            if (!systems.electrical?.[genKey]) {
                missingItems.push(`Generator ${i + 1} ON`);
            }
        }

        // 3. APU OFF
        if (systems.apu?.running || systems.electrical?.apuGen) {
            missingItems.push('APU Shutdown & APU Gen OFF');
        }

        // 4. Fuel Pumps ON
        // User: "fuel pump starts to pump fuel"
        // Check at least one pump per side or appropriate config
        const fuel = systems.fuel || {};
        const pumpsOn = (fuel.leftPumps || fuel.centerPumps) && (fuel.rightPumps || fuel.centerPumps);
        if (!pumpsOn) {
            missingItems.push('Fuel Pumps ON');
        }

        // 5. Hydraulics
        // User: "engines starts to power hydraulics"
        // Check ALL available hydraulic systems based on config
        const hyd = systems.hydraulics || {};
        const hydKeys = Object.keys(hyd);
        
        if (hydKeys.length > 0) {
            hydKeys.forEach(key => {
                // Check pump status
                if (!hyd[key].engPump) {
                    // Format key nicely (sysA -> SYS A, sys1 -> SYS 1)
                    const label = key.replace('sys', 'SYS ').toUpperCase();
                    missingItems.push(`Hydraulic Pump ${label} ON`);
                }
                // Check pressure
                if ((hyd[key].pressure || 0) < 2000) {
                    const label = key.replace('sys', 'SYS ').toUpperCase();
                    missingItems.push(`Hydraulic ${label} Pressure Low`);
                }
            });
        } else {
             // Fallback for missing hydraulics object
             missingItems.push('Hydraulics Not Initialized');
        }
        // 6. Window Heat & Probe Heat
        if (systems.ice?.windowHeat === false) missingItems.push('Window Heat ON');
        if (systems.ice?.probeHeat === false) missingItems.push('Probe Heat ON');
        
        // 7. Yaw Damper
        if (systems.flightControls?.yawDamper === false) missingItems.push('Yaw Damper ON');

        // 8. Emergency Lights (Armed)
        if (systems.lighting?.emergencyExit !== 'ARMED') missingItems.push('Emergency Lights ARMED');

    }

    return {
        canContinue: missingItems.length === 0,
        missingItems
    };
};
