
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
        // System A and B engine pumps must be ON
        // For 4 engines, we might map eng1/2 to Sys A and eng3/4 to Sys B or similar.
        // Simplified: Check if *any* engine pump is ON for Sys A and Sys B
        const hyd = systems.hydraulics || {};
        
        // Dynamic check based on available pumps. 
        // Usually Sys A is powered by Eng 1 (and 2 in some planes), Sys B by Eng 2 (and 3/4).
        // Let's enforce standard 737-style for 2 engines, and generic for 4.
        
        if (engineCount <= 2) {
            if (!hyd.sysA?.engPump) missingItems.push('Hydraulic Pump ENG 1 ON');
            if (!hyd.sysB?.engPump) missingItems.push('Hydraulic Pump ENG 2 ON');
        } else {
            // For 4 engines (e.g. 747), typically Sys 1/2/3/4. 
            // But our hydraulics model might be limited to Sys A/B.
            // If Sys A/B is all we have, just check if they are powered.
             if (!hyd.sysA?.engPump) missingItems.push('Hydraulic Pump SYS A ON');
             if (!hyd.sysB?.engPump) missingItems.push('Hydraulic Pump SYS B ON');
        }
        
        // Check pressure (if simulated in systems object)
        if ((hyd.sysA?.pressure || 0) < 2000) missingItems.push('Hydraulic Sys A Pressure Low');
        if ((hyd.sysB?.pressure || 0) < 2000) missingItems.push('Hydraulic Sys B Pressure Low');
    }

    return {
        canContinue: missingItems.length === 0,
        missingItems
    };
};
