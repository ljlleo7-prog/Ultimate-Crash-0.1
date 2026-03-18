import { useState, useEffect } from 'react';

export default function useStartupChecklist(difficulty, systems) {
    const [startupStatus, setStartupStatus] = useState({ complete: false, items: [] });

    useEffect(() => {
        if (!['pro', 'devil'].includes(difficulty) || !systems) {
            setStartupStatus({ complete: true, items: [] });
            return;
        }

        const checks = [
            { name: 'Battery', complete: systems.electrical?.battery },
            { name: 'APU', complete: systems.apu?.running },
            { name: 'Engines', complete: systems.engines?.eng1?.n2 > 50 }
        ];

        const allComplete = checks.every(c => c.complete);
        setStartupStatus({ complete: allComplete, items: checks });
    }, [difficulty, systems]);

    return { startupStatus, isStartupComplete: startupStatus.complete };
}
