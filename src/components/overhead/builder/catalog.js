export const b737BuilderCatalog = [
  { id: 'upperFlightControl', label: 'Flight Ctrl', category: 'Structural', kind: 'plate' },
  { id: 'upperNav', label: 'Nav', category: 'Structural', kind: 'plate' },
  { id: 'upperCall', label: 'Call', category: 'Structural', kind: 'slot' },
  { id: 'upperApu', label: 'APU', category: 'Structural', kind: 'plate' },
  { id: 'upperUtility', label: 'Utility', category: 'Structural', kind: 'plate' },
  { id: 'upperTest', label: 'Test', category: 'Structural', kind: 'plate' },
  { id: 'mainElectrical', label: 'Electrical', category: 'Structural', kind: 'module' },
  { id: 'mainFuel', label: 'Fuel', category: 'Structural', kind: 'module' },
  { id: 'mainHydraulics', label: 'Hydraulics', category: 'Structural', kind: 'module' },
  { id: 'mainSpine', label: 'Spine', category: 'Structural', kind: 'spine' },
  { id: 'mainPneumatic', label: 'Pneumatic', category: 'Structural', kind: 'module' },
  { id: 'mainStart', label: 'Start', category: 'Structural', kind: 'module' },
  { id: 'mainEnvironment', label: 'Environment', category: 'Structural', kind: 'module' },
  { id: 'mainPressurization', label: 'Pressurization', category: 'Structural', kind: 'module' },
  { id: 'mainMonitor', label: 'Monitor', category: 'Structural', kind: 'plate' },
  { id: 'mainAntiIce', label: 'Anti-Ice', category: 'Structural', kind: 'module' },
  { id: 'footerLighting', label: 'Lighting Strip', category: 'Structural', kind: 'footer' },
  { id: 'footerUtility', label: 'Lower Utility', category: 'Structural', kind: 'footer' }
];

export const builderTypeCatalog = [
  {
    id: 'manual-panel-shell',
    label: 'Panel Shell',
    category: 'Structure',
    kind: 'panelShell',
    addMode: 'create',
    template: { x: 0.06, y: 0.04, width: 0.18, height: 0.12, region: 'builderGeneric', groupId: 'upper-left' }
  },
  {
    id: 'manual-module-shell',
    label: 'Module Shell',
    category: 'Structure',
    kind: 'moduleShell',
    addMode: 'create',
    template: { x: 0.06, y: 0.16, width: 0.19, height: 0.16, region: 'builderGeneric', groupId: 'main-left' }
  },
  {
    id: 'manual-switch',
    label: 'Switch',
    category: 'Controls',
    kind: 'switch',
    addMode: 'create',
    template: { x: 0.08, y: 0.22, width: 0.11, height: 0.12, region: 'builderGeneric' }
  },
  {
    id: 'manual-guarded-switch',
    label: 'Guarded Switch',
    category: 'Controls',
    kind: 'guardedSwitch',
    addMode: 'create',
    template: { x: 0.22, y: 0.22, width: 0.11, height: 0.13, region: 'builderGeneric' }
  },
  {
    id: 'manual-push-button',
    label: 'Push Button',
    category: 'Controls',
    kind: 'pushButton',
    addMode: 'create',
    template: { x: 0.36, y: 0.22, width: 0.1, height: 0.09, region: 'builderGeneric' }
  },
  {
    id: 'manual-rotary',
    label: 'Dial / Rotary',
    category: 'Controls',
    kind: 'rotary',
    addMode: 'create',
    template: { x: 0.5, y: 0.22, width: 0.12, height: 0.12, region: 'builderGeneric' }
  },
  {
    id: 'manual-annunciator',
    label: 'Indicator',
    category: 'Indicators',
    kind: 'annunciator',
    addMode: 'create',
    template: { x: 0.64, y: 0.22, width: 0.12, height: 0.07, region: 'builderGeneric' }
  },
  {
    id: 'manual-value-indicator',
    label: 'Value Display',
    category: 'Indicators',
    kind: 'valueIndicator',
    addMode: 'create',
    template: { x: 0.78, y: 0.22, width: 0.14, height: 0.08, region: 'builderGeneric' }
  },
  {
    id: 'manual-radial-gauge',
    label: 'Radial Gauge',
    category: 'Displays',
    kind: 'radialGauge',
    addMode: 'create',
    template: { x: 0.12, y: 0.4, width: 0.14, height: 0.14, region: 'builderGeneric' }
  },
  {
    id: 'manual-label',
    label: 'Label',
    category: 'Displays',
    kind: 'label',
    addMode: 'create',
    template: { x: 0.3, y: 0.42, width: 0.16, height: 0.05, region: 'builderGeneric' }
  },
  {
    id: 'manual-pipe-horizontal',
    label: 'Pipe Horizontal',
    category: 'Piping',
    kind: 'pipeSegment',
    addMode: 'create',
    template: { x: 0.08, y: 0.62, width: 0.2, height: 0.03, region: 'builderGeneric' },
    props: { direction: 'right', from: { x: 0.08, y: 0.635 }, to: { x: 0.28, y: 0.635 } }
  },
  {
    id: 'manual-pipe-vertical',
    label: 'Pipe Vertical',
    category: 'Piping',
    kind: 'pipeSegment',
    addMode: 'create',
    template: { x: 0.34, y: 0.54, width: 0.03, height: 0.18, region: 'builderGeneric' },
    props: { direction: 'down', from: { x: 0.355, y: 0.54 }, to: { x: 0.355, y: 0.72 } }
  },
  {
    id: 'manual-junction-node',
    label: 'Junction Node',
    category: 'Piping',
    kind: 'junctionNode',
    addMode: 'create',
    template: { x: 0.42, y: 0.61, width: 0.04, height: 0.04, region: 'builderGeneric' }
  },
  {
    id: 'manual-placeholder',
    label: 'Placeholder',
    category: 'Templates',
    kind: 'placeholder',
    addMode: 'create',
    template: { x: 0.5, y: 0.42, width: 0.18, height: 0.11, region: 'builderGeneric' }
  }
];

export const b737RequiredBuilderIds = [
  'upperApu',
  'mainElectrical',
  'mainFuel',
  'mainHydraulics',
  'mainPneumatic',
  'mainStart',
  'footerLighting',
  'footerUtility'
];

export const builderTypeTargets = [
  'module',
  'plate',
  'slot',
  'spine',
  'footer',
  'panelShell',
  'moduleShell',
  'switch',
  'guardedSwitch',
  'pushButton',
  'annunciator',
  'rotary',
  'radialGauge',
  'valueIndicator',
  'label',
  'pipeSegment',
  'junctionNode',
  'placeholder'
];

export const buildGenericBuilderElement = (catalogItem, index = 0) => ({
  id: `${catalogItem.id}-${Date.now().toString(36)}-${index}`,
  kind: catalogItem.kind,
  region: catalogItem.template?.region || 'builderGeneric',
  x: catalogItem.template?.x ?? 0.08,
  y: catalogItem.template?.y ?? 0.12,
  width: catalogItem.template?.width ?? 0.16,
  height: catalogItem.template?.height ?? 0.12,
  zIndex: catalogItem.kind === 'pipeSegment' ? 1 : 2,
  locked: false,
  visible: true,
  groupId: catalogItem.template?.groupId || 'main-left',
  anchor: 'top-left',
  builderGenerated: true,
  builderLabel: catalogItem.label,
  purpose: { subsystem: '', role: '', notes: '' },
  readBinding: { path: '', defaultValue: false, transform: 'raw', sourceType: 'system' },
  writeBinding: { system: '', action: '', value: undefined, mode: 'toggle' },
  conditions: { activeWhen: null, faultWhen: null, visibleWhen: null },
  props: {
    min: 0,
    max: 100,
    unit: '%',
    tickStep: 10,
    majorTickStep: 20,
    sweepStart: -120,
    sweepEnd: 120,
    zones: [],
    direction: catalogItem.props?.direction || null,
    from: catalogItem.props?.from || null,
    to: catalogItem.props?.to || null,
    inactiveColor: '#3f4a51',
    activeColor: '#42d7ff',
    faultColor: '#ff8c42',
    lineWidth: 3
  }
});
