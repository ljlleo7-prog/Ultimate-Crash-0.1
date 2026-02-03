
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
 * @returns {object} { canContinue: boolean, missingItems: Array<{key: string, params?: object}> }
 */
export const checkStartupRequirements = (phase, systems, engines = []) => {
    const missingItems = [];

    if (!systems) {
        return { canContinue: false, missingItems: [{ key: 'startup.checklist.systems_not_init' }] };
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
            missingItems.push({ key: 'startup.checklist.battery_on' });
        }

        // 2. ADIRS Alignment (NAV Mode)
        // User requested ADIRS
        if (systems.adirs) {
             if (systems.adirs.ir1 !== 'NAV' || systems.adirs.ir2 !== 'NAV') {
                 missingItems.push({ key: 'startup.checklist.adirs_nav' });
             }
             if (!systems.adirs.aligned) {
                 // Warn if not aligned, but maybe allow continue if switches are correct?
                 // Let's enforce switches first. Alignment takes time.
                 // Ideally, we wait for alignment.
                 if (systems.adirs.alignState < 100) {
                     missingItems.push({ 
                         key: 'startup.checklist.adirs_aligning', 
                         params: { progress: Math.floor(systems.adirs.alignState) } 
                     });
                 }
             }
        }

        // 3. APU Bleed must be ON (User: "only after APU bleed starts")
        if (!systems.apu?.bleed) {
            missingItems.push({ key: 'startup.checklist.apu_bleed_on' });
        }

        // 3. APU Generator must be ON (User: "powered the batteries and stuff")
        if (!systems.electrical?.apuGen) {
            missingItems.push({ key: 'startup.checklist.apu_gen_on' });
        }

        // 4. APU must be running (stabilized)
        if (!systems.apu?.running || systems.apu?.n2 < 90) {
            missingItems.push({ key: 'startup.checklist.apu_running' });
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
        // Check ALL engines, not just the first 2 (supports 4-engine aircraft)
        const requiredEngines = engineCount; 

        for (let i = 0; i < requiredEngines; i++) {
            const eng = engineEntries[i];
            const n2 = eng ? (typeof eng.n2 === 'number' ? eng.n2 : eng.state && eng.state.n2) : null;
            const engRunning = typeof n2 === 'number' && n2 > 50;
            if (!engRunning) {
                missingItems.push({ 
                    key: 'startup.checklist.engine_running', 
                    params: { index: i + 1 } 
                });
            }
        }

        for (let i = 0; i < requiredEngines; i++) {
            const genKey = `gen${i + 1}`;
            if (!systems.electrical?.[genKey]) {
                missingItems.push({ 
                    key: 'startup.checklist.gen_on', 
                    params: { index: i + 1 } 
                });
            }
        }

        if (systems.apu?.running || systems.electrical?.apuGen) {
            missingItems.push({ key: 'startup.checklist.apu_shutdown' });
        }

        if (systems.adirs && !systems.adirs.aligned) {
            missingItems.push({ key: 'startup.checklist.adirs_complete' });
        }
    }

    return {
        canContinue: missingItems.length === 0,
        missingItems
    };
};
