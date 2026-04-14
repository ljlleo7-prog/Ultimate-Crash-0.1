import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';

globalThis.__mockSupabaseState = {
  user: { id: 'user-1' },
  rpcCalls: [],
  channelCalls: []
};

globalThis.__mockCreateClient = () => ({
  auth: {
    async getUser() {
      return { data: { user: globalThis.__mockSupabaseState.user }, error: null };
    }
  },
  async rpc(name, payload) {
    globalThis.__mockSupabaseState.rpcCalls.push({ name, payload });

    if (name === 'mp_create_session') {
      return {
        data: null,
        error: { message: 'duplicate key value violates unique constraint "mp_sessions_namespace_id_session_code_key"' }
      };
    }

    if (name === 'mp_join_session') {
      return {
        data: {
          sessionId: 'session-123',
          namespaceKey: payload.namespace_key,
          sessionCode: payload.session_code,
          role: payload.desired_role,
          isHost: false,
          scenarioConfig: { route: 'KSFO-KLAX' }
        },
        error: null
      };
    }

    if (name === 'mp_leave_session') {
      return { data: null, error: null };
    }

    return { data: null, error: { message: `Unexpected RPC ${name}` } };
  },
  channel(name, options) {
    globalThis.__mockSupabaseState.channelCalls.push({ name, options });
    return { name, options };
  },
  removeChannel() {}
});

const { multiplayerSessionService } = await import('../src/services/multiplayer/MultiplayerSessionService.js');
const { default: eventBus } = await import('../src/services/eventBus.js');

describe('MultiplayerSessionService', () => {
  beforeEach(() => {
    globalThis.__mockSupabaseState.user = { id: 'user-1' };
    globalThis.__mockSupabaseState.rpcCalls = [];
    globalThis.__mockSupabaseState.channelCalls = [];
    multiplayerSessionService.currentSession = null;
    multiplayerSessionService.currentUser = null;
    eventBus.clear();
  });

  it('joins an existing session when create hits a duplicate session code', async () => {
    const events = [];
    const unsubscribe = eventBus.subscribe(eventBus.Types.MULTIPLAYER_STATUS_CHANGED, payload => {
      events.push(payload);
    });

    const result = await multiplayerSessionService.createOrJoinSession({
      namespaceKey: 'legacy',
      sessionCode: 'KSFO-KLAX',
      role: 'pilot',
      callsign: 'UAL123',
      aircraftType: 'B738',
      scenarioConfig: { route: 'KSFO-KLAX' }
    });

    unsubscribe();

    assert.equal(result.error, null);
    assert.equal(result.data?.sessionId, 'session-123');
    assert.equal(result.data?.sessionCode, 'KSFO-KLAX');
    assert.equal(result.data?.namespaceKey, 'legacy');
    assert.equal(result.data?.isHost, false);
    assert.equal(globalThis.__mockSupabaseState.rpcCalls.length, 2);
    assert.deepEqual(
      globalThis.__mockSupabaseState.rpcCalls.map(call => call.name),
      ['mp_create_session', 'mp_join_session']
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].status, 'joined');
    assert.equal(events[0].session.sessionId, 'session-123');
  });
});

setTimeout(() => process.exit(0), 5000);
