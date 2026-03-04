export const tutorialSteps = [
  // --- INITIALIZATION PHASE ---
  {
    id: 'init_difficulty',
    phase: 'initialization',
    targetId: 'difficulty-rookie',
    placement: 'right',
    translationKey: 'tutorial.steps.init_difficulty',
    trigger: (state) => state.difficulty === 'rookie' // Auto-advance if rookie selected? Or just highlight
  },
  {
    id: 'init_next_params',
    phase: 'initialization',
    targetId: 'btn-next-params',
    placement: 'top',
    translationKey: 'tutorial.steps.init_next_params',
    trigger: (state) => state.currentStep === 2
  },
  {
    id: 'init_aircraft',
    phase: 'initialization',
    targetId: 'input-aircraft',
    placement: 'right',
    translationKey: 'tutorial.steps.init_aircraft',
    trigger: (state) => state.aircraftModel
  },
  {
    id: 'init_next_route',
    phase: 'initialization',
    targetId: 'btn-next-route',
    placement: 'top',
    translationKey: 'tutorial.steps.init_next_route',
    trigger: (state) => state.currentStep === 3
  },
  {
    id: 'init_departure',
    phase: 'initialization',
    targetId: 'input-departure',
    placement: 'right',
    translationKey: 'tutorial.steps.init_departure',
    trigger: (state) => state.selectedDeparture
  },
  {
    id: 'init_arrival',
    phase: 'initialization',
    targetId: 'input-arrival',
    placement: 'right',
    translationKey: 'tutorial.steps.init_arrival',
    trigger: (state) => state.selectedArrival
  },
  {
    id: 'init_finalize',
    phase: 'initialization',
    targetId: 'btn-finalize',
    placement: 'top',
    translationKey: 'tutorial.steps.init_finalize',
    trigger: (state) => state.flightInitialized
  },

  // --- COCKPIT PREPARATION ---
  {
    id: 'cockpit_welcome',
    phase: 'flight_progress',
    targetId: 'flight-panel-main', // General area
    placement: 'center',
    translationKey: 'tutorial.steps.cockpit_welcome',
    actionRequired: 'next_button'
  },
  {
    id: 'open_overhead',
    phase: 'flight_progress',
    targetId: 'btn-systems',
    placement: 'left',
    translationKey: 'tutorial.steps.open_overhead',
    trigger: (state) => state.showOverhead
  },
  {
    id: 'battery_on',
    phase: 'flight_progress',
    targetId: 'sw-battery',
    placement: 'bottom',
    translationKey: 'tutorial.steps.battery_on',
    trigger: (state) => state.systems?.electrical?.battery
  },
  {
    id: 'apu_start',
    phase: 'flight_progress',
    targetId: 'sw-apu-start',
    placement: 'bottom',
    translationKey: 'tutorial.steps.apu_start',
    trigger: (state) => state.systems?.apu?.starting || state.systems?.apu?.running
  },
  {
    id: 'apu_gen_on',
    phase: 'flight_progress',
    targetId: 'sw-apu-gen',
    placement: 'bottom',
    translationKey: 'tutorial.steps.apu_gen_on',
    trigger: (state) => state.systems?.electrical?.apuGen
  },
  {
    id: 'fuel_pumps_on',
    phase: 'flight_progress',
    targetId: 'panel-fuel-pumps',
    placement: 'right',
    translationKey: 'tutorial.steps.fuel_pumps_on',
    trigger: (state) => state.systems?.fuel?.leftPumps && state.systems?.fuel?.rightPumps
  },
  {
    id: 'apu_bleed_on',
    phase: 'flight_progress',
    targetId: 'sw-apu-bleed',
    placement: 'top',
    translationKey: 'tutorial.steps.apu_bleed_on',
    trigger: (state) => state.systems?.apu?.bleed
  },
  {
    id: 'engine_start',
    phase: 'flight_progress',
    targetId: 'panel-engine-start',
    placement: 'top',
    translationKey: 'tutorial.steps.engine_start',
    trigger: (state) => state.systems?.engines?.eng2?.startSwitch === 'GRD'
  },
  {
    id: 'fuel_control_run',
    phase: 'flight_progress',
    targetId: 'sw-fuel-control-2',
    placement: 'top',
    translationKey: 'tutorial.steps.fuel_control_run',
    trigger: (state) => state.systems?.engines?.eng2?.fuelControl
  },
  {
    id: 'close_overhead',
    phase: 'flight_progress',
    targetId: 'btn-close-overhead',
    placement: 'bottom',
    translationKey: 'tutorial.steps.close_overhead',
    trigger: (state) => !state.showOverhead
  },

  // --- TAKEOFF ---
  {
    id: 'flaps_set',
    phase: 'flight_progress',
    targetId: 'lever-flaps',
    placement: 'right',
    translationKey: 'tutorial.steps.flaps_set',
    trigger: (state) => state.flaps > 0
  },
  {
    id: 'parking_brake_release',
    phase: 'flight_progress',
    targetId: 'lever-parking-brake',
    placement: 'left',
    translationKey: 'tutorial.steps.parking_brake_release',
    trigger: (state) => !state.parkingBrake
  },
  {
    id: 'throttle_up',
    phase: 'flight_progress',
    targetId: 'lever-throttle',
    placement: 'left',
    translationKey: 'tutorial.steps.throttle_up',
    trigger: (state) => state.throttle > 0.8
  },
  {
    id: 'rotate',
    phase: 'flight_progress',
    targetId: 'pfd-speed-tape',
    placement: 'right',
    translationKey: 'tutorial.steps.rotate',
    trigger: (state) => state.pitch > 5
  },
  {
    id: 'gear_up',
    phase: 'flight_progress',
    targetId: 'lever-gear',
    placement: 'right',
    translationKey: 'tutorial.steps.gear_up',
    trigger: (state) => state.gear === false // up
  },

  // --- AUTOPILOT ---
  {
    id: 'autopilot_engage',
    phase: 'flight_progress',
    targetId: 'btn-autopilot',
    placement: 'bottom',
    translationKey: 'tutorial.steps.autopilot_engage',
    trigger: (state) => state.autopilot
  },
  
  // --- END TUTORIAL ---
  {
    id: 'tutorial_complete',
    phase: 'flight_progress',
    targetId: 'flight-panel-main',
    placement: 'center',
    translationKey: 'tutorial.steps.complete',
    actionRequired: 'finish'
  }
];
