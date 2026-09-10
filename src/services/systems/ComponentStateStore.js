export default class ComponentStateStore {
    constructor(components = []) {
        this.components = new Map();
        this.damageLedger = [];
        components.forEach(component => {
            this.components.set(component.id, {
                id: component.id,
                health: 1,
                damageModes: [],
                lastEventId: null
            });
        });
    }

    ensure(componentId) {
        if (!this.components.has(componentId)) {
            this.components.set(componentId, { id: componentId, health: 1, damageModes: [], lastEventId: null });
        }
        return this.components.get(componentId);
    }

    applyDamage({ componentId, type = 'damage', severity = 1, eventId = null, zone = null, time = 0 }) {
        const component = this.ensure(componentId);
        const boundedSeverity = Math.max(0, Math.min(1, Number(severity) || 0));
        const resultingHealth = Math.min(component.health, 1 - boundedSeverity);
        if (resultingHealth === component.health && component.damageModes.includes(type)) {
            return { componentId, type, severity: boundedSeverity, eventId, zone, time, health: component.health };
        }
        component.health = resultingHealth;
        if (!component.damageModes.includes(type)) component.damageModes.push(type);
        component.lastEventId = eventId;

        const entry = { componentId, type, severity: boundedSeverity, eventId, zone, time };
        this.damageLedger.push(entry);
        return { ...entry, health: component.health };
    }

    isOperable(componentId, minimumHealth = 0.05) {
        return (this.components.get(componentId)?.health ?? 1) > minimumHealth;
    }

    getSnapshot() {
        return Object.fromEntries(Array.from(this.components, ([id, state]) => [id, {
            health: state.health,
            damageModes: [...state.damageModes],
            lastEventId: state.lastEventId
        }]));
    }

    getDamageLedger() {
        return this.damageLedger.map(entry => ({ ...entry }));
    }
}
