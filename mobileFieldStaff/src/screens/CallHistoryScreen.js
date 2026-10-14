/**
 * CallHistoryScreen.js
 * FA-CALL-HISTORY-01 — Field Assist Call History
 *
 * Features:
 *  - SectionList grouped by Today / Yesterday / Older dates
 *  - Direction icons (outgoing=green, incoming=blue, missed=red)
 *  - Call-type icon (audio/video)
 *  - Duration for connected calls
 *  - Call Back (Audio) and Video Call quick-action buttons
 *  - Double-tap debounce prevents accidental double-dial
 *  - Pull-to-refresh, loading state, empty state, error state
 *  - Tap-to-inspect modal (full call details)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { AppHeader } from '../components';
import { colors, typography } from '../theme/tokens';
import {
  getCallHistory,
  formatDuration,
} from '../services/CallHistoryService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Status config
const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', color: colors.primary },
  MISSED:    { label: 'Missed',    color: colors.error },
  DECLINED:  { label: 'Declined',  color: colors.error },
  DECLINED_BY_OTHER: { label: 'Declined', color: colors.outline },
  CANCELLED: { label: 'Cancelled', color: colors.outline },
  FAILED:    { label: 'Failed',    color: colors.error },
  NO_ANSWER: { label: 'No Answer', color: colors.outline },
  UNKNOWN:   { label: 'Unknown',   color: colors.outline },
};

// Direction icon config
function getDirectionIcon(entry) {
  if (entry.isMissed) return { name: 'call-missed', color: colors.error };
  if (entry.direction === 'OUTGOING') return { name: 'call-made', color: colors.primary };
  return { name: 'call-received', color: colors.secondary };
}

// Avatar background colors based on direction
const AVATAR_BG = {
  OUTGOING: colors.primaryContainer,
  INCOMING: colors.secondaryContainer,
  MISSED:   colors.errorContainer,
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function CallDetailModal({ entry, visible, onClose, onCallBack, onVideoCall }) {
  if (!entry) return null;
  const status = STATUS_CONFIG[entry.resolvedStatus] || STATUS_CONFIG.UNKNOWN;
  const dirIcon = getDirectionIcon(entry);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.modalHandle} />

          {/* Avatar + Name */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalAvatar, { backgroundColor: entry.isMissed ? colors.errorContainer : colors.primaryContainer }]}>
              <Text style={[styles.modalAvatarText, { color: entry.isMissed ? colors.error : colors.primary }]}>
                {getInitials(entry.otherParticipant?.display_name)}
              </Text>
            </View>
            <Text style={styles.modalName}>{entry.otherParticipant?.display_name || 'Unknown'}</Text>
            {entry.otherParticipant?.role && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{entry.otherParticipant.role}</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Summary row */}
            <View style={styles.modalSummaryRow}>
              <MaterialIcons name={dirIcon.name} size={18} color={dirIcon.color} />
              <Text style={[styles.modalSummaryText, { color: dirIcon.color }]}>
                {entry.direction === 'OUTGOING' ? 'Outgoing' : 'Incoming'} •{' '}
                {entry.call_type === 'VIDEO' ? 'Video Call' : 'Voice Call'}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: status.color + '1A' }]}>
                <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>

            {/* Detail rows */}
            {[
              { icon: 'access-time', label: 'Started', value: formatDateTime(entry.created_at) },
              entry.answered_at && { icon: 'phone', label: 'Answered', value: formatDateTime(entry.answered_at) },
              entry.connected_at && { icon: 'call', label: 'Connected', value: formatDateTime(entry.connected_at) },
              entry.ended_at && { icon: 'call-end', label: 'Ended', value: formatDateTime(entry.ended_at) },
              entry.durationFormatted && { icon: 'timer', label: 'Duration', value: entry.durationFormatted },
            ].filter(Boolean).map((row, i) => (
              <View key={i} style={styles.detailRow}>
                <MaterialIcons name={row.icon} size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnAudio]}
              onPress={() => { onClose(); onCallBack(); }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="phone" size={20} color={colors.onPrimary} />
              <Text style={styles.modalBtnText}>Call Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnVideo]}
              onPress={() => { onClose(); onVideoCall(); }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="videocam" size={20} color={colors.onPrimary} />
              <Text style={styles.modalBtnText}>Video Call</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Call History Item ────────────────────────────────────────────────────────

const DOUBLE_TAP_GUARD_MS = 2500;
let lastCallInitiatedAt = 0;

function CallHistoryItem({ entry, onPress, onCallBack, onVideoCall }) {
  const status = STATUS_CONFIG[entry.resolvedStatus] || STATUS_CONFIG.UNKNOWN;
  const dirIcon = getDirectionIcon(entry);
  const avatarBg = entry.isMissed ? colors.errorContainer : AVATAR_BG[entry.direction] || colors.primaryContainer;
  const avatarText = entry.isMissed ? colors.error : (entry.direction === 'OUTGOING' ? colors.primary : colors.secondary);

  const handleCallBack = () => {
    const now = Date.now();
    if (now - lastCallInitiatedAt < DOUBLE_TAP_GUARD_MS) return;
    lastCallInitiatedAt = now;
    onCallBack(entry);
  };

  const handleVideoCall = () => {
    const now = Date.now();
    if (now - lastCallInitiatedAt < DOUBLE_TAP_GUARD_MS) return;
    lastCallInitiatedAt = now;
    onVideoCall(entry);
  };

  return (
    <TouchableOpacity style={styles.itemCard} onPress={() => onPress(entry)} activeOpacity={0.85}>
      {/* Left accent for missed */}
      {entry.isMissed && <View style={styles.missedAccent} />}

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[styles.avatarText, { color: avatarText }]}>
          {getInitials(entry.otherParticipant?.display_name)}
        </Text>
      </View>

      {/* Main info */}
      <View style={styles.itemBody}>
        <View style={styles.itemRow1}>
          <Text style={[styles.itemName, entry.isMissed && { color: colors.error }]} numberOfLines={1}>
            {entry.otherParticipant?.display_name || 'Unknown'}
          </Text>
          <Text style={styles.itemTime}>{formatTime(entry.created_at)}</Text>
        </View>

        <View style={styles.itemRow2}>
          {/* Direction icon */}
          <MaterialIcons name={dirIcon.name} size={14} color={dirIcon.color} style={styles.dirIcon} />
          {/* Call type icon */}
          <MaterialIcons
            name={entry.call_type === 'VIDEO' ? 'videocam' : 'phone'}
            size={14}
            color={colors.onSurfaceVariant}
            style={styles.typeIcon}
          />
          {/* Status */}
          <Text style={[styles.itemStatus, { color: status.color }]}>{status.label}</Text>
          {/* Duration */}
          {entry.durationFormatted && (
            <Text style={styles.itemDuration}> · {entry.durationFormatted}</Text>
          )}
        </View>

        {entry.otherParticipant?.role && (
          <Text style={styles.itemRole} numberOfLines={1}>{entry.otherParticipant.role}</Text>
        )}
      </View>

      {/* Quick-action buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, styles.quickBtnAudio]}
          onPress={handleCallBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          accessible
          accessibilityLabel={`Call back ${entry.otherParticipant?.display_name || 'contact'} by audio`}
        >
          <MaterialIcons name="phone" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, styles.quickBtnVideo]}
          onPress={handleVideoCall}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          accessible
          accessibilityLabel={`Video call ${entry.otherParticipant?.display_name || 'contact'}`}
        >
          <MaterialIcons name="videocam" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function CallHistoryScreen({ navigation }) {
  const { session } = useAuth();
  const { initiateCall, callState } = useCall();
  const userId = session?.user?.id;

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isBusyRef = useRef(false);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { sections: s, error: e } = await getCallHistory(userId);
    setSections(s);
    setError(e);

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const guardedInitiate = useCallback((entry, callType) => {
    if (callState !== 'IDLE') {
      Alert.alert('Call in progress', 'Please end the current call before starting a new one.');
      return;
    }
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setTimeout(() => { isBusyRef.current = false; }, 3000);

    const target = {
      id: entry.otherParticipant?.id,
      name: entry.otherParticipant?.display_name || 'Contact',
      role: entry.otherParticipant?.role || '',
    };
    if (!target.id) {
      Alert.alert('Cannot call', 'Could not resolve contact details.');
      return;
    }
    initiateCall(target, callType);
  }, [callState, initiateCall]);

  const handleCallBack = useCallback((entry) => guardedInitiate(entry, 'AUDIO'), [guardedInitiate]);
  const handleVideoCall = useCallback((entry) => guardedInitiate(entry, 'VIDEO'), [guardedInitiate]);

  const handleItemPress = (entry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  // ─── Render helpers ───────────────────────────────────────────────

  const renderItem = ({ item }) => (
    <CallHistoryItem
      entry={item}
      onPress={handleItemPress}
      onCallBack={handleCallBack}
      onVideoCall={handleVideoCall}
    />
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppHeader variant="B" title="Call History" subtitle="कॉल इतिहास" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading call history…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppHeader variant="B" title="Call History" subtitle="कॉल इतिहास" />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Could not load call history</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadHistory()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader variant="B" title="Call History" subtitle="कॉल इतिहास" />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? styles.flexGrow : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHistory(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="phone-missed" size={64} color={colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No call history yet</Text>
            <Text style={styles.emptySub}>
              Your audio and video calls will appear here after they are made.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <CallDetailModal
        entry={selectedEntry}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCallBack={() => selectedEntry && handleCallBack(selectedEntry)}
        onVideoCall={() => selectedEntry && handleVideoCall(selectedEntry)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexGrow: { flexGrow: 1 },
  listContent: { paddingBottom: 24 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  sectionHeaderText: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },

  // Item card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  missedAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.error,
    borderRadius: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    ...typography.labelLg,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  itemRow2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dirIcon: { marginRight: 4 },
  typeIcon: { marginRight: 4 },
  itemStatus: {
    ...typography.bodySm,
    fontSize: 12,
    fontWeight: '600',
  },
  itemDuration: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  itemRole: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Quick action buttons
  quickActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  quickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnAudio: {
    backgroundColor: colors.primaryContainer,
  },
  quickBtnVideo: {
    backgroundColor: colors.secondaryContainer,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginLeft: 72,
  },

  // Loading / error / empty
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 12,
  },
  errorTitle: {
    ...typography.headlineSm,
    color: colors.error,
    marginTop: 12,
    fontWeight: '700',
  },
  errorSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: 16,
    fontWeight: '700',
  },
  emptySub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  modalName: {
    ...typography.headlineSm,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  rolePill: {
    marginTop: 4,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  rolePillText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 16,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  modalSummaryText: {
    ...typography.bodyMd,
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainer,
  },
  detailLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    width: 76,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  modalBtnAudio: { backgroundColor: colors.primary },
  modalBtnVideo: { backgroundColor: colors.secondary },
  modalBtnText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCloseBtnText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
});

export default CallHistoryScreen;
