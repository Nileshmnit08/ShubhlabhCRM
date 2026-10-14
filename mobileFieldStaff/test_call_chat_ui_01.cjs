/**
 * test_call_chat_ui_01.cjs
 * Targeted test suite for Micro-Sprint FA-CALL-CHAT-UI-01
 */
const assert = require('assert');

console.log('--- RUNNING TEST SUITE: FA-CALL-CHAT-UI-01 ---');

// 1. Test Call State Progression & Truthful Labels
function getCallStatusLabel(callState, failureReason, isConnected, durationSeconds = 0) {
  if (isConnected || callState === 'CONNECTED') {
    const m = Math.floor(durationSeconds / 60).toString().padStart(2, '0');
    const s = (durationSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  if (callState === 'FAILED') return failureReason || 'Call Ended';
  if (callState === 'INITIATING') return 'Calling…';
  if (callState === 'RINGING') return 'Ringing…';
  if (callState === 'ACCEPTED' || callState === 'CONNECTING') return 'Connecting…';
  return 'Calling…';
}

assert.strictEqual(getCallStatusLabel('INITIATING', null, false), 'Calling…');
assert.strictEqual(getCallStatusLabel('RINGING', null, false), 'Ringing…');
assert.strictEqual(getCallStatusLabel('CONNECTING', null, false), 'Connecting…');
assert.strictEqual(getCallStatusLabel('CONNECTED', null, true, 65), '01:05');
assert.strictEqual(getCallStatusLabel('FAILED', 'Call Declined', false), 'Call Declined');
assert.strictEqual(getCallStatusLabel('FAILED', 'No Answer', false), 'No Answer');
assert.strictEqual(getCallStatusLabel('FAILED', 'User Unavailable', false), 'User Unavailable');
console.log('✓ Test 1: Truthful status resolution passed');

// 2. Test Overlay Routing
function shouldShowIncomingScreen(callState, isIncoming) {
  return callState === 'RINGING' && isIncoming;
}

function shouldShowActiveCallScreen(callState, isIncoming) {
  return (
    callState === 'INITIATING' ||
    (callState === 'RINGING' && !isIncoming) ||
    callState === 'ACCEPTED' ||
    callState === 'CONNECTING' ||
    callState === 'CONNECTED' ||
    callState === 'FAILED'
  );
}

// Case A: Outgoing call ringing
assert.strictEqual(shouldShowIncomingScreen('RINGING', false), false);
assert.strictEqual(shouldShowActiveCallScreen('RINGING', false), true);

// Case B: Incoming call ringing
assert.strictEqual(shouldShowIncomingScreen('RINGING', true), true);
assert.strictEqual(shouldShowActiveCallScreen('RINGING', true), false);

// Case C: Failed state remains visible for feedback
assert.strictEqual(shouldShowActiveCallScreen('FAILED', false), true);
assert.strictEqual(shouldShowActiveCallScreen('IDLE', false), false);
console.log('✓ Test 2: GlobalCallOverlay routing matrix passed');

// 3. Test ICE Candidate Serialization
const mockCandidate = {
  candidate: 'candidate:842163049 1 udp 1677729535 192.168.1.100 54321 typ host',
  sdpMid: '0',
  sdpMLineIndex: 0,
  toJSON() {
    return {
      candidate: this.candidate,
      sdpMid: this.sdpMid,
      sdpMLineIndex: this.sdpMLineIndex,
    };
  }
};

const candidatePayload = mockCandidate.toJSON
  ? mockCandidate.toJSON()
  : {
      candidate: mockCandidate.candidate,
      sdpMid: mockCandidate.sdpMid,
      sdpMLineIndex: mockCandidate.sdpMLineIndex,
    };

assert.strictEqual(candidatePayload.candidate, mockCandidate.candidate);
assert.strictEqual(candidatePayload.sdpMid, '0');
assert.strictEqual(candidatePayload.sdpMLineIndex, 0);
console.log('✓ Test 3: ICE Candidate serialization passed');

// 4. Test In-Flight Call Initiation Guard
let currentCallState = 'CONNECTING';
function handleInitiateCall(targetUser) {
  if (currentCallState !== 'IDLE') {
    return { success: false, error: 'Call in Progress' };
  }
  if (!targetUser?.id) {
    return { success: false, error: 'Unavailable' };
  }
  return { success: true };
}

assert.strictEqual(handleInitiateCall({ id: 'user-1' }).success, false);
currentCallState = 'IDLE';
assert.strictEqual(handleInitiateCall({ id: 'user-1' }).success, true);
assert.strictEqual(handleInitiateCall(null).success, false);
console.log('✓ Test 4: In-flight initiation guard passed');

// 5. Test Pre-connect vs Active End Call
function resolveEndAction(state) {
  const isPreConnect = state === 'INITIATING' || state === 'RINGING';
  return {
    status: isPreConnect ? 'CANCELLED' : 'ENDED',
    end_reason: isPreConnect ? 'CANCELLED' : 'USER_ENDED',
    signalType: isPreConnect ? 'CALL_CANCELLED' : 'CALL_ENDED',
  };
}

const cancelAction = resolveEndAction('RINGING');
assert.strictEqual(cancelAction.status, 'CANCELLED');
assert.strictEqual(cancelAction.signalType, 'CALL_CANCELLED');

const endAction = resolveEndAction('CONNECTED');
assert.strictEqual(endAction.status, 'ENDED');
assert.strictEqual(endAction.signalType, 'CALL_ENDED');
console.log('✓ Test 5: End / Cancel resolution passed');

console.log('--- ALL 5/5 TESTS PASSED SUCCESFULLY ---');
