/**
 * IncomingCallScreen.js
 * Full-screen incoming call UI shown when callState === 'RINGING'
 * Displayed as a global overlay from App.js so it works on any screen.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';
import { colors, typography } from '../theme/tokens';

const VIBRATION_PATTERN = [0, 500, 300, 500, 300, 500];

export default function IncomingCallScreen() {
  const { remoteUser, callType, acceptCall, rejectCall } = useCall();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Slide in
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [slideAnim]);

  // Pulse animation for call icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Vibrate while ringing
  useEffect(() => {
    Vibration.vibrate(VIBRATION_PATTERN, true);
    return () => Vibration.cancel();
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const isVideo = callType === 'VIDEO';

  return (
    <>
      <StatusBar backgroundColor="#0a1628" barStyle="light-content" />
      <Animated.View
        style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Background overlay */}
        <View style={styles.background} />

        {/* Call type label */}
        <Text style={styles.callTypeLabel}>
          Incoming {isVideo ? 'Video' : 'Audio'} Call
        </Text>

        {/* Caller avatar */}
        <View style={styles.avatarWrapper}>
          <Animated.View
            style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }] }]}
          />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(remoteUser?.name)}</Text>
          </View>
        </View>

        {/* Caller info */}
        <Text style={styles.callerName}>{remoteUser?.name || 'Unknown'}</Text>
        <Text style={styles.callerRole}>{remoteUser?.role || ''}</Text>

        {/* Call type icon */}
        <View style={styles.callIconRow}>
          <MaterialIcons
            name={isVideo ? 'videocam' : 'mic'}
            size={28}
            color="rgba(255,255,255,0.7)"
          />
          <Text style={styles.callIconLabel}>{isVideo ? 'Video' : 'Audio'}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {/* Reject */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={rejectCall}
            activeOpacity={0.85}
          >
            <MaterialIcons name="call-end" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Accept */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={acceptCall}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={isVideo ? 'videocam' : 'call'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.actionLabel}>
          <Text style={{ color: '#ef4444' }}>Decline</Text>
          {'                        '}
          <Text style={{ color: '#22c55e' }}>Accept</Text>
        </Text>
      </Animated.View>
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
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a1628',
    opacity: 0.97,
  },
  callTypeLabel: {
    ...typography?.labelMd,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    letterSpacing: 0.5,
    marginBottom: 40,
    textTransform: 'uppercase',
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  avatarPulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59,130,246,0.25)',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors?.primary || '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  callerRole: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 32,
    textTransform: 'capitalize',
  },
  callIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 60,
  },
  callIconLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 72,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
  actionLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
});
