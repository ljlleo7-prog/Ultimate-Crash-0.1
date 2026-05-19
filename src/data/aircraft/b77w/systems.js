// Initial systems state — stub, extend as needed
export const initialSystems = {
  electrical: { battery: true, gen1: true, gen2: true, apuGen: false, dcVolts: 28, acVolts: 115, acFreq: 400 },
  fuel: { tanks: { left: 8000, center: 0, right: 8000 }, leftPumps: true, rightPumps: true, centerPumps: false, crossfeed: false },
  hydraulics: { sysA: { pressure: 3000, qty: 100, engPump: true, elecPump: false }, sysB: { pressure: 3000, qty: 100, engPump: true, elecPump: true } },
  pressurization: { ductPressL: 40, ductPressR: 40, cabinAlt: 0, diffPressure: 0, isolationValve: true, packL: true, packR: true },
  apu: { master: false, start: false, running: false, bleed: false, egt: 0, n2: 0 },
  engines: { eng1: { fuelControl: true, startSwitch: 'OFF', n2: 0, egt: 0 }, eng2: { fuelControl: true, startSwitch: 'OFF', n2: 0, egt: 0 } },
  fire: { eng1: false, eng1Handle: false, eng2: false, eng2Handle: false, apu: false, apuHandle: false },
  ice: { wingAntiIce: false, eng1AntiIce: false, eng2AntiIce: false, probeHeat: true },
  lighting: { landing: false, taxi: false, strobe: true, beacon: true, nav: true, logo: false, emergencyLights: true },
  signs: { seatBelts: true, noSmoking: true },
  adirs: { ir1: 'NAV', ir2: 'NAV', aligned: true, alignState: 100, onBat: false },
};
