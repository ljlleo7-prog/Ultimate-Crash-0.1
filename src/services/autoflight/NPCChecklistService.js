import { Checklists } from '../ChecklistData.js';

const abnormalChecklistLibrary = {
  engine_fire: {
    name: 'ENGINE FIRE',
    intro: 'Running engine fire memory items.',
    items: [
      { id: 'thrust_idle', label: 'Affected thrust lever idle', severity: 'critical', validate: (_systems, flightState) => (flightState?.throttleLevers?.some(value => value <= 0.05) ?? false) },
      { id: 'fire_handle', label: 'Confirm affected fire handle', severity: 'critical', validate: (systems) => !!systems?.fire },
      { id: 'fire_switch', label: 'Fire switch pulled / discharged', severity: 'critical', validate: (systems) => !!systems?.fire?.eng1 || !!systems?.fire?.eng2 }
    ]
  },
  engine_failure: {
    name: 'ENGINE FAILURE',
    intro: 'Running engine failure / secure checklist.',
    items: [
      { id: 'identify', label: 'Identify failed engine', severity: 'high', validate: (_systems, flightState) => (flightState?.engineN2?.some(value => value < 45) ?? false) },
      { id: 'thrust_manage', label: 'Stabilize thrust and rudder trim', severity: 'high', validate: null },
      { id: 'generator_check', label: 'Check remaining generator and electrical load', severity: 'medium', validate: (systems) => !!systems?.electrical?.gen1 || !!systems?.electrical?.gen2 }
    ]
  },
  hydraulic: {
    name: 'HYDRAULIC LOW PRESSURE',
    intro: 'Running hydraulic low pressure checklist.',
    items: [
      { id: 'pump_status', label: 'Confirm hydraulic pump status', severity: 'high', validate: (systems) => !!systems?.hydraulics?.sysA?.engPump || !!systems?.hydraulics?.sysB?.engPump },
      { id: 'flight_controls', label: 'Review flight control degradation', severity: 'medium', validate: null },
      { id: 'landing_plan', label: 'Plan alternate flaps / braking configuration', severity: 'medium', validate: null }
    ]
  },
  smoke: {
    name: 'SMOKE / FUMES',
    intro: 'Running smoke and fumes checklist.',
    items: [
      { id: 'oxygen', label: 'Crew oxygen masks on', severity: 'critical', validate: null },
      { id: 'communications', label: 'Establish crew communications', severity: 'high', validate: null },
      { id: 'source', label: 'Isolate suspect electrical or bleed source', severity: 'high', validate: null }
    ]
  },
  generic_failure: {
    name: 'ABNORMAL',
    intro: 'Running general abnormal checklist.',
    items: [
      { id: 'stabilize', label: 'Stabilize aircraft and maintain control', severity: 'critical', validate: null },
      { id: 'diagnose', label: 'Identify affected system and warnings', severity: 'high', validate: null },
      { id: 'plan', label: 'Plan diversion / next safe configuration', severity: 'medium', validate: null }
    ]
  }
};

function normalizeFailureKey(failureType = '') {
  const lower = String(failureType).toLowerCase();
  if (lower.includes('fire')) return 'engine_fire';
  if (lower.includes('engine')) return 'engine_failure';
  if (lower.includes('hyd')) return 'hydraulic';
  if (lower.includes('smoke') || lower.includes('fume')) return 'smoke';
  return 'generic_failure';
}

export function resolveAbnormalChecklist(activeFailures = []) {
  const primary = activeFailures?.[0]?.type || activeFailures?.[0]?.id || 'generic_failure';
  const key = normalizeFailureKey(primary);
  return abnormalChecklistLibrary[key] || abnormalChecklistLibrary.generic_failure;
}

export function evaluateChecklistItems(items = [], systems = {}, flightState = {}) {
  return items.map((item) => ({
    ...item,
    complete: typeof item.validate === 'function' ? !!item.validate(systems, flightState) : false
  }));
}

export function evaluateNormalChecklist(checklistId, systems = {}, flightState = {}) {
  const items = Checklists[checklistId] || [];
  return evaluateChecklistItems(items, systems, flightState);
}
