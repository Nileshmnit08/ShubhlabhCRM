/**
 * ActiveCallScreen.js
 * Micro-Sprint FA-VIDEO-UI-01: WhatsApp-Inspired Video & Audio Calling UI and UX
 * 
 * Features:
 * - Full-screen immersive remote video rendering (stable native RTCView).
 * - Floating picture-in-picture local camera preview with corner snapping (PanResponder).
 * - Tap-to-swap video presentation positions without unmounting/recreating tracks.
 * - WhatsApp-inspired translucent floating bottom control dock with circular buttons & clear labels.
 * - Truthful call state transitions (Calling…, Ringing…, Connecting…, Reconnecting…, 00:00 duration, Failed).
 * - Remote camera-off detection with contact avatar and clear indicator.
 * - Auto-hide controls after 5 seconds of inactivity on connected calls; tap screen to toggle.
 * - Android BackHandler integration to safely protect call lifecycle.
 * - Consistent audio-only call experience hiding camera-specific controls.
 * - Full preservation of FA-VIDEO-REGRESSION-01 safeguards (no zOrder=0, no gating occlusion).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  BackHandler,
  Alert,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';
import { colors } from '../theme/tokens';

// RTCView is dynamically loaded from react-native-webrtc
let RTCView = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch (e) {
  // Placeholder fallback if native module isn't linked
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function ActiveCallScreen() {
  const {
    callState,
    failureReason,
    remoteUser,
    callType,
    localStream,
    remoteStream,
    isRemoteCameraOff,
    isReconnecting,
    isMuted,
    isCameraOff,
    isFrontCamera,
    callDuration,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    isSwitchingCamera,
    isSpeakerOn,
    toggleSpeaker,
  } = useCall();

  const isConnected = callState === 'CONNECTED';
  const isVideo = callType === 'VIDEO';

  // ─── UI State ─────────────────────────────────────────────────────────────
  // isSwapped: when true, localStream is full-screen and remoteStream is in PiP
  const [isSwapped, setIsSwapped] = useState(false);
  // pipCorner: TOP_RIGHT | TOP_LEFT | BOTTOM_RIGHT | BOTTOM_LEFT
  const [pipCorner, setPipCorner] = useState('TOP_RIGHT');
  // Controls visibility (WhatsApp auto-hide behavior)
  const [showControls, setShowControls] = useState(true);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsTimerRef = useRef(null);

  // ─── Pulse Animation for Pre-connection / Reconnecting Avatar ────────────
  useEffect(() => {
    if (!isConnected || isReconnecting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected, isReconnecting, pulseAnim]);

  // ─── Auto-hide Controls Timer ─────────────────────────────────────────────
  const clearAutoTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const resetAutoTimer = useCallback(() => {
    clearAutoTimer();
    if (isConnected && !isReconnecting) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
  }, [isConnected, isReconnecting, clearAutoTimer]);

  // Show controls and restart timer on connection or reconnection
  useEffect(() => {
    setShowControls(true);
    resetAutoTimer();
    return clearAutoTimer;
  }, [isConnected, isReconnecting, resetAutoTimer, clearAutoTimer]);

  const toggleControlsVisibility = useCallback(() => {
    if (!isConnected) return; // Keep controls permanently visible during calling/connecting/failed
    setShowControls((prev) => {
      const next = !prev;
      if (next) resetAutoTimer();
      else clearAutoTimer();
      return next;
    });
  }, [isConnected, resetAutoTimer, clearAutoTimer]);

  // ─── Android Hardware Back Button Protection ──────────────────────────────
  useEffect(() => {
    const onBackPress = () => {
      if (callState === 'INITIATING' || callState === 'RINGING' || callState === 'CONNECTING' || callState === 'ACCEPTED') {
        endCall();
        return true;
      }
      if (isConnected) {
        Alert.alert(
          'End Call',
          'Do you want to end the current call?',
          [
            { text: 'Stay in Call', style: 'cancel' },
            { text: 'End Call', style: 'destructive', onPress: () => endCall() },
          ],
          { cancelable: true }
        );
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [callState, isConnected, endCall]);

  // ─── PiP Corner Positioning ───────────────────────────────────────────────
  const getPipPositionStyle = (corner) => {
    const topSafe = Platform.OS === 'android' ? 68 : 78;
    const bottomSafe = 160; // Safely positioned above controls dock
    switch (corner) {
      case 'TOP_LEFT':
        return { top: topSafe, left: 16 };
      case 'BOTTOM_LEFT':
        return { bottom: bottomSafe, left: 16 };
      case 'BOTTOM_RIGHT':
        return { bottom: bottomSafe, right: 16 };
      case 'TOP_RIGHT':
      default:
        return { top: topSafe, right: 16 };
    }
  };

  const pipPositionStyle = getPipPositionStyle(pipCorner);

  // ─── PiP PanResponder (Drag & Tap-to-Swap) ─────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderRelease: (_, g) => {
        resetAutoTimer();
        const isTap = Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10;
        if (isTap) {
          setIsSwapped((prev) => !prev);
        } else {
          // Snap to closest corner based on release coordinate
          const isLeft = g.moveX < SCREEN_WIDTH / 2;
          const isTop = g.moveY < SCREEN_HEIGHT / 2;
          if (isTop && isLeft) setPipCorner('TOP_LEFT');
          else if (isTop && !isLeft) setPipCorner('TOP_RIGHT');
          else if (!isTop && isLeft) setPipCorner('BOTTOM_LEFT');
          else setPipCorner('BOTTOM_RIGHT');
        }
      },
    })
  ).current;

  // ─── Status Text Resolution ───────────────────────────────────────────────
  const getStatusText = () => {
    if (callState === 'FAILED') return failureReason || 'Call Ended';
    if (isReconnecting) return 'Reconnecting…';
    if (isConnected) return formatDuration(callDuration);
    if (callState === 'RINGING') return 'Ringing…';
    if (callState === 'ACCEPTED' || callState === 'CONNECTING') return 'Connecting…';
    if (callState === 'INITIATING') return 'Calling…';
    return 'Calling…';
  };

  const getInitials = (name) => {
    if (!name) return 'FA';
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const callerInitials = getInitials(remoteUser?.name);
  const statusLabel = getStatusText();

  // Determine if PiP window should be rendered
  // When NOT swapped: PiP holds localStream (visible if localStream and !isCameraOff)
  // When swapped: PiP holds remoteStream (visible if remoteStream exists)
  const isPipAvailable = isVideo && (
    (!isSwapped && localStream && !isCameraOff) ||
    (isSwapped && remoteStream)
  );

  return (
    <>
      <StatusBar backgroundColor="#080e18" barStyle="light-content" translucent={Platform.OS === 'android'} />
      <View style={styles.container}>
        {/* ── VIDEO CALL ─────────────────────────────── */}
        {isVideo && RTCView ? (
          <>
            {/* Remote video — full screen (direct binding: style={styles.remoteVideo}) */}
            {remoteStream ? (
              <RTCView
                streamURL={remoteStream.toURL()}
                style={!isSwapped ? styles.remoteVideo : [styles.localVideo, pipPositionStyle]}
                objectFit="cover"
                mirror={false}
                {...(isSwapped ? { zOrder: 1 } : {})}
              />
            ) : (
              <View style={styles.remoteVideoPlaceholder}>
                <Animated.View style={[styles.avatarPulseRing, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{callerInitials}</Text>
                </View>
                <Text style={styles.placeholderCallerName}>{remoteUser?.name || 'Field Staff'}</Text>
                <Text style={styles.placeholderStatusText}>{statusLabel}</Text>
              </View>
            )}

            {/* Remote Camera Off Indicator Overlay when remote is full-screen */}
            {remoteStream && isRemoteCameraOff && !isSwapped && (
              <View style={styles.remoteOffOverlay}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{callerInitials}</Text>
                </View>
                <View style={styles.camOffBadge}>
                  <MaterialIcons name="videocam-off" size={18} color="#fff" />
                  <Text style={styles.camOffBadgeText}>Camera Off</Text>
                </View>
              </View>
            )}

            {/* Local camera preview — PiP (direct binding: style={styles.localVideo} with zOrder={1}) */}
            {localStream && !isCameraOff && (
              <RTCView
                streamURL={localStream.toURL()}
                style={isSwapped ? styles.remoteVideo : [styles.localVideo, pipPositionStyle]}
                objectFit="cover"
                mirror={isFrontCamera}
                {...(!isSwapped ? { zOrder: 1 } : {})}
              />
            )}

            {/* Local Camera Off Overlay when local is swapped to full-screen */}
            {isSwapped && isCameraOff && (
              <View style={styles.remoteOffOverlay}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>ME</Text>
                </View>
                <View style={styles.camOffBadge}>
                  <MaterialIcons name="videocam-off" size={18} color="#fff" />
                  <Text style={styles.camOffBadgeText}>Your Camera is Off</Text>
                </View>
              </View>
            )}

            {/* Transparent Touch Receiver for PiP Drag & Tap-to-Swap */}
            {isPipAvailable && (
              <View
                style={[styles.pipTouchReceiver, pipPositionStyle]}
                {...panResponder.panHandlers}
              >
                {/* Visual swap badge */}
                <View style={styles.pipSwapIconBadge}>
                  <MaterialIcons name="swap-horiz" size={16} color="#fff" />
                </View>
              </View>
            )}
          </>
        ) : (
          /* ── AUDIO CALL ─────────────────────────────── */
          <View style={styles.audioBackground}>
            <Animated.View style={[styles.avatarPulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{callerInitials}</Text>
            </View>
            <Text style={styles.callerName}>{remoteUser?.name || 'Field Staff'}</Text>
            <Text style={styles.callerRole}>{remoteUser?.role ? remoteUser.role.toUpperCase() : 'STAFF MEMBER'}</Text>
            <View style={styles.audioStatusBadge}>
              <View style={[styles.statusDot, isConnected ? styles.dotGreen : (isReconnecting ? styles.dotYellow : styles.dotBlue)]} />
              <Text style={styles.audioStatusText}>{statusLabel}</Text>
            </View>
          </View>
        )}

        {/* ── Overlay UI (pointerEvents="box-none") ───────────────────── */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Background Screen Tap Target (to show/hide controls) */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={toggleControlsVisibility}
          />

          {/* ── Header: Brand, Contact Info & Call Status ─────────────── */}
          {showControls && (
            <View style={styles.headerContainer} pointerEvents="box-none">
              <View style={styles.headerContent}>
                {/* Security / Brand Badge */}
                <View style={styles.securityBadge}>
                  <MaterialIcons name="lock" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.securityText}>SHUBH LABH SALESTEAM SECURE CALL</Text>
                </View>

                {/* Contact Name & Staff Role */}
                <Text style={styles.headerCallerName} numberOfLines={1}>
                  {remoteUser?.name || 'Field Staff'}
                </Text>
                {remoteUser?.role ? (
                  <Text style={styles.headerCallerRole} numberOfLines={1}>
                    {remoteUser.role.toUpperCase()}
                  </Text>
                ) : null}

                {/* Status Row with Live Dot */}
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      isConnected
                        ? styles.dotGreen
                        : isReconnecting
                        ? styles.dotYellow
                        : callState === 'FAILED'
                        ? styles.dotRed
                        : styles.dotBlue,
                    ]}
                  />
                  <Text style={styles.statusText}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Bottom Controls Dock ─────────────────────────────────── */}
          {showControls && (
            <View style={styles.controlsDockWrapper} pointerEvents="box-none">
              <View style={styles.controlsDock}>
                {/* Mic Toggle */}
                <TouchableOpacity
                  style={[styles.controlBtn, isMuted && styles.controlBtnActiveWhite]}
                  onPress={() => {
                    resetAutoTimer();
                    toggleMute();
                  }}
                  activeOpacity={0.75}
                  accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <MaterialIcons
                    name={isMuted ? 'mic-off' : 'mic'}
                    size={26}
                    color={isMuted ? '#0f172a' : '#ffffff'}
                  />
                  <Text style={[styles.controlLabel, isMuted && styles.controlLabelDark]}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>

                {/* Camera Toggle (Video Only) */}
                {isVideo && (
                  <TouchableOpacity
                    style={[styles.controlBtn, isCameraOff && styles.controlBtnActiveWhite]}
                    onPress={() => {
                      resetAutoTimer();
                      toggleCamera();
                    }}
                    activeOpacity={0.75}
                    accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    <MaterialIcons
                      name={isCameraOff ? 'videocam-off' : 'videocam'}
                      size={26}
                      color={isCameraOff ? '#0f172a' : '#ffffff'}
                    />
                    <Text style={[styles.controlLabel, isCameraOff && styles.controlLabelDark]}>
                      {isCameraOff ? 'Cam On' : 'Cam Off'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Camera Flip (Video Only) */}
                {isVideo && (
                  <TouchableOpacity
                    style={[styles.controlBtn, isSwitchingCamera && styles.controlBtnDisabled]}
                    onPress={() => {
                      resetAutoTimer();
                      switchCamera();
                    }}
                    disabled={isSwitchingCamera}
                    activeOpacity={0.75}
                    accessibilityLabel="Flip camera"
                  >
                    <MaterialIcons
                      name="flip-camera-android"
                      size={26}
                      color="#ffffff"
                    />
                    <Text style={styles.controlLabel}>
                      {isSwitchingCamera ? 'Switching…' : 'Flip'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Speaker Toggle */}
                <TouchableOpacity
                  style={[styles.controlBtn, isSpeakerOn && styles.controlBtnSpeakerOn]}
                  onPress={() => {
                    resetAutoTimer();
                    toggleSpeaker();
                  }}
                  activeOpacity={0.75}
                  accessibilityLabel={isSpeakerOn ? 'Switch to earpiece' : 'Switch to speakerphone'}
                >
                  <MaterialIcons
                    name={isSpeakerOn ? 'volume-up' : 'volume-down'}
                    size={26}
                    color={isSpeakerOn ? '#ffffff' : '#ffffff'}
                  />
                  <Text style={styles.controlLabel}>
                    {isSpeakerOn ? 'Speaker' : 'Earpiece'}
                  </Text>
                </TouchableOpacity>

                {/* End Call / Cancel Button */}
                <TouchableOpacity
                  style={[styles.controlBtn, styles.endCallBtn]}
                  onPress={endCall}
                  activeOpacity={0.85}
                  accessibilityLabel={isConnected ? 'End call' : 'Cancel call'}
                >
                  <MaterialIcons name="call-end" size={30} color="#ffffff" />
                  <Text style={[styles.controlLabel, styles.endCallLabel]}>
                    {isConnected ? 'End' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: '#080e18',
  },
  // Full-screen video styling
  remoteVideo: {
    flex: 1,
    backgroundColor: '#0c131d',
  },
  // Floating PiP preview styling
  localVideo: {
    position: 'absolute',
    width: 100,
    height: 144,
    borderRadius: 16,
    backgroundColor: '#1b2735',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  pipTouchReceiver: {
    position: 'absolute',
    width: 100,
    height: 144,
    borderRadius: 16,
    zIndex: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 6,
  },
  pipSwapIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#09111e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  remoteOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 17, 30, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 2,
  },
  camOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  camOffBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  audioBackground: {
    flex: 1,
    backgroundColor: '#0a1424',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  avatarPulseRing: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(23, 107, 77, 0.22)',
  },
  avatarLarge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors?.primary || '#176B4D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 4,
  },
  avatarLargeText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  placeholderCallerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  placeholderStatusText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  callerRole: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  audioStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  audioStatusText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 36 : 48,
    paddingBottom: Platform.OS === 'android' ? 28 : 36,
  },
  headerContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 20, 32, 0.75)',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8,
  },
  headerCallerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerCallerRole: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: '#22c55e' },
  dotYellow: { backgroundColor: '#eab308' },
  dotRed: { backgroundColor: '#ef4444' },
  dotBlue: { backgroundColor: '#3b82f6' },
  controlsDockWrapper: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  controlsDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(12, 19, 29, 0.88)',
    borderRadius: 36,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    maxWidth: 420,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  controlBtnActiveWhite: {
    backgroundColor: '#ffffff',
  },
  controlBtnSpeakerOn: {
    backgroundColor: colors?.primary || '#176B4D',
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  controlLabel: {
    position: 'absolute',
    bottom: -18,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  controlLabelDark: {
    color: '#ffffff',
  },
  endCallBtn: {
    backgroundColor: '#ef4444',
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  endCallLabel: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
