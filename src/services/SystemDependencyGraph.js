/**
 * Physical System Dependency Graph
 * Models actual aircraft system interdependencies
 */

const BOEING_737_SYSTEMS = {
    // ELECTRICAL SYSTEM
    battery: {
        requires: [],
        provides: ['dc_essential', 'dc_bus_1', 'dc_bus_2'],
        type: 'electrical'
    },
    ext_power: {
        requires: [],
        provides: ['ac_bus_1', 'ac_bus_2'],
        type: 'electrical'
    },
    apu_generator: {
        requires: ['apu_running'],
        provides: ['ac_bus_1', 'ac_bus_2'],
        type: 'electrical'
    },
    engine_generator_1: {
        requires: ['engine_1_running'],
        provides: ['ac_bus_1'],
        type: 'electrical'
    },
    engine_generator_2: {
        requires: ['engine_2_running'],
        provides: ['ac_bus_2'],
        type: 'electrical'
    },
    tr_1: {
        requires: ['ac_bus_1'],
        provides: ['dc_bus_1'],
        type: 'electrical'
    },
    tr_2: {
        requires: ['ac_bus_2'],
        provides: ['dc_bus_2'],
        type: 'electrical'
    },
    static_inverter: {
        requires: ['dc_essential'],
        provides: ['ac_essential'],
        type: 'electrical'
    },

    // PNEUMATIC SYSTEM
    apu_bleed: {
        requires: ['apu_running'],
        provides: ['bleed_pressure'],
        type: 'pneumatic'
    },
    engine_1_bleed: {
        requires: ['engine_1_running'],
        provides: ['bleed_pressure'],
        type: 'pneumatic'
    },
    engine_2_bleed: {
        requires: ['engine_2_running'],
        provides: ['bleed_pressure'],
        type: 'pneumatic'
    },
    pack_1: {
        requires: ['bleed_pressure', 'ac_bus_1'],
        provides: ['conditioned_air'],
        type: 'pneumatic'
    },
    pack_2: {
        requires: ['bleed_pressure', 'ac_bus_2'],
        provides: ['conditioned_air'],
        type: 'pneumatic'
    },

    // HYDRAULIC SYSTEM
    hydraulic_green_engine_pump: {
        requires: ['engine_1_running'],
        provides: ['hydraulic_green'],
        type: 'hydraulic'
    },
    hydraulic_yellow_engine_pump: {
        requires: ['engine_2_running'],
        provides: ['hydraulic_yellow'],
        type: 'hydraulic'
    },
    hydraulic_blue_elec_pump: {
        requires: ['ac_bus_1'],
        provides: ['hydraulic_blue'],
        type: 'hydraulic'
    },
    hydraulic_yellow_elec_pump: {
        requires: ['ac_bus_2'],
        provides: ['hydraulic_yellow'],
        type: 'hydraulic'
    },
    ptu: {
        requires: ['hydraulic_green', 'hydraulic_yellow'],
        provides: ['hydraulic_transfer'],
        type: 'hydraulic'
    },

    // FLIGHT CONTROLS
    elevator: {
        requires: ['hydraulic_green', 'hydraulic_yellow'],
        provides: ['pitch_control'],
        type: 'flight_control'
    },
    aileron: {
        requires: ['hydraulic_green', 'hydraulic_blue'],
        provides: ['roll_control'],
        type: 'flight_control'
    },
    rudder: {
        requires: ['hydraulic_green', 'hydraulic_yellow', 'hydraulic_blue'],
        provides: ['yaw_control'],
        type: 'flight_control'
    },
    spoilers: {
        requires: ['hydraulic_green', 'hydraulic_yellow'],
        provides: ['roll_control', 'speedbrake'],
        type: 'flight_control'
    },

    // NAVIGATION & AVIONICS
    adirs_1: {
        requires: ['dc_bus_1'],
        provides: ['attitude_1', 'heading_1', 'airdata_1'],
        type: 'navigation'
    },
    adirs_2: {
        requires: ['dc_bus_2'],
        provides: ['attitude_2', 'heading_2', 'airdata_2'],
        type: 'navigation'
    },
    adirs_3: {
        requires: ['dc_essential'],
        provides: ['attitude_3', 'heading_3', 'airdata_3'],
        type: 'navigation'
    },
    fms_1: {
        requires: ['ac_bus_1', 'attitude_1', 'heading_1'],
        provides: ['nav_data_1'],
        type: 'navigation'
    },
    fms_2: {
        requires: ['ac_bus_2', 'attitude_2', 'heading_2'],
        provides: ['nav_data_2'],
        type: 'navigation'
    },
    autopilot_1: {
        requires: ['ac_bus_1', 'nav_data_1', 'hydraulic_green'],
        provides: ['auto_flight'],
        type: 'navigation'
    },
    autopilot_2: {
        requires: ['ac_bus_2', 'nav_data_2', 'hydraulic_yellow'],
        provides: ['auto_flight'],
        type: 'navigation'
    },

    // FUEL SYSTEM
    fuel_pump_left_1: {
        requires: ['ac_bus_1'],
        provides: ['fuel_pressure_left'],
        type: 'fuel'
    },
    fuel_pump_left_2: {
        requires: ['ac_bus_2'],
        provides: ['fuel_pressure_left'],
        type: 'fuel'
    },
    fuel_pump_right_1: {
        requires: ['ac_bus_1'],
        provides: ['fuel_pressure_right'],
        type: 'fuel'
    },
    fuel_pump_right_2: {
        requires: ['ac_bus_2'],
        provides: ['fuel_pressure_right'],
        type: 'fuel'
    },
    fuel_pump_center: {
        requires: ['ac_bus_1'],
        provides: ['fuel_pressure_center'],
        type: 'fuel'
    },

    // ENGINE SYSTEMS
    apu_running: {
        requires: ['battery'],
        provides: ['apu_power'],
        type: 'engine'
    },
    engine_1_running: {
        requires: ['bleed_pressure', 'fuel_pressure_left'],
        provides: ['engine_1_power'],
        type: 'engine'
    },
    engine_2_running: {
        requires: ['bleed_pressure', 'fuel_pressure_right'],
        provides: ['engine_2_power'],
        type: 'engine'
    },

    // PRESSURIZATION
    pressurization_controller: {
        requires: ['ac_bus_1', 'conditioned_air'],
        provides: ['cabin_pressure'],
        type: 'environmental'
    },
    outflow_valve: {
        requires: ['dc_bus_1'],
        provides: ['pressure_control'],
        type: 'environmental'
    }
};

const AIRBUS_A320_SYSTEMS = {
    battery_1: { requires: [], provides: ['dc_bat'], type: 'electrical' },
    battery_2: { requires: [], provides: ['dc_ess'], type: 'electrical' },
    ext_power: { requires: [], provides: ['ac_bus_1', 'ac_bus_2'], type: 'electrical' },
    apu_generator: { requires: ['apu_running'], provides: ['ac_bus_1', 'ac_bus_2'], type: 'electrical' },
    engine_generator_1: { requires: ['engine_1_running'], provides: ['ac_bus_1'], type: 'electrical' },
    engine_generator_2: { requires: ['engine_2_running'], provides: ['ac_bus_2'], type: 'electrical' },
    tr_1: { requires: ['ac_bus_1'], provides: ['dc_bus_1'], type: 'electrical' },
    tr_2: { requires: ['ac_bus_2'], provides: ['dc_bus_2'], type: 'electrical' },

    apu_bleed: { requires: ['apu_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    engine_1_bleed: { requires: ['engine_1_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    engine_2_bleed: { requires: ['engine_2_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    pack_1: { requires: ['bleed_pressure', 'ac_bus_1'], provides: ['conditioned_air'], type: 'pneumatic' },
    pack_2: { requires: ['bleed_pressure', 'ac_bus_2'], provides: ['conditioned_air'], type: 'pneumatic' },

    hydraulic_green_engine_pump: { requires: ['engine_1_running'], provides: ['hydraulic_green'], type: 'hydraulic' },
    hydraulic_yellow_engine_pump: { requires: ['engine_2_running'], provides: ['hydraulic_yellow'], type: 'hydraulic' },
    hydraulic_blue_elec_pump: { requires: ['ac_bus_1'], provides: ['hydraulic_blue'], type: 'hydraulic' },
    ptu: { requires: ['hydraulic_green'], provides: ['hydraulic_yellow'], type: 'hydraulic' },

    elevator: { requires: ['hydraulic_green', 'hydraulic_yellow'], provides: ['pitch_control'], type: 'flight_control' },
    aileron: { requires: ['hydraulic_green', 'hydraulic_blue'], provides: ['roll_control'], type: 'flight_control' },
    rudder: { requires: ['hydraulic_green', 'hydraulic_yellow', 'hydraulic_blue'], provides: ['yaw_control'], type: 'flight_control' },

    adirs_1: { requires: ['dc_bus_1'], provides: ['attitude_1', 'heading_1', 'airdata_1'], type: 'navigation' },
    adirs_2: { requires: ['dc_bus_2'], provides: ['attitude_2', 'heading_2', 'airdata_2'], type: 'navigation' },
    adirs_3: { requires: ['dc_ess'], provides: ['attitude_3', 'heading_3', 'airdata_3'], type: 'navigation' },
    fmgc_1: { requires: ['ac_bus_1', 'attitude_1'], provides: ['nav_data_1'], type: 'navigation' },
    fmgc_2: { requires: ['ac_bus_2', 'attitude_2'], provides: ['nav_data_2'], type: 'navigation' },

    apu_running: { requires: ['battery_1'], provides: ['apu_power'], type: 'engine' },
    engine_1_running: { requires: ['bleed_pressure', 'fuel_pressure_left'], provides: ['engine_1_power'], type: 'engine' },
    engine_2_running: { requires: ['bleed_pressure', 'fuel_pressure_right'], provides: ['engine_2_power'], type: 'engine' },

    fuel_pump_left_1: { requires: ['ac_bus_1'], provides: ['fuel_pressure_left'], type: 'fuel' },
    fuel_pump_right_1: { requires: ['ac_bus_2'], provides: ['fuel_pressure_right'], type: 'fuel' }
};

const BOEING_777_SYSTEMS = {
    battery: { requires: [], provides: ['dc_essential'], type: 'electrical' },
    ext_power: { requires: [], provides: ['ac_bus_1', 'ac_bus_2'], type: 'electrical' },
    apu_generator: { requires: ['apu_running'], provides: ['ac_bus_1', 'ac_bus_2'], type: 'electrical' },
    engine_generator_1: { requires: ['engine_1_running'], provides: ['ac_bus_1'], type: 'electrical' },
    engine_generator_2: { requires: ['engine_2_running'], provides: ['ac_bus_2'], type: 'electrical' },

    hydraulic_left_engine_pump: { requires: ['engine_1_running'], provides: ['hydraulic_left'], type: 'hydraulic' },
    hydraulic_right_engine_pump: { requires: ['engine_2_running'], provides: ['hydraulic_right'], type: 'hydraulic' },
    hydraulic_center_elec_pump: { requires: ['ac_bus_1'], provides: ['hydraulic_center'], type: 'hydraulic' },

    elevator: { requires: ['hydraulic_left', 'hydraulic_right'], provides: ['pitch_control'], type: 'flight_control' },
    aileron: { requires: ['hydraulic_left', 'hydraulic_center'], provides: ['roll_control'], type: 'flight_control' },

    apu_running: { requires: ['battery'], provides: ['apu_power'], type: 'engine' },
    engine_1_running: { requires: ['bleed_pressure', 'fuel_pressure_left'], provides: ['engine_1_power'], type: 'engine' },
    engine_2_running: { requires: ['bleed_pressure', 'fuel_pressure_right'], provides: ['engine_2_power'], type: 'engine' },

    apu_bleed: { requires: ['apu_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    engine_1_bleed: { requires: ['engine_1_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    engine_2_bleed: { requires: ['engine_2_running'], provides: ['bleed_pressure'], type: 'pneumatic' },

    fuel_pump_left: { requires: ['ac_bus_1'], provides: ['fuel_pressure_left'], type: 'fuel' },
    fuel_pump_right: { requires: ['ac_bus_2'], provides: ['fuel_pressure_right'], type: 'fuel' }
};

const BOEING_747_SYSTEMS = {
    battery: { requires: [], provides: ['dc_essential', 'dc_bus_1'], type: 'electrical' },
    apu_generator: { requires: ['apu_running'], provides: ['ac_bus_1'], type: 'electrical' },
    engine_generator_1: { requires: ['engine_1_running'], provides: ['ac_bus_1'], type: 'electrical' },
    engine_generator_2: { requires: ['engine_2_running'], provides: ['ac_bus_2'], type: 'electrical' },
    engine_generator_3: { requires: ['engine_3_running'], provides: ['ac_bus_3'], type: 'electrical' },
    engine_generator_4: { requires: ['engine_4_running'], provides: ['ac_bus_4'], type: 'electrical' },

    hydraulic_1_pump: { requires: ['engine_1_running'], provides: ['hydraulic_1'], type: 'hydraulic' },
    hydraulic_2_pump: { requires: ['engine_2_running'], provides: ['hydraulic_2'], type: 'hydraulic' },
    hydraulic_3_pump: { requires: ['engine_3_running'], provides: ['hydraulic_3'], type: 'hydraulic' },
    hydraulic_4_pump: { requires: ['engine_4_running'], provides: ['hydraulic_4'], type: 'hydraulic' },

    apu_running: { requires: ['battery'], provides: ['apu_power'], type: 'engine' },
    engine_1_running: { requires: ['bleed_pressure'], provides: ['engine_1_power'], type: 'engine' },
    engine_2_running: { requires: ['bleed_pressure'], provides: ['engine_2_power'], type: 'engine' },
    engine_3_running: { requires: ['bleed_pressure'], provides: ['engine_3_power'], type: 'engine' },
    engine_4_running: { requires: ['bleed_pressure'], provides: ['engine_4_power'], type: 'engine' },

    apu_bleed: { requires: ['apu_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    engine_1_bleed: { requires: ['engine_1_running'], provides: ['bleed_pressure'], type: 'pneumatic' },
    engine_2_bleed: { requires: ['engine_2_running'], provides: ['bleed_pressure'], type: 'pneumatic' },

    fuel_pump_main: { requires: ['dc_bus_1'], provides: ['fuel_pressure_left', 'fuel_pressure_right'], type: 'fuel' }
};

const MODEL_CONFIGS = {
    'Boeing 737-800': BOEING_737_SYSTEMS,
    'Boeing 737-700': BOEING_737_SYSTEMS,
    'Boeing 737-900': BOEING_737_SYSTEMS,
    'Airbus A320-200': AIRBUS_A320_SYSTEMS,
    'Airbus A319': AIRBUS_A320_SYSTEMS,
    'Airbus A321': AIRBUS_A320_SYSTEMS,
    'Boeing 777-300ER': BOEING_777_SYSTEMS,
    'Boeing 777-200': BOEING_777_SYSTEMS,
    'Boeing 747-400': BOEING_747_SYSTEMS,
    'Boeing 747-8': BOEING_747_SYSTEMS,
    'Airbus A350-900': AIRBUS_A320_SYSTEMS,
    'Airbus A330-300': AIRBUS_A320_SYSTEMS,
    'Airbus A340-600': BOEING_747_SYSTEMS
};

export function getSystemDependencies(aircraftModel) {
    return MODEL_CONFIGS[aircraftModel] || BOEING_737_SYSTEMS;
}

export function resolveSystemState(systemStates, aircraftModel) {
    const SYSTEM_DEPENDENCIES = getSystemDependencies(aircraftModel);
    const available = new Set();
    let changed = true;

    while (changed) {
        changed = false;
        for (const [systemName, config] of Object.entries(SYSTEM_DEPENDENCIES)) {
            if (available.has(systemName)) continue;
            if (!systemStates[systemName]) continue;

            const requirementsMet = config.requires.every(req =>
                available.has(req) || systemStates[req]
            );

            if (requirementsMet) {
                available.add(systemName);
                config.provides.forEach(p => available.add(p));
                changed = true;
            }
        }
    }

    return available;
}

export function getSystemStatus(systemName, availableResources, aircraftModel) {
    const SYSTEM_DEPENDENCIES = getSystemDependencies(aircraftModel);
    const system = SYSTEM_DEPENDENCIES[systemName];
    if (!system) return { available: false, missing: [] };

    const missing = system.requires.filter(req => !availableResources.has(req));
    return {
        available: missing.length === 0,
        missing,
        provides: system.provides,
        type: system.type
    };
}

export function getSystemsByType(type, aircraftModel) {
    const SYSTEM_DEPENDENCIES = getSystemDependencies(aircraftModel);
    return Object.entries(SYSTEM_DEPENDENCIES)
        .filter(([_, config]) => config.type === type)
        .map(([name]) => name);
}
