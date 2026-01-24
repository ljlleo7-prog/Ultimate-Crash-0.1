
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

        // 2. APU Bleed must be ON (User: "only after APU bleed starts")
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
        
        // 1. Two Engines Started
        // Check N2 > 50% for both engines
        const eng1Running = engines[0] && (engines[0].n2 > 50 || (engines[0].state && engines[0].state.n2 > 50));
        const eng2Running = engines[1] && (engines[1].n2 > 50 || (engines[1].state && engines[1].state.n2 > 50));
        
        if (!eng1Running || !eng2Running) {
            missingItems.push('Both Engines Running (N2 > 50%)');
        }
        
        // 2. Generators ON
        if (!systems.electrical?.gen1) missingItems.push('Generator 1 ON');
        if (!systems.electrical?.gen2) missingItems.push('Generator 2 ON');

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
        // System A and B engine pumps must be ON
        const hyd = systems.hydraulics || {};
        if (!hyd.sysA?.engPump) missingItems.push('Hydraulic Pump ENG 1 ON');
        if (!hyd.sysB?.engPump) missingItems.push('Hydraulic Pump ENG 2 ON');
        
        // Check pressure (if simulated in systems object)
        if ((hyd.sysA?.pressure || 0) < 2000) missingItems.push('Hydraulic Sys A Pressure Low');
        if ((hyd.sysB?.pressure || 0) < 2000) missingItems.push('Hydraulic Sys B Pressure Low');
    }

    return {
        canContinue: missingItems.length === 0,
        missingItems
    };
};
