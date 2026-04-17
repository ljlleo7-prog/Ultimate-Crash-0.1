const panelSectionSets = {
  b737: [
    { column: 'col1', sections: ['b737FlightControl', 'b737Nav', 'b737Fuel', 'hydraulics', 'comm'] },
    { column: 'col2', sections: ['b737Electrical', 'engine', 'apu', 'fire'] },
    { column: 'col3', sections: ['b737Ice', 'pneumatic', 'b737Misc', 'lights'] }
  ],
  b747: [
    { column: 'col1', sections: ['fire', 'adirs', 'electrical', 'comm'] },
    { column: 'col2', sections: ['hydraulics', 'fuel', 'engine', 'apu'] },
    { column: 'col3', sections: ['pneumatic', 'iceRain', 'lights', 'misc'] }
  ],
  b757: [
    { column: 'col1', sections: ['adirs', 'electrical', 'hydraulics', 'comm'] },
    { column: 'col2', sections: ['fire', 'fuel', 'engine', 'apu'] },
    { column: 'col3', sections: ['iceRain', 'pneumatic', 'lights', 'misc'] }
  ],
  b777: [
    { column: 'col1', sections: ['adirs', 'electrical', 'hydraulics', 'comm'] },
    { column: 'col2', sections: ['fire', 'misc', 'engine', 'apu', 'fuel'] },
    { column: 'col3', sections: ['pneumatic', 'iceRain', 'lights'] }
  ],
  a320: [
    { area: 'adirs', sections: ['adirs'] },
    { area: 'fire', sections: ['fire'] },
    { area: 'lights', sections: ['lights'] },
    { area: 'hyd', sections: ['hydraulics'] },
    { area: 'elec', sections: ['electrical'] },
    { area: 'aircond', sections: ['pneumatic'] },
    { area: 'fuel', sections: ['fuel'] },
    { area: 'engine', sections: ['engine'] },
    { area: 'apu', sections: ['apu'] },
    { area: 'misc', sections: ['comm', 'misc'] }
  ],
  a330: [
    { area: 'adirs', sections: ['adirs'] },
    { area: 'fire', sections: ['fire'] },
    { area: 'lights', sections: ['lights'] },
    { area: 'hyd', sections: ['hydraulics'] },
    { area: 'elec', sections: ['electrical'] },
    { area: 'aircond', sections: ['pneumatic'] },
    { area: 'fuel', sections: ['fuel'] },
    { area: 'engine', sections: ['engine', 'apu'] },
    { area: 'apu', sections: ['comm'] },
    { area: 'misc', sections: ['misc'] }
  ],
  a350: [
    { area: 'fire', sections: ['fire'] },
    { area: 'adirs', sections: ['adirs'] },
    { area: 'lights', sections: ['lights'] },
    { area: 'elec', sections: ['electrical'] },
    { area: 'aircond', sections: ['pneumatic'] },
    { area: 'hyd', sections: ['hydraulics'] },
    { area: 'fuel', sections: ['fuel'] },
    { area: 'engine', sections: ['engine'] },
    { area: 'apu', sections: ['apu'] },
    { area: 'misc', sections: ['comm', 'misc'] }
  ],
  a380: [
    { area: 'fire', sections: ['fire'] },
    { area: 'lights', sections: ['lights'] },
    { area: 'adirs', sections: ['adirs'] },
    { area: 'elec', sections: ['electrical'] },
    { area: 'hyd', sections: ['hydraulics'] },
    { area: 'aircond', sections: ['pneumatic'] },
    { area: 'fuel', sections: ['fuel'] },
    { area: 'engine', sections: ['engine'] },
    { area: 'apu', sections: ['apu'] },
    { area: 'misc', sections: ['comm', 'misc'] }
  ]
};

export const overheadPanelLayouts = {
  boeing_737_800_overhead: {
    id: 'boeing_737_800_overhead',
    family: 'boeing_737',
    manufacturer: 'Boeing',
    referenceAsset: '/src/data/737-OH-PNL.jpeg',
    legacyVariant: 'b737',
    designVariant: 'b737Photo',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.b737
  },
  airbus_a320_200_overhead: {
    id: 'airbus_a320_200_overhead',
    family: 'airbus_a320_family',
    manufacturer: 'Airbus',
    referenceAsset: '/src/data/320-OH-PNL.jpg',
    legacyVariant: 'airbus',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.a320
  },
  boeing_777_300er_overhead: {
    id: 'boeing_777_300er_overhead',
    family: 'boeing_777_family',
    manufacturer: 'Boeing',
    referenceAsset: '/src/data/777-OH-PNL.jpg',
    legacyVariant: 'boeingWidebody',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.b777
  },
  airbus_a350_900_overhead: {
    id: 'airbus_a350_900_overhead',
    family: 'airbus_a350_family',
    manufacturer: 'Airbus',
    referenceAsset: '/src/data/350-OH-PNL.webp',
    legacyVariant: 'airbus',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.a350
  },
  boeing_747_400_overhead: {
    id: 'boeing_747_400_overhead',
    family: 'boeing_747_family',
    manufacturer: 'Boeing',
    referenceAsset: '/src/data/747-OH-PNL.jpg',
    legacyVariant: 'boeingWidebody',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.b747
  },
  airbus_a380_800_overhead: {
    id: 'airbus_a380_800_overhead',
    family: 'airbus_a380_family',
    manufacturer: 'Airbus',
    referenceAsset: '/src/data/380-OH-PNL.webp',
    legacyVariant: 'airbus',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.a380
  },
  airbus_a330_300_overhead: {
    id: 'airbus_a330_300_overhead',
    family: 'airbus_a330_family',
    manufacturer: 'Airbus',
    referenceAsset: '/src/data/330-OH-PNL.jpg',
    legacyVariant: 'airbus',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.a330
  },
  boeing_757_200_overhead: {
    id: 'boeing_757_200_overhead',
    family: 'boeing_757_767_family',
    manufacturer: 'Boeing',
    referenceAsset: '/src/data/757or767-OH-PNL.jpg',
    legacyVariant: 'boeingWidebody',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.b757
  },
  boeing_generic_overhead: {
    id: 'boeing_generic_overhead',
    family: 'boeing_generic',
    manufacturer: 'Boeing',
    referenceAsset: null,
    legacyVariant: 'boeingWidebody',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.b777
  },
  airbus_generic_overhead: {
    id: 'airbus_generic_overhead',
    family: 'airbus_generic',
    manufacturer: 'Airbus',
    referenceAsset: null,
    legacyVariant: 'airbus',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.a320
  },
  generic_overhead: {
    id: 'generic_overhead',
    family: 'generic',
    manufacturer: 'Generic',
    referenceAsset: null,
    legacyVariant: 'boeingWidebody',
    size: { width: 960, height: 720 },
    columns: panelSectionSets.b777
  }
};

const familyFallbackByIcao = [
  { pattern: /^B73/i, layoutId: 'boeing_737_800_overhead' },
  { pattern: /^B77/i, layoutId: 'boeing_777_300er_overhead' },
  { pattern: /^B74/i, layoutId: 'boeing_747_400_overhead' },
  { pattern: /^B75|^B76/i, layoutId: 'boeing_757_200_overhead' },
  { pattern: /^A32/i, layoutId: 'airbus_a320_200_overhead' },
  { pattern: /^A33/i, layoutId: 'airbus_a330_300_overhead' },
  { pattern: /^A35/i, layoutId: 'airbus_a350_900_overhead' },
  { pattern: /^A38/i, layoutId: 'airbus_a380_800_overhead' }
];

export function resolveOverheadPanelLayout(aircraft = {}, aircraftModel = '') {
  const explicitLayoutId = aircraft?.overheadLayoutId;
  if (explicitLayoutId && overheadPanelLayouts[explicitLayoutId]) {
    return overheadPanelLayouts[explicitLayoutId];
  }

  const icao = String(aircraft?.icao || '').toUpperCase();
  const matchedFamily = familyFallbackByIcao.find(({ pattern }) => pattern.test(icao));
  if (matchedFamily) {
    return overheadPanelLayouts[matchedFamily.layoutId];
  }

  const manufacturer = String(aircraft?.manufacturer || aircraftModel || '').toLowerCase();
  if (manufacturer.includes('airbus') || /^a3/.test(icao.toLowerCase())) {
    return overheadPanelLayouts.airbus_generic_overhead;
  }
  if (manufacturer.includes('boeing') || /^b7/.test(icao.toLowerCase()) || /^b7/.test(String(aircraftModel).toLowerCase())) {
    return overheadPanelLayouts.boeing_generic_overhead;
  }

  return overheadPanelLayouts.generic_overhead;
}
