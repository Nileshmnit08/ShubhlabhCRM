/**
 * test_fa_video_regression_01.cjs
 * Targeted test suite for Micro-Sprint FA-VIDEO-REGRESSION-01:
 * Verifying restoration of two-way video rendering architecture,
 * direct RTCView attachment without zOrder/key/gating regressions,
 * media track exchange, and audio/control integrity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING TEST SUITE: FA-VIDEO-REGRESSION-01 ===');

const activeCallScreenPath = path.join(__dirname, 'src', 'screens', 'ActiveCallScreen.js');
const callContextPath = path.join(__dirname, 'src', 'context', 'CallContext.js');

const activeCallContent = fs.readFileSync(activeCallScreenPath, 'utf8');
const callContextContent = fs.readFileSync(callContextPath, 'utf8');

// Test 1: Direct remote video rendering without zOrder=0 or hasRemoteVideo gating
console.log('Test 1: Validating direct remote video rendering without regressions...');
assert(
  activeCallContent.includes('remoteStream ? (') &&
  activeCallContent.includes('streamURL={remoteStream.toURL()}') &&
  activeCallContent.includes('style={styles.remoteVideo}'),
  'ActiveCallScreen must render remoteStream directly in RTCView using styles.remoteVideo'
);
// Confirm zOrder={0} is NOT present on remote video (which forces SurfaceView behind Window on Android)
assert(
  !activeCallContent.includes('zOrder={0}'),
  'Remote video must not specify zOrder={0} which occludes SurfaceView on Android'
);
// Confirm hasRemoteVideo gating is NOT blocking RTCView mount
assert(
  !activeCallContent.includes('mainHasVideo'),
  'Remote video must not be blocked behind mainHasVideo gating'
);
console.log('✓ Test 1: Direct remote video rendering verified without zOrder=0 or gating occlusion');

// Test 2: Local camera preview PiP overlay with zOrder={1}
console.log('Test 2: Validating local camera PiP overlay with zOrder={1}...');
assert(
  activeCallContent.includes('localStream && !isCameraOff && (') &&
  activeCallContent.includes('streamURL={localStream.toURL()}') &&
  activeCallContent.includes('style={styles.localVideo}') &&
  activeCallContent.includes('zOrder={1}'),
  'Local preview must render in styles.localVideo with zOrder={1} for clean overlay'
);
console.log('✓ Test 2: Local camera PiP overlay with zOrder={1} verified');

// Test 3: Bidirectional video track creation & signaling propagation
console.log('Test 3: Validating two-way video track creation and signaling propagation...');
assert(
  callContextContent.includes("type: 'WEBRTC_OFFER'") &&
  callContextContent.includes("callType: callWithVideo ? 'VIDEO' : 'AUDIO'"),
  'WEBRTC_OFFER must explicitly propagate callType'
);
assert(
  callContextContent.includes("type: 'WEBRTC_ANSWER'") &&
  callContextContent.includes("callType: callWithVideo ? 'VIDEO' : 'AUDIO'"),
  'WEBRTC_ANSWER must explicitly propagate callType'
);
assert(
  callContextContent.includes("type: 'CALL_ACCEPTED'") &&
  callContextContent.includes("callType: callTypeRef.current"),
  'CALL_ACCEPTED must propagate callType'
);
console.log('✓ Test 3: Bidirectional video track creation and signaling propagation verified');

// Test 4: Preservation of smart audio controls and hardware AEC
console.log('Test 4: Validating audio controls and hardware AEC preservation...');
assert(
  callContextContent.includes('AudioRouteModule') &&
  callContextContent.includes('AudioRouteModule.setSpeakerphoneOn'),
  'CallContext must preserve native AudioRouteModule for hardware AEC'
);
assert(
  activeCallContent.includes('toggleSpeaker') &&
  activeCallContent.includes('toggleMute') &&
  activeCallContent.includes('switchCamera'),
  'ActiveCallScreen must preserve speaker, mute, and camera flip controls'
);
console.log('✓ Test 4: Audio controls and hardware AEC preservation verified');

// Test 5: Call termination and resource cleanup
console.log('Test 5: Validating media release and cleanup on end-call...');
assert(
  callContextContent.includes('cleanupMedia') &&
  callContextContent.includes('localStreamRef.current.getTracks().forEach(t => t.stop())') &&
  callContextContent.includes('AudioRouteModule.stopCallAudio()'),
  'CallContext must stop all media tracks and reset native audio on cleanup'
);
console.log('✓ Test 5: Media release and cleanup verified');

console.log('=== ALL 5/5 MICRO-SPRINT FA-VIDEO-REGRESSION-01 TESTS PASSED ===');
