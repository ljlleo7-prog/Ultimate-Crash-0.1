export const B737_OVERHEAD_EDITOR_LAYOUT_VERSION = 1;

export const b737OverheadEditableLayout = {
  version: B737_OVERHEAD_EDITOR_LAYOUT_VERSION,
  canvas: {
    width: 1240,
    height: 900
  },
  guides: {
    vertical: [0.255, 0.5, 0.745],
    horizontal: [0.175, 0.84]
  },
  groups: [
    { id: 'upper-left', label: 'Upper Left Pair' },
    { id: 'upper-center', label: 'Upper Center Spine' },
    { id: 'upper-right', label: 'Upper Right Pair' },
    { id: 'main-left', label: 'Main Left Pair' },
    { id: 'main-center', label: 'Main Center Spine' },
    { id: 'main-right', label: 'Main Right Pair' },
    { id: 'footer', label: 'Footer Strip' }
  ],
  elements: [
    { id: 'upperFlightControl', kind: 'plate', region: 'upperLeftOuter', x: 0.018, y: 0.02, width: 0.2, height: 0.105, zIndex: 1, locked: false, visible: true, groupId: 'upper-left', anchor: 'top-left' },
    { id: 'upperNav', kind: 'plate', region: 'upperLeftInner', x: 0.226, y: 0.02, width: 0.165, height: 0.105, zIndex: 1, locked: false, visible: true, groupId: 'upper-left', anchor: 'top-left' },
    { id: 'upperCall', kind: 'slot', region: 'upperCenter', x: 0.405, y: 0.02, width: 0.07, height: 0.105, zIndex: 1, locked: false, visible: true, groupId: 'upper-center', anchor: 'top-left' },
    { id: 'upperApu', kind: 'plate', region: 'upperRightInner', x: 0.535, y: 0.02, width: 0.165, height: 0.105, zIndex: 1, locked: false, visible: true, groupId: 'upper-right', anchor: 'top-left' },
    { id: 'upperUtility', kind: 'plate', region: 'upperRightOuter', x: 0.708, y: 0.02, width: 0.145, height: 0.105, zIndex: 1, locked: false, visible: true, groupId: 'upper-right', anchor: 'top-left' },
    { id: 'upperTest', kind: 'plate', region: 'upperRightOuter', x: 0.862, y: 0.02, width: 0.12, height: 0.105, zIndex: 1, locked: false, visible: true, groupId: 'upper-right', anchor: 'top-left' },

    { id: 'mainElectrical', kind: 'module', region: 'mainLeftOuter', x: 0.018, y: 0.155, width: 0.185, height: 0.165, zIndex: 1, locked: false, visible: true, groupId: 'main-left', anchor: 'top-left' },
    { id: 'mainFuel', kind: 'module', region: 'mainLeftOuter', x: 0.018, y: 0.335, width: 0.185, height: 0.2, zIndex: 1, locked: false, visible: true, groupId: 'main-left', anchor: 'top-left' },
    { id: 'mainHydraulics', kind: 'module', region: 'mainLeftInner', x: 0.215, y: 0.155, width: 0.175, height: 0.225, zIndex: 1, locked: false, visible: true, groupId: 'main-left', anchor: 'top-left' },

    { id: 'mainSpine', kind: 'spine', region: 'mainCenter', x: 0.46, y: 0.155, width: 0.08, height: 0.49, zIndex: 1, locked: false, visible: true, groupId: 'main-center', anchor: 'top-left' },

    { id: 'mainPneumatic', kind: 'module', region: 'mainRightInner', x: 0.56, y: 0.155, width: 0.19, height: 0.22, zIndex: 1, locked: false, visible: true, groupId: 'main-right', anchor: 'top-left' },
    { id: 'mainStart', kind: 'module', region: 'mainRightInner', x: 0.56, y: 0.39, width: 0.19, height: 0.145, zIndex: 1, locked: false, visible: true, groupId: 'main-right', anchor: 'top-left' },

    { id: 'mainEnvironment', kind: 'module', region: 'mainRightOuter', x: 0.762, y: 0.155, width: 0.22, height: 0.11, zIndex: 1, locked: false, visible: true, groupId: 'main-right', anchor: 'top-left' },
    { id: 'mainPressurization', kind: 'module', region: 'mainRightOuter', x: 0.762, y: 0.278, width: 0.22, height: 0.14, zIndex: 1, locked: false, visible: true, groupId: 'main-right', anchor: 'top-left' },
    { id: 'mainMonitor', kind: 'plate', region: 'mainRightOuter', x: 0.762, y: 0.432, width: 0.22, height: 0.12, zIndex: 1, locked: false, visible: true, groupId: 'main-right', anchor: 'top-left' },
    { id: 'mainAntiIce', kind: 'module', region: 'mainRightOuter', x: 0.762, y: 0.566, width: 0.22, height: 0.13, zIndex: 1, locked: false, visible: true, groupId: 'main-right', anchor: 'top-left' },

    { id: 'footerLighting', kind: 'footer', region: 'footerLeft', x: 0.018, y: 0.785, width: 0.71, height: 0.13, zIndex: 1, locked: false, visible: true, groupId: 'footer', anchor: 'top-left' },
    { id: 'footerUtility', kind: 'footer', region: 'footerRight', x: 0.738, y: 0.785, width: 0.244, height: 0.13, zIndex: 1, locked: false, visible: true, groupId: 'footer', anchor: 'top-left' }
  ],
  childElements: [
    { id: 'electricalMeters', parentId: 'mainElectrical', x: 0.03, y: 0.07, width: 0.94, height: 0.15, zIndex: 3, locked: false, visible: true },
    { id: 'electricalStatus', parentId: 'mainElectrical', x: 0.03, y: 0.25, width: 0.94, height: 0.22, zIndex: 3, locked: false, visible: true },
    { id: 'electricalControls', parentId: 'mainElectrical', x: 0.02, y: 0.5, width: 0.96, height: 0.42, zIndex: 3, locked: false, visible: true },

    { id: 'fuelQty', parentId: 'mainFuel', x: 0.04, y: 0.05, width: 0.92, height: 0.13, zIndex: 3, locked: false, visible: true },
    { id: 'fuelSchematic', parentId: 'mainFuel', x: 0.05, y: 0.19, width: 0.9, height: 0.38, zIndex: 2, locked: false, visible: true },
    { id: 'fuelControls', parentId: 'mainFuel', x: 0.03, y: 0.56, width: 0.94, height: 0.36, zIndex: 3, locked: false, visible: true },

    { id: 'hydGauges', parentId: 'mainHydraulics', x: 0.04, y: 0.1, width: 0.92, height: 0.28, zIndex: 3, locked: false, visible: true },
    { id: 'hydStatus', parentId: 'mainHydraulics', x: 0.03, y: 0.42, width: 0.94, height: 0.16, zIndex: 3, locked: false, visible: true },
    { id: 'hydControls', parentId: 'mainHydraulics', x: 0.08, y: 0.62, width: 0.84, height: 0.24, zIndex: 3, locked: false, visible: true },

    { id: 'pneuGauges', parentId: 'mainPneumatic', x: 0.05, y: 0.09, width: 0.9, height: 0.17, zIndex: 3, locked: false, visible: true },
    { id: 'pneuStatus', parentId: 'mainPneumatic', x: 0.03, y: 0.29, width: 0.94, height: 0.14, zIndex: 3, locked: false, visible: true },
    { id: 'pneuSchematic', parentId: 'mainPneumatic', x: 0.06, y: 0.42, width: 0.88, height: 0.22, zIndex: 2, locked: false, visible: true },
    { id: 'pneuControls', parentId: 'mainPneumatic', x: 0.03, y: 0.63, width: 0.94, height: 0.3, zIndex: 3, locked: false, visible: true },

    { id: 'lightingLeft', parentId: 'footerLighting', x: 0.02, y: 0.08, width: 0.3, height: 0.82, zIndex: 3, locked: false, visible: true },
    { id: 'lightingCenter', parentId: 'footerLighting', x: 0.345, y: 0.08, width: 0.31, height: 0.82, zIndex: 3, locked: false, visible: true },
    { id: 'lightingRight', parentId: 'footerLighting', x: 0.68, y: 0.08, width: 0.3, height: 0.82, zIndex: 3, locked: false, visible: true }
  ],
  controlElements: [
    { id: 'elec-bat', parentId: 'electricalControls', x: 0.03, y: 0.1, width: 0.18, height: 0.78, zIndex: 4, locked: false, visible: true },
    { id: 'elec-stby', parentId: 'electricalControls', x: 0.235, y: 0.1, width: 0.18, height: 0.78, zIndex: 4, locked: false, visible: true },
    { id: 'elec-gen1', parentId: 'electricalControls', x: 0.46, y: 0.08, width: 0.15, height: 0.8, zIndex: 4, locked: false, visible: true },
    { id: 'elec-apugen', parentId: 'electricalControls', x: 0.64, y: 0.08, width: 0.15, height: 0.8, zIndex: 4, locked: false, visible: true },
    { id: 'elec-gen2', parentId: 'electricalControls', x: 0.81, y: 0.08, width: 0.15, height: 0.8, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-lines', parentId: 'fuelSchematic', x: 0.02, y: 0.02, width: 0.96, height: 0.96, zIndex: 3, locked: false, visible: true },
    { id: 'fuel-lfwd', parentId: 'fuelControls', x: 0.03, y: 0.02, width: 0.17, height: 0.36, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-ctrl', parentId: 'fuelControls', x: 0.29, y: 0.02, width: 0.17, height: 0.36, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-ctrr', parentId: 'fuelControls', x: 0.52, y: 0.02, width: 0.17, height: 0.36, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-rfwd', parentId: 'fuelControls', x: 0.78, y: 0.02, width: 0.17, height: 0.36, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-laft', parentId: 'fuelControls', x: 0.13, y: 0.54, width: 0.17, height: 0.36, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-xfeed', parentId: 'fuelControls', x: 0.39, y: 0.42, width: 0.22, height: 0.5, zIndex: 4, locked: false, visible: true },
    { id: 'fuel-raft', parentId: 'fuelControls', x: 0.7, y: 0.54, width: 0.17, height: 0.36, zIndex: 4, locked: false, visible: true },
    { id: 'hyd-gauge-a', parentId: 'hydGauges', x: 0.02, y: 0.08, width: 0.28, height: 0.82, zIndex: 4, locked: false, visible: true },
    { id: 'hyd-gauge-b', parentId: 'hydGauges', x: 0.34, y: 0.08, width: 0.28, height: 0.82, zIndex: 4, locked: false, visible: true },
    { id: 'hyd-qty', parentId: 'hydGauges', x: 0.67, y: 0.08, width: 0.28, height: 0.82, zIndex: 4, locked: false, visible: true },
    { id: 'hyd-elec1', parentId: 'hydControls', x: 0.08, y: 0.1, width: 0.34, height: 0.75, zIndex: 4, locked: false, visible: true },
    { id: 'hyd-elec2', parentId: 'hydControls', x: 0.54, y: 0.1, width: 0.34, height: 0.75, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-ductl', parentId: 'pneuGauges', x: 0.08, y: 0.08, width: 0.36, height: 0.82, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-ductr', parentId: 'pneuGauges', x: 0.56, y: 0.08, width: 0.36, height: 0.82, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-lines', parentId: 'pneuSchematic', x: 0.03, y: 0.03, width: 0.94, height: 0.94, zIndex: 3, locked: false, visible: true },
    { id: 'pneu-eng1', parentId: 'pneuControls', x: 0.01, y: 0.05, width: 0.27, height: 0.42, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-eng2', parentId: 'pneuControls', x: 0.36, y: 0.05, width: 0.27, height: 0.42, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-apu', parentId: 'pneuControls', x: 0.69, y: 0.05, width: 0.27, height: 0.42, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-packl', parentId: 'pneuControls', x: 0.01, y: 0.52, width: 0.27, height: 0.42, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-isol', parentId: 'pneuControls', x: 0.36, y: 0.52, width: 0.27, height: 0.42, zIndex: 4, locked: false, visible: true },
    { id: 'pneu-packr', parentId: 'pneuControls', x: 0.69, y: 0.52, width: 0.27, height: 0.42, zIndex: 4, locked: false, visible: true },
    { id: 'light-nav', parentId: 'lightingLeft', x: 0.04, y: 0.18, width: 0.26, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-beacon', parentId: 'lightingLeft', x: 0.36, y: 0.18, width: 0.26, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-dim', parentId: 'lightingLeft', x: 0.7, y: 0.32, width: 0.18, height: 0.28, zIndex: 4, locked: false, visible: true },
    { id: 'light-strobe', parentId: 'lightingCenter', x: 0.04, y: 0.18, width: 0.24, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-landl', parentId: 'lightingCenter', x: 0.37, y: 0.18, width: 0.24, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-landr', parentId: 'lightingCenter', x: 0.7, y: 0.18, width: 0.24, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-taxi', parentId: 'lightingRight', x: 0.04, y: 0.18, width: 0.24, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-emer', parentId: 'lightingRight', x: 0.37, y: 0.18, width: 0.28, height: 0.6, zIndex: 4, locked: false, visible: true },
    { id: 'light-test', parentId: 'lightingRight', x: 0.76, y: 0.32, width: 0.16, height: 0.28, zIndex: 4, locked: false, visible: true }
  ]
};
