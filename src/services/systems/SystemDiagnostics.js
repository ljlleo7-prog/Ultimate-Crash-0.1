export default class SystemDiagnostics {
    constructor(topology, componentStore) {
        this.topology = topology;
        this.componentStore = componentStore;
    }

    explainResource(resource, resolution) {
        const providers = this.topology.components.filter(component =>
            (component.provides || []).includes(resource));
        return {
            resource,
            available: resolution.resources.has(resource),
            suppliedBy: resolution.suppliedBy[resource] || [],
            providers: providers.map(component => {
                const state = this.componentStore.ensure(component.id);
                return {
                    componentId: component.id,
                    zone: component.zone,
                    active: resolution.activeComponents.has(component.id),
                    health: state.health,
                    damageModes: [...state.damageModes],
                    requires: [...(component.requires || [])],
                    requiresAny: [...(component.requiresAny || [])]
                };
            })
        };
    }

    buildReport(resolution) {
        const criticalResources = [
            'ac_bus_1', 'ac_bus_2', 'dc_essential', 'hydraulic_A', 'hydraulic_B',
            'fuel_feed_engine_1', 'fuel_feed_engine_2', 'bleed_duct_L', 'bleed_duct_R',
            'cabin_pressure_control', 'roll_control', 'pitch_control', 'yaw_control',
            'wheel_braking', 'gear_actuation'
        ];
        return {
            resources: criticalResources.map(resource => this.explainResource(resource, resolution)),
            damagedComponents: Object.entries(this.componentStore.getSnapshot())
                .filter(([, state]) => state.health < 1)
                .map(([componentId, state]) => ({ componentId, ...state }))
        };
    }
}
