/**
 * IncomingCallScreen.js
 * Micro-Sprint FA-VIDEO-UI-01: WhatsApp-Inspired Incoming Call UI
 * 
 * Features:
 * - Full-screen immersive incoming call screen with smooth slide & pulse animations.
 * - Prominent contact avatar, caller name, role badge, and call-type indicator.
 * - Distinct, large accessible Decline and Answer circular action buttons.
 * - Duplicate action guard (prevents conflicting signal dispatches).
 * - Android BackHandler integration (safely rejects on hardware back press).
 * - Distinct styling for Video vs Audio incoming calls.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';
import { colors } from '../theme/tokens';

const VIBRATION_PATTERN = [0, 500, 300, 500, 300, 500];

export default function IncomingCallScreen() {
  const { remoteUser, callType, acceptCall, rejectCall } = useCall();
  const [isProcessing, setIsProcessing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Slide-in animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [slideAnim]);

  // Breathing pulse animation for avatar
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Vibration on incoming call
  useEffect(() => {
    Vibration.vibrate(VIBRATION_PATTERN, true);
    return () => Vibration.cancel();
  }, []);

  // Safe Decline Action
  const handleReject = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    Vibration.cancel();
    rejectCall();
  }, [isProcessing, rejectCall]);

  // Safe Accept Action
  const handleAccept = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    Vibration.cancel();
    acceptCall();
  }, [isProcessing, acceptCall]);

  // Android Back Button handler
  useEffect(() => {
    const onBackPress = () => {
      handleReject();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleReject]);

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

  const isVideo = callType === 'VIDEO';

  return (
    <>
      <StatusBar backgroundColor="#080e18" barStyle="light-content" translucent={Platform.OS === 'android'} />
      <Animated.View
        style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Background Overlay */}
        <View style={styles.background} />

        {/* Header: Field Assist Brand + Call Type */}
        <View style={styles.header}>
          <View style={styles.securityBadge}>
            <MaterialIcons name="lock" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.securityText}>SHUBH LABH SALESTEAM SECURE CALL</Text>
          </View>
          <Text style={styles.callTypeLabel}>
            Incoming {isVideo ? 'Video Call' : 'Voice Call'}
          </Text>
        </View>

        {/* Caller Avatar with Concentric Pulse Ring */}
        <View style={styles.avatarWrapper}>
          <Animated.View
            style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }] }]}
          />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(remoteUser?.name)}</Text>
          </View>
        </View>

        {/* Caller Info */}
        <Text style={styles.callerName}>{remoteUser?.name || 'Field Staff'}</Text>
        <Text style={styles.callerRole}>
          {remoteUser?.role ? remoteUser.role.toUpperCase() : 'STAFF MEMBER'}
        </Text>

        {/* Call Type Indicator Badge */}
        <View style={styles.callTypeBadge}>
          <MaterialIcons
            name={isVideo ? 'videocam' : 'phone-in-talk'}
            size={18}
            color="#ffffff"
          />
          <Text style={styles.callTypeBadgeText}>
            {isVideo ? 'HD Video Call' : 'Voice Call'}
          </Text>
        </View>

        {/* Action Buttons: Decline & Accept */}
        <View style={styles.actionRow}>
          {/* Decline Button */}
          <View style={styles.actionBtnContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.actionBtnDisabled]}
              onPress={handleReject}
              activeOpacity={0.8}
              disabled={isProcessing}
              accessibilityLabel="Decline incoming call"
            >
              <MaterialIcons name="call-end" size={34} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.declineLabel}>Decline</Text>
          </View>

          {/* Accept Button */}
          <View style={styles.actionBtnContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn, isProcessing && styles.actionBtnDisabled]}
              onPress={handleAccept}
              activeOpacity={0.8}
              disabled={isProcessing}
              accessibilityLabel="Answer incoming call"
            >
              <MaterialIcons
                name={isVideo ? 'videocam' : 'call'}
                size={34}
                color="#ffffff"
              />
            </TouchableOpacity>
            <Text style={styles.acceptLabel}>Answer</Text>
          </View>
        </View>
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
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 56 : 68,
    paddingBottom: Platform.OS === 'android' ? 56 : 68,
    paddingHorizontal: 28,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080e18',
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  securityText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
  },
  callTypeLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  avatarPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(23, 107, 77, 0.25)',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors?.primary || '#176B4D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  callerName: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: -8,
  },
  callerRole: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginTop: -2,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  callTypeBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 36,
  },
  actionBtnContainer: {
    alignItems: 'center',
    gap: 10,
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
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
  declineLabel: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  acceptLabel: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
