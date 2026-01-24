
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
        const engineEntries = [];

        if (Array.isArray(engines)) {
            engines.forEach(e => engineEntries.push(e));
        } else if (engines && typeof engines === 'object') {
            Object.keys(engines)
                .sort((a, b) => {
                    const ia = parseInt(String(a).replace('eng', ''), 10) || 0;
                    const ib = parseInt(String(b).replace('eng', ''), 10) || 0;
                    return ia - ib;
                })
                .forEach(key => {
                    engineEntries.push(engines[key]);
                });
        }

        const engineCount = engineEntries.length || 2;
        const requiredEngines = Math.min(2, engineCount);

        for (let i = 0; i < requiredEngines; i++) {
            const eng = engineEntries[i];
            const n2 = eng ? (typeof eng.n2 === 'number' ? eng.n2 : eng.state && eng.state.n2) : null;
            const engRunning = typeof n2 === 'number' && n2 > 50;
            if (!engRunning) {
                missingItems.push(`Engine ${i + 1} Running (N2 > 50%)`);
            }
        }

        for (let i = 0; i < requiredEngines; i++) {
            const genKey = `gen${i + 1}`;
            if (!systems.electrical?.[genKey]) {
                missingItems.push(`Generator ${i + 1} ON`);
            }
        }

        if (systems.apu?.running || systems.electrical?.apuGen) {
            missingItems.push('APU Shutdown & APU Gen OFF');
        }

        if (systems.adirs && !systems.adirs.aligned) {
            missingItems.push('ADIRS Alignment Complete');
        }
    }

    return {
        canContinue: missingItems.length === 0,
        missingItems
    };
};
