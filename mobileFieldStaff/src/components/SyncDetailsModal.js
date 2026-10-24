import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { Button } from './Button';
import { SyncService } from '../services/SyncService';

const { height: screenHeight } = Dimensions.get('window');

const TABLE_LABELS = {
  crm_notifications: 'Notification',
  chat_messages: 'Chat Message',
  chat_conversations: 'Chat Conversation',
  chat_participants: 'Chat Participant',
  staff_tracking_sessions: 'Tracking Session',
  staff_location_history: 'Location Point',
  staff_travel_segments: 'Travel Segment',
  crm_visits: 'Customer Visit',
  crm_parties: 'Customer / Party',
  requirements: 'Requirement / Order',
  requirement_items: 'Requirement Item',
  geofence_events: 'Geofence Event',
  follow_ups: 'Follow-up Task',
  crm_call_events: 'Call Event',
};

const sanitizeError = (err) => {
  if (!err || typeof err !== 'string') return 'Unknown error';
  return err
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/apikey\s+[A-Za-z0-9._-]+/gi, 'apikey [REDACTED]')
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[REDACTED]');
};

const getErrorExplanation = (err) => {
  if (!err || typeof err !== 'string') return null;
  if (
    err.includes('crm_notifications_user_id_fkey') ||
    (err.includes('crm_notifications') && err.includes('foreign key'))
  ) {
    return 'Recipient user ID does not match an authenticated user account.';
  }
  if (err.includes('23503')) {
    return 'Required parent record is missing or not yet synchronized on server.';
  }
  if (err.includes('23505') || err.includes('duplicate key')) {
    return 'This record already exists on the backend database.';
  }
  if (err.includes('req_status_check')) {
    return 'The status value is rejected by server schema check.';
  }
  if (
    err.toLowerCase().includes('network') ||
    err.toLowerCase().includes('timeout') ||
    err.toLowerCase().includes('failed to fetch')
  ) {
    return 'Network connection interrupted during transfer.';
  }
  return null;
};

const getNextAction = (op, err) => {
  if (op.status === 'SYNCING') {
    return 'Currently synchronizing with server...';
  }
  const errorStr = (err || op.last_error || '').toLowerCase();
  if (errorStr.includes('timeout') || errorStr.includes('network') || errorStr.includes('fetch')) {
    return 'Verify cellular or Wi-Fi internet connection and tap SYNC NOW to retry.';
  }
  if (errorStr.includes('crm_notifications_user_id_fkey') || errorStr.includes('foreign key') || errorStr.includes('23503')) {
    return 'Dependent parent record is syncing. Tap SYNC NOW to synchronize parent entities first.';
  }
  if (errorStr.includes('jwt') || errorStr.includes('auth') || errorStr.includes('refresh token')) {
    return 'Authentication session expired. Please log out and log back in.';
  }
  if (errorStr.includes('check constraint') || errorStr.includes('req_status_check') || errorStr.includes('23514')) {
    return 'Record format rejected by server schema check. Contact support.';
  }
  if (op.status === 'FAILED') {
    return 'Maximum retry attempts reached. Tap SYNC NOW to retry synchronization manually.';
  }
  if (op.status === 'PENDING' && (op.attempts || 0) > 0) {
    return 'Scheduled for automatic retry. Tap SYNC NOW to retry immediately.';
  }
  return 'Waiting for queue processing. Tap SYNC NOW to push immediately.';
};

const formatTime = (isoString) => {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return isoString;
  }
};

export function SyncDetailsModal({ visible, onClose, userId, queueVersion }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQueue = async () => {
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    try {
      const q = await SyncService.getQueue(userId);
      if (Array.isArray(q)) {
        // Only show unsynced records (Pending, Retrying, Syncing, Failed)
        const unsynced = q.filter((op) => op.status !== 'SYNCED');
        // Sort: FAILED first, then RETRYING, then SYNCING, then PENDING
        const getPriority = (op) => {
          if (op.status === 'FAILED') return 1;
          if (op.status === 'PENDING' && (op.attempts || 0) > 0) return 2;
          if (op.status === 'SYNCING') return 3;
          return 4;
        };
        unsynced.sort((a, b) => getPriority(a) - getPriority(b));
        setItems(unsynced);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.warn('SyncDetailsModal: Error reading queue:', e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      loadQueue();
    }
  }, [visible, userId, queueVersion]);

  const getStatusBadge = (op) => {
    if (op.status === 'FAILED') {
      return {
        label: 'Failed',
        color: colors.error,
        bg: '#FFDAD6',
        icon: 'error-outline',
      };
    }
    if (op.status === 'SYNCING') {
      return {
        label: 'Syncing',
        color: '#1565C0',
        bg: '#E3F2FD',
        icon: 'sync',
      };
    }
    if (op.status === 'PENDING' && (op.attempts || 0) > 0) {
      return {
        label: 'Retrying',
        color: '#E65100',
        bg: '#FFE0B2',
        icon: 'replay',
      };
    }
    return {
      label: 'Pending',
      color: '#B26A00',
      bg: '#FFF3E0',
      icon: 'schedule',
    };
  };

  const getRecordSummary = (op) => {
    const parts = [];
    if (op.action) {
      parts.push(op.action.toUpperCase());
    }
    const safeId = op.local_id || op.payload?.id;
    if (safeId && typeof safeId === 'string') {
      parts.push(`#${safeId.slice(0, 8)}`);
    }
    const label =
      op.payload?.title ||
      op.payload?.customerName ||
      op.payload?.message_text ||
      op.payload?.status;
    if (label && typeof label === 'string') {
      const truncated = label.length > 32 ? label.substring(0, 32) + '...' : label;
      parts.push(`"${truncated}"`);
    }
    return parts.join(' ');
  };

  const failedCount = items.filter((i) => i.status === 'FAILED').length;
  const retryingCount = items.filter((i) => i.status === 'PENDING' && (i.attempts || 0) > 0).length;
  const pendingCount = items.filter((i) => i.status !== 'FAILED').length;

  let subtitleText = 'All items synchronized';
  if (isLoading) {
    subtitleText = 'Loading queue...';
  } else if (items.length > 0) {
    if (retryingCount > 0) {
      subtitleText = `${pendingCount} Pending (${retryingCount} Retrying) • ${failedCount} Failed`;
    } else {
      subtitleText = `${pendingCount} Pending • ${failedCount} Failed`;
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.dialogCard, elevation.level3]}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Sync Details</Text>
              <Text style={styles.headerSubtitle}>
                {subtitleText}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.centerText}>Reading sync queue...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="check-circle" size={44} color={colors.primary} />
                <Text style={styles.emptyTitle}>All Items Synchronized</Text>
                <Text style={styles.emptySubtitle}>
                  There are no pending or failed operations in the offline queue.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {items.map((op, idx) => {
                  const badge = getStatusBadge(op);
                  const typeLabel = TABLE_LABELS[op.table] || op.table;
                  const recordRef = getRecordSummary(op);
                  const recordedErr = op.last_error ? sanitizeError(op.last_error) : null;
                  const explanation = recordedErr ? getErrorExplanation(recordedErr) : null;
                  const nextAction = getNextAction(op, recordedErr);
                  const createdTime = formatTime(op.created_at);
                  const attemptTime = formatTime(op.last_attempted_at);

                  return (
                    <View
                      key={op.local_id || `${op.table}-${idx}`}
                      style={[
                        styles.itemCard,
                        op.status === 'FAILED' && styles.itemCardFailed,
                      ]}
                    >
                      {/* TOP ROW: Type + Status Badge */}
                      <View style={styles.itemTopRow}>
                        <View style={styles.typeGroup}>
                          <Text style={styles.itemType}>{typeLabel}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <MaterialIcons
                            name={badge.icon}
                            size={12}
                            color={badge.color}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={[styles.badgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      {/* RECORD REFERENCE */}
                      {Boolean(recordRef) && (
                        <Text style={styles.itemRef} numberOfLines={2}>
                          {recordRef}
                        </Text>
                      )}

                      {/* METADATA / TIMESTAMPS */}
                      <View style={styles.timeRow}>
                        <Text style={styles.timeText}>
                          Attempts: {op.attempts || 0}
                        </Text>
                        {Boolean(createdTime) && (
                          <Text style={styles.timeText}>
                            • Queued: {createdTime}
                          </Text>
                        )}
                        {Boolean(attemptTime) && (
                          <Text style={styles.timeText}>
                            • Last Attempt: {attemptTime}
                          </Text>
                        )}
                      </View>

                      {/* ERROR BOX */}
                      {(op.status === 'FAILED' || Boolean(recordedErr)) && (
                        <View style={[styles.errorBox, op.status !== 'FAILED' && styles.errorBoxRetrying]}>
                          <View style={styles.errorHeader}>
                            <MaterialIcons 
                              name={op.status === 'FAILED' ? "error" : "info"} 
                              size={14} 
                              color={op.status === 'FAILED' ? colors.error : '#E65100'} 
                            />
                            <Text style={[styles.errorTitle, op.status !== 'FAILED' && { color: '#E65100' }]}>
                              {op.status === 'FAILED' ? 'Recorded Failure Details:' : 'Last Attempt Note:'}
                            </Text>
                          </View>
                          <Text style={[styles.errorText, op.status !== 'FAILED' && { color: '#BF360C' }]}>
                            {recordedErr || 'No error details were recorded for this failure.'}
                          </Text>
                          {Boolean(explanation) && (
                            <View style={styles.explanationBox}>
                              <Text style={styles.explanationText}>
                                Note: {explanation}
                              </Text>
                            </View>
                          )}
                          {Boolean(nextAction) && (
                            <View style={styles.nextActionBox}>
                              <Text style={styles.nextActionText}>
                                Next Action: {nextAction}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* PENDING WAITING HINT */}
                      {op.status === 'PENDING' && !recordedErr && (
                        <Text style={styles.pendingHint}>
                          Waiting for network connectivity or dependent record sync.
                        </Text>
                      )}

                      {/* SYNCING IN PROGRESS HINT */}
                      {op.status === 'SYNCING' && (
                        <Text style={styles.syncingHint}>
                          Currently synchronizing with server...
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Button
              title="OK"
              variant="primary"
              onPress={onClose}
              accessibilityLabel="Close sync details"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: screenHeight * 0.82,
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  body: {
    flexShrink: 1,
    minHeight: 180,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  emptyContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardFailed: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFDFD',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemType: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.onSurface,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemRef: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.outline,
  },
  errorBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.error,
  },
  errorText: {
    fontSize: 11.5,
    color: '#9E1C1C',
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  explanationBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  explanationText: {
    fontSize: 11.5,
    color: '#8A1414',
    fontStyle: 'italic',
    lineHeight: 15,
  },
  errorBoxRetrying: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  nextActionBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
  },
  nextActionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#37474F',
    lineHeight: 15,
  },
  pendingHint: {
    fontSize: 11,
    color: '#8D6E63',
    fontStyle: 'italic',
    marginTop: 4,
  },
  syncingHint: {
    fontSize: 11,
    color: '#1565C0',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: colors.surface,
  },
});
