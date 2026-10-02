/**
 * ActiveCallScreen.js
 * Full-screen active call UI for both Audio and Video calls.
 * Shown when callState === 'CONNECTING' | 'CONNECTED'
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';
import { colors, typography } from '../theme/tokens';

// RTCView is only available after react-native-webrtc is installed
let RTCView = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch (e) {
  // Will show placeholder
}

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function ActiveCallScreen() {
  const {
    callState,
    remoteUser,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isFrontCamera,
    callDuration,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    isSpeakerOn,
    toggleSpeaker,
  } = useCall();

  const isConnected = callState === 'CONNECTED';
  const isVideo = callType === 'VIDEO';

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View style={styles.container}>

        {/* ── VIDEO CALL ─────────────────────────────── */}
        {isVideo && RTCView ? (
          <>
            {/* Remote video — full screen */}
            {remoteStream ? (
              <RTCView
                streamURL={remoteStream.toURL()}
                style={styles.remoteVideo}
                objectFit="cover"
                mirror={false}
              />
            ) : (
              <View style={styles.remoteVideoPlaceholder}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{getInitials(remoteUser?.name)}</Text>
                </View>
                <Text style={styles.connectingText}>
                  {isConnected ? remoteUser?.name : (callState === 'FAILED' ? 'Call Failed' : 'Connecting…')}
                </Text>
              </View>
            )}

            {/* Local camera PiP (top-right) */}
            {localStream && (
              <RTCView
                streamURL={localStream.toURL()}
                style={styles.localVideo}
                objectFit="cover"
                mirror={isFrontCamera}
              />
            )}
          </>
        ) : (
          /* ── AUDIO CALL ─────────────────────────────── */
          <View style={styles.audioBackground}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{getInitials(remoteUser?.name)}</Text>
            </View>
            <Text style={styles.callerName}>{remoteUser?.name || 'Unknown'}</Text>
            <Text style={styles.callerRole}>{remoteUser?.role || ''}</Text>
          </View>
        )}

        {/* ── Overlay UI ─────────────────────────────── */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Status + duration */}
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              {isConnected ? formatDuration(callDuration) : (callState === 'FAILED' ? 'Call Failed' : 'Connecting…')}
            </Text>
            <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotYellow]} />
          </View>

          {/* Caller info (Video mode) */}
          {isVideo && (
            <View style={styles.videoCallerInfo}>
              <Text style={styles.callerName}>{remoteUser?.name}</Text>
              <Text style={styles.callerRole}>{remoteUser?.role}</Text>
            </View>
          )}

          {/* Control buttons */}
          <View style={styles.controls}>
            {/* Mic */}
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={toggleMute}
            >
              <MaterialIcons
                name={isMuted ? 'mic-off' : 'mic'}
                size={26}
                color={isMuted ? colors?.primary || '#3B82F6' : '#fff'}
              />
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* Camera (Video only) */}
            {isVideo && (
              <>
                <TouchableOpacity
                  style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                  onPress={toggleCamera}
                >
                  <MaterialIcons
                    name={isCameraOff ? 'videocam-off' : 'videocam'}
                    size={26}
                    color={isCameraOff ? colors?.primary || '#3B82F6' : '#fff'}
                  />
                  <Text style={styles.controlLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
                  <MaterialIcons name="flip-camera-android" size={26} color="#fff" />
                  <Text style={styles.controlLabel}>Flip</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Speaker Toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
              onPress={toggleSpeaker}
            >
              <MaterialIcons
                name={isSpeakerOn ? 'volume-up' : 'volume-down'}
                size={26}
                color={isSpeakerOn ? (colors?.primary || '#3B82F6') : '#fff'}
              />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              style={[styles.controlBtn, styles.endCallBtn]}
              onPress={endCall}
            >
              <MaterialIcons name="call-end" size={30} color="#fff" />
              <Text style={styles.controlLabel}>End</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#111',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 96,
    height: 128,
    borderRadius: 12,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  audioBackground: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  avatarLarge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors?.primary || '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 8,
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  callerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  callerRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'capitalize',
  },
  connectingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
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
  videoCallerInfo: {
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '500',
  },
  endCallBtn: {
    backgroundColor: '#ef4444',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
});
