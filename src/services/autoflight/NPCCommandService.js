const WAKE_WORDS = /^(copilot|co-pilot|fo|first officer|crew)[,\s:]+/i;

const CHECKLIST_ALIASES = [
  { pattern: /(startup|power[	 \\-]?up|preflight)/i, checklistId: 'PREFLIGHT' },
  { pattern: /(engine start|start engines|engine checklist)/i, checklistId: 'ENG START' },
  { pattern: /(before takeoff|takeoff checklist|departure checklist)/i, checklistId: 'TAKEOFF' },
  { pattern: /(landing checklist)/i, checklistId: 'LANDING' },
  { pattern: /(abnormal|emergency|failure checklist)/i, checklistId: 'ABNORMAL' }
];

const QUICK_COMMANDS = [
  { id: 'status', label: 'Status Report', command: 'copilot status', category: 'report' },
  { id: 'diagnose', label: 'Diagnose', command: 'copilot diagnose', category: 'diagnosis' },
  { id: 'startup', label: 'Startup Checklist', command: 'copilot run startup checklist', category: 'checklist' },
  { id: 'abnormal', label: 'Abnormal Checklist', command: 'copilot run abnormal checklist', category: 'checklist' },
  { id: 'takeoff', label: 'Before Takeoff', command: 'copilot run before takeoff checklist', category: 'checklist' },
  { id: 'taxi', label: 'Request Taxi', command: 'copilot request taxi', category: 'radio' },
  { id: 'takeoff-clearance', label: 'Request Takeoff', command: 'copilot request takeoff clearance', category: 'radio' },
  { id: 'mayday', label: 'Declare Mayday', command: 'copilot declare emergency', category: 'radio' }
];

function normalize(raw = '') {
  return raw
    .trim()
    .replace(WAKE_WORDS, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseNumber(match) {
  if (!match) return null;
  const value = Number(match);
  return Number.isFinite(value) ? value : null;
}

function parseActionIntent(command) {
  const flapsMatch = command.match(/(?:set )?flaps?\s+(?:to\s+)?(\d+)/i);
  if (flapsMatch) {
    return { type: 'ORDER_ACTION', action: 'flaps', value: parseNumber(flapsMatch[1]) };
  }

  if (/gear\s+(down|up)/i.test(command)) {
    return { type: 'ORDER_ACTION', action: 'gear', value: /gear\s+down/i.test(command) ? 1 : 0 };
  }

  if (/(air ?brake|speedbrake|spoilers?)\s+(armed|arm|up|down|off)/i.test(command)) {
    const match = command.match(/(armed|arm|up|down|off)/i);
    const token = match?.[1]?.toLowerCase();
    let value = 0;
    if (token === 'armed' || token === 'arm') value = -1;
    else if (token === 'up') value = 1;
    return { type: 'ORDER_ACTION', action: 'airBrakes', value, token };
  }

  const freqMatch = command.match(/(?:tune|set)\s+(?:radio\s+)?(?:(tower|ground|approach|departure|center)|([0-9]{3}\.[0-9]{1,3}))/i);
  if (freqMatch) {
    return {
      type: 'ORDER_ACTION',
      action: 'radio',
      target: freqMatch[1]?.toLowerCase() || null,
      value: freqMatch[2] ? Number(freqMatch[2]) : null
    };
  }

  return null;
}

function parseChecklistIntent(command) {
  if (!/(run|perform|do|check|read).*(checklist)|checklist|what'?s missing|what is missing/i.test(command)) {
    return null;
  }

  const alias = CHECKLIST_ALIASES.find(({ pattern }) => pattern.test(command));
  return {
    type: /what'?s missing|what is missing/i.test(command) ? 'REPORT_STATUS' : 'RUN_CHECKLIST',
    checklistId: alias?.checklistId || 'PREFLIGHT'
  };
}

function parseRadioIntent(command) {
  if (/request taxi|call ground|radio ground/i.test(command)) {
    return { type: 'REQUEST_RADIO_CALL', templateId: 'req_taxi' };
  }
  if (/request startup|call ground for startup/i.test(command)) {
    return { type: 'REQUEST_RADIO_CALL', templateId: 'req_startup' };
  }
  if (/request takeoff|takeoff clearance|call tower/i.test(command)) {
    return { type: 'REQUEST_RADIO_CALL', templateId: 'req_takeoff' };
  }
  if (/declare emergency|mayday/i.test(command)) {
    return { type: 'REQUEST_RADIO_CALL', templateId: 'inf_mayday' };
  }
  return null;
}

export function parseNPCCommand(raw = '') {
  const normalized = normalize(raw);
  if (!normalized) {
    return { type: 'UNKNOWN', raw, normalized };
  }

  if (/^(status|report|report status|what'?s next|what is next|radio status|report radio)$/i.test(normalized)) {
    return { type: 'REPORT_STATUS', raw, normalized };
  }

  if (/diagnose|what'?s wrong|why can'?t we continue|why cant we continue/i.test(normalized)) {
    return { type: 'DIAGNOSE_ISSUE', raw, normalized };
  }

  const checklistIntent = parseChecklistIntent(normalized);
  if (checklistIntent) {
    return { ...checklistIntent, raw, normalized };
  }

  const radioIntent = parseRadioIntent(normalized);
  if (radioIntent) {
    return { ...radioIntent, raw, normalized };
  }

  const actionIntent = parseActionIntent(normalized);
  if (actionIntent) {
    return { ...actionIntent, raw, normalized };
  }

  if (/help|commands|what can you do/i.test(normalized)) {
    return { type: 'QUERY_HELP', raw, normalized };
  }

  return { type: 'UNKNOWN', raw, normalized };
}

export function getNPCQuickCommands() {
  return QUICK_COMMANDS;
}
