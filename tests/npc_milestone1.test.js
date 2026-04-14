import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';

globalThis.__mockCreateClient = () => ({
  from() {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      then(resolve) {
        return resolve({ data: [], error: null });
      }
    };
  }
});

const { ATCLogic } = await import('../src/services/ATCLogic.js');
const { npcService } = await import('../src/services/NPCService.js');
const { npcCrewService } = await import('../src/services/NPCCrewService.js');
const { default: eventBus } = await import('../src/services/eventBus.js');

beforeEach(() => {
  eventBus.clear();
  npcService.npcs = [];
  npcService.nextId = 1;

  npcCrewService.pendingTimeouts.forEach(id => clearTimeout(id));
  npcCrewService.pendingTimeouts.clear();
  npcCrewService.difficulty = 'intermediate';
  npcCrewService.initialized = false;
});

test('ATCLogic busy state is frequency-specific', () => {
  const atc = new ATCLogic();

  atc.blockChannel(121.5, 1000);

  assert.equal(atc.isBusy(121.5), true);
  assert.equal(atc.isBusy(119.0), false);
  assert.equal(atc.isBusy(), false);
});

test('NPCService forwards ATC manager from runtime context to NPC updates', () => {
  const calls = [];
  const fakeNpc = {
    latitude: 37.6,
    longitude: -122.3,
    update(dt, atcManager) {
      calls.push({ dt, atcManager });
    },
    popMessage() {
      return null;
    }
  };
  const fakeAtcManager = { name: 'atc-manager' };

  npcService.npcs = [fakeNpc];

  npcService.update(0.25, { latitude: 37.6, longitude: -122.3 }, { atcManager: fakeAtcManager });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].dt, 0.25);
  assert.equal(calls[0].atcManager, fakeAtcManager);
});

test('NPCCrewService publishes typed and legacy crew events during migration', () => {
  const typedEvents = [];
  const legacyEvents = [];
  const typedUnsubscribe = eventBus.subscribe(eventBus.Types.NPC_CREW_MESSAGE, payload => {
    typedEvents.push(payload);
  });
  const legacyUnsubscribe = eventBus.subscribe('NPC_CREW_MESSAGE', payload => {
    legacyEvents.push(payload);
  });

  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    npcCrewService.difficulty = 'pro';
    npcCrewService.summon('FO');
  } finally {
    Math.random = originalRandom;
    typedUnsubscribe();
    legacyUnsubscribe();
  }

  assert.equal(typedEvents.length, 1);
  assert.equal(legacyEvents.length, 1);
  assert.equal(typedEvents[0].sender, 'System');
  assert.match(typedEvents[0].content, /not responding/i);
  assert.deepEqual(typedEvents[0], legacyEvents[0]);
});

after(() => {
  setTimeout(() => process.exit(0), 5000);
});
