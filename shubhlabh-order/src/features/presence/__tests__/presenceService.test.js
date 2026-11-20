const test = require('node:test');
const assert = require('node:assert');

// Mock Supabase client for isolated testing
function createMockSupabase() {
  const calls = [];
  return {
    calls,
    rpc: async (fnName, params) => {
      calls.push({ fnName, params });
      if (fnName === 'customer_presence_start') {
        return { data: { success: true, session_id: params.p_session_id, app_state: 'active' }, error: null };
      }
      if (fnName === 'customer_presence_heartbeat') {
        return { data: { success: true, session_id: params.p_session_id }, error: null };
      }
      if (fnName === 'customer_presence_background') {
        return { data: { success: true, session_id: params.p_session_id, app_state: 'background' }, error: null };
      }
      if (fnName === 'customer_presence_foreground') {
        return { data: { success: true, session_id: params.p_session_id, app_state: 'active' }, error: null };
      }
      if (fnName === 'customer_presence_end') {
        return { data: { success: true, session_id: params.p_session_id, app_state: 'terminated' }, error: null };
      }
      return { data: null, error: new Error('UNKNOWN_RPC') };
    }
  };
}

const HEARTBEAT_INTERVAL_MS = 60000;
const ONLINE_EXPIRY_THRESHOLD_MS = 150000;

function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const random2 = Math.random().toString(36).substring(2, 10);
  return `sess_${timestamp}_${random}${random2}`;
}

async function startPresenceSession(mockSupabase, sessionId, deviceInfo) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await mockSupabase.rpc('customer_presence_start', {
      p_session_id: sessionId,
      p_device_info: deviceInfo || { platform: 'android', app: 'shubhlabh-order' }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || 'START_FAILED' };
  }
}

async function sendPresenceHeartbeat(mockSupabase, sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await mockSupabase.rpc('customer_presence_heartbeat', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || 'HEARTBEAT_FAILED' };
  }
}

async function transitionPresenceBackground(mockSupabase, sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await mockSupabase.rpc('customer_presence_background', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || 'BACKGROUND_FAILED' };
  }
}

async function transitionPresenceForeground(mockSupabase, sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await mockSupabase.rpc('customer_presence_foreground', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || 'FOREGROUND_FAILED' };
  }
}

async function endPresenceSession(mockSupabase, sessionId) {
  if (!sessionId) return { success: false, error: 'MISSING_SESSION_ID' };
  try {
    const { data, error } = await mockSupabase.rpc('customer_presence_end', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || 'END_FAILED' };
  }
}

test('1. generateSessionId generates unique formatted strings with sess_ prefix', () => {
  const id1 = generateSessionId();
  const id2 = generateSessionId();
  assert.ok(id1.startsWith('sess_'));
  assert.ok(id2.startsWith('sess_'));
  assert.notStrictEqual(id1, id2);
  assert.ok(id1.length > 15);
});

test('2. Constants conform strictly to sprint requirements', () => {
  assert.strictEqual(HEARTBEAT_INTERVAL_MS, 60000, 'Heartbeat must be 60 seconds');
  assert.strictEqual(ONLINE_EXPIRY_THRESHOLD_MS, 150000, 'Expiry threshold must be 150 seconds (2.5 mins)');
});

test('3. startPresenceSession calls customer_presence_start RPC correctly', async () => {
  const mock = createMockSupabase();
  const sessionId = 'sess_test_123';
  const deviceInfo = { platform: 'android', version: '14' };
  const res = await startPresenceSession(mock, sessionId, deviceInfo);
  assert.strictEqual(res.success, true);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].fnName, 'customer_presence_start');
  assert.strictEqual(mock.calls[0].params.p_session_id, sessionId);
  assert.deepStrictEqual(mock.calls[0].params.p_device_info, deviceInfo);
});

test('4. sendPresenceHeartbeat calls customer_presence_heartbeat RPC correctly', async () => {
  const mock = createMockSupabase();
  const sessionId = 'sess_test_456';
  const res = await sendPresenceHeartbeat(mock, sessionId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].fnName, 'customer_presence_heartbeat');
  assert.strictEqual(mock.calls[0].params.p_session_id, sessionId);
});

test('5. transitionPresenceBackground calls customer_presence_background RPC correctly', async () => {
  const mock = createMockSupabase();
  const sessionId = 'sess_test_789';
  const res = await transitionPresenceBackground(mock, sessionId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].fnName, 'customer_presence_background');
  assert.strictEqual(mock.calls[0].params.p_session_id, sessionId);
});

test('6. transitionPresenceForeground calls customer_presence_foreground RPC correctly', async () => {
  const mock = createMockSupabase();
  const sessionId = 'sess_test_abc';
  const res = await transitionPresenceForeground(mock, sessionId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].fnName, 'customer_presence_foreground');
  assert.strictEqual(mock.calls[0].params.p_session_id, sessionId);
});

test('7. endPresenceSession calls customer_presence_end RPC correctly', async () => {
  const mock = createMockSupabase();
  const sessionId = 'sess_test_def';
  const res = await endPresenceSession(mock, sessionId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].fnName, 'customer_presence_end');
  assert.strictEqual(mock.calls[0].params.p_session_id, sessionId);
});

test('8. Guard against empty sessionId parameter in all functions', async () => {
  const mock = createMockSupabase();
  const resStart = await startPresenceSession(mock, '');
  assert.strictEqual(resStart.success, false);
  assert.strictEqual(resStart.error, 'MISSING_SESSION_ID');

  const resHb = await sendPresenceHeartbeat(mock, null);
  assert.strictEqual(resHb.success, false);
  assert.strictEqual(resHb.error, 'MISSING_SESSION_ID');

  const resBg = await transitionPresenceBackground(mock, undefined);
  assert.strictEqual(resBg.success, false);
  assert.strictEqual(resBg.error, 'MISSING_SESSION_ID');

  const resFg = await transitionPresenceForeground(mock, '');
  assert.strictEqual(resFg.success, false);
  assert.strictEqual(resFg.error, 'MISSING_SESSION_ID');

  const resEnd = await endPresenceSession(mock, null);
  assert.strictEqual(resEnd.success, false);
  assert.strictEqual(resEnd.error, 'MISSING_SESSION_ID');

  assert.strictEqual(mock.calls.length, 0, 'No RPCs should be fired on invalid inputs');
});
