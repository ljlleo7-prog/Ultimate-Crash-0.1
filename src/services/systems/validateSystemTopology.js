export default function validateSystemTopology(topology) {
    const errors = [];
    const components = Array.isArray(topology?.components) ? topology.components : [];
    const componentIds = new Set();
    const providedResources = new Set();

    components.forEach((component, index) => {
        if (!component.id) errors.push(`components[${index}] has no id`);
        if (componentIds.has(component.id)) errors.push(`duplicate component id: ${component.id}`);
        componentIds.add(component.id);
        if (!component.zone) errors.push(`${component.id || `components[${index}]`} has no zone`);
        (component.provides || []).forEach(resource => providedResources.add(resource));
    });

    Object.entries(topology?.zones || {}).forEach(([zoneId, zone]) => {
        (zone.components || []).forEach(componentId => {
            if (!componentIds.has(componentId)) errors.push(`zone ${zoneId} references unknown component: ${componentId}`);
        });
    });

    components.forEach(component => {
        [...(component.requires || []), ...(component.requiresAny || [])].forEach(resource => {
            const external = /^engine_\d+_shaft$/.test(resource) || /^fuel_tank_[LRC]$/.test(resource);
            if (!external && !providedResources.has(resource)) {
                errors.push(`${component.id} requires resource with no provider: ${resource}`);
            }
        });
    });

    return { valid: errors.length === 0, errors };
}
