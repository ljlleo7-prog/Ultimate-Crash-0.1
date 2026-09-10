import test from 'node:test';
import assert from 'node:assert/strict';
import { getNPCDifficultyProfile } from '../src/services/autoflight/NPCDifficultyProfile.js';
import { getNPCQuickCommands, parseNPCCommand } from '../src/services/autoflight/NPCCommandService.js';
import { evaluateNormalChecklist, resolveAbnormalChecklist } from '../src/services/autoflight/NPCChecklistService.js';
import { buildNPCSystemSnapshot, formatNPCSystemReport } from '../src/services/autoflight/NPCReportingService.js';
import { NPCOrderStatus, createNPCOrder, summarizeNPCOrder, transitionNPCOrder } from '../src/services/autoflight/NPCOrderService.js';

test('difficulty profile scales support down at higher difficulties', () => {
  const rookie = getNPCDifficultyProfile('rookie');
  const devil = getNPCDifficultyProfile('devil');

  assert.equal(rookie.initiative, 'high');
  assert.equal(rookie.radioHelp, 'proactive');
  assert.equal(devil.initiative, 'low');
  assert.equal(devil.radioHelp, 'minimal');
  assert.ok(devil.unreliability > rookie.unreliability);
});

test('command parser recognizes direct action commands', () => {
  const flaps = parseNPCCommand('copilot set flaps 5');
  const gear = parseNPCCommand('FO gear down');
  const radio = parseNPCCommand('crew request taxi');

  assert.equal(flaps.type, 'ORDER_ACTION');
  assert.equal(flaps.action, 'flaps');
  assert.equal(flaps.value, 5);

  assert.equal(gear.type, 'ORDER_ACTION');
  assert.equal(gear.action, 'gear');
  assert.equal(gear.value, 1);

  assert.equal(radio.type, 'REQUEST_RADIO_CALL');
  assert.equal(radio.templateId, 'req_taxi');
});

test('command parser recognizes checklist, diagnosis, and help commands', () => {
  assert.equal(parseNPCCommand('run startup checklist').type, 'RUN_CHECKLIST');
  assert.equal(parseNPCCommand('run startup checklist').checklistId, 'PREFLIGHT');
  assert.equal(parseNPCCommand('what\'s wrong').type, 'DIAGNOSE_ISSUE');
  assert.equal(parseNPCCommand('what can you do').type, 'QUERY_HELP');
});

test('order service tracks lifecycle transitions', () => {
  const order = createNPCOrder({ type: 'ORDER_ACTION', action: 'gear', value: 1 });
  assert.equal(order.status, NPCOrderStatus.QUEUED);
  assert.match(order.id, /^npc-order-/);
  assert.equal(summarizeNPCOrder(order), 'gear:1');

  const acknowledged = transitionNPCOrder(order, NPCOrderStatus.ACKNOWLEDGED, { note: 'copy' });
  assert.equal(acknowledged.status, NPCOrderStatus.ACKNOWLEDGED);
  assert.equal(acknowledged.note, 'copy');
  assert.ok(acknowledged.updatedAt >= order.createdAt);
});

test('quick commands expose common copilot tasks', () => {
  const quickCommands = getNPCQuickCommands();
  assert.ok(quickCommands.some(command => command.command === 'copilot status'));
  assert.ok(quickCommands.some(command => command.command === 'copilot request takeoff clearance'));
  assert.ok(quickCommands.some(command => command.command === 'copilot run abnormal checklist'));
});

test('abnormal checklist resolves from active failures', () => {
  const abnormal = resolveAbnormalChecklist([{ type: 'engine_fire' }]);
  assert.equal(abnormal.name, 'ENGINE FIRE');
  assert.ok(abnormal.items.length > 0);
});

test('normal checklist evaluation reports item completion', () => {
  const evaluated = evaluateNormalChecklist('PREFLIGHT', {
    electrical: { battery: true, apuGen: true },
    apu: { running: true, n2: 100, bleed: true },
    lighting: { nav: true, logo: false }
  }, {});

  const battery = evaluated.find(item => item.id === 'bat');
  const logo = evaluated.find(item => item.id === 'logo_lights');
  assert.equal(battery?.complete, true);
  assert.equal(logo?.complete, false);
});

test('reporting service formats accessible system parameters', () => {
  const snapshot = buildNPCSystemSnapshot({
    difficulty: 'rookie',
    currentFreq: 121.9,
    currentFreqType: 'GROUND',
    sceneState: { phaseName: 'Taxi' },
    startupContext: { missingItems: ['APU Bleed Switch ON'] },
    activeFailures: [{ type: 'engine_fire' }],
    physicsState: {
      systems: {
        electrical: { battery: true, apuGen: true, gen1: true, gen2: false },
        apu: { running: true, n2: 99 },
        hydraulics: { sysA: { pressure: 2800 }, sysB: { pressure: 2900 } },
        fuel: { leftPumps: true, rightPumps: true, centerPumps: false },
        brakes: { parkingBrake: false, autobrake: 'RTO' },
        transponder: { mode: 'TA/RA' }
      },
      engines: [{ n2: 65, fuelFlow: 2400 }, { n2: 0, fuelFlow: 0 }],
      controls: { flaps: 5, gear: 1, airBrakes: 0 }
    },
    flightData: { altitude: 1200, indicatedAirspeed: 145, heading: 182, flaps: 5, gear: 1, airBrakes: 0 }
  });

  const report = formatNPCSystemReport(snapshot, 'full');
  assert.match(report, /Phase Taxi/);
  assert.match(report, /Radio GROUND/);
  assert.match(report, /Hydraulics A/);
  assert.match(report, /Autobrake RTO/);
  assert.match(report, /Startup blockers APU Bleed Switch ON/);
});
