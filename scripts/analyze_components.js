
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeComponents() {
    const failuresPath = path.join(__dirname, 'skylinetragedy_failures.json');
    const content = await fs.readFile(failuresPath, 'utf8');
    const failures = JSON.parse(content);

    const systems = ['AVIONICS', 'ELECTRICAL', 'HYDRAULIC', 'FLIGHT_CONTROLS', 'LANDING_GEAR', 'PNEUMATIC', 'PROPELLER', 'AIRFRAME'];
    
    systems.forEach(sys => {
        console.log(`\n--- ${sys} Components ---`);
        const components = new Set(
            failures
                .filter(n => n.system === sys)
                .map(n => n.component)
        );
        console.log([...components].sort().slice(0, 20).join(', '));
    });
}

analyzeComponents().catch(console.error);
