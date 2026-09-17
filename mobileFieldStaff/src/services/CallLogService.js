import { PermissionsAndroid, Platform, AppState } from 'react-native';
import CallLogs from 'react-native-call-log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncService } from './SyncService';
import { supabase } from '../lib/supabase';

const LAST_PROCESSED_CALL_TIMESTAMP_KEY = '@last_processed_call_timestamp';

/**
 * Normalizes phone numbers specifically handling Indian formats.
 * e.g., +919352276227, 09352276227, 9352276227 -> 919352276227
 */
const normalizePhoneNumber = (rawNumber) => {
  if (!rawNumber) return '';
  let digits = rawNumber.replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.substring(1);
  }
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
};

/**
 * Maps react-native-call-log type to our CRM directions and types.
 */
const mapCallType = (typeRaw) => {
  const type = typeRaw.toString();
  // Types as defined by Android CallLog.Calls (react-native-call-log uses these)
  // 1 = INCOMING, 2 = OUTGOING, 3 = MISSED, 4 = VOICEMAIL, 5 = REJECTED, 6 = BLOCKED
  switch (type) {
    case '1': return { direction: 'INCOMING', call_type: 'ANSWERED' };
    case '2': return { direction: 'OUTGOING', call_type: 'ANSWERED' }; // Outgoing doesn't distinguish answered/unanswered reliably without duration
    case '3': return { direction: 'INCOMING', call_type: 'MISSED' };
    case '5': return { direction: 'INCOMING', call_type: 'REJECTED' };
    default: return { direction: 'UNKNOWN', call_type: 'UNKNOWN' };
  }
};

export class CallLogService {
  /**
   * Requests READ_CALL_LOG permission from the user on Android.
   */
  static async requestPermissions() {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Permission',
          message: 'Shubh Labh Field Assistant needs access to your call logs to capture your field calls into the CRM automatically.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Failed to request call log permission:', err);
      return false;
    }
  }

  /**
   * Checks for new call logs and enqueues them for syncing.
   * Returns the number of new calls enqueued.
   */
  static async syncCallLogs(userId) {
    if (!userId) return 0;
    if (Platform.OS !== 'android') return 0;

    const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
    if (!hasPermission) {
       console.log('CallLogService: No READ_CALL_LOG permission.');
       return 0;
    }

    try {
      const lastTimestampStr = await AsyncStorage.getItem(LAST_PROCESSED_CALL_TIMESTAMP_KEY);
      const lastTimestamp = lastTimestampStr ? parseInt(lastTimestampStr, 10) : 0;
      
      // Load a reasonable amount if this is the first time (e.g. last 100), else load up to 100
      const logs = await CallLogs.load(100);
      if (!logs || logs.length === 0) return 0;

      let maxTimestampProcessed = lastTimestamp;
      let enqueuedCount = 0;

      // Logs are usually sorted newest to oldest. Reverse to process oldest first to maintain timeline.
      const logsToProcess = [...logs].reverse();

      for (const call of logsToProcess) {
        const callTimestamp = parseInt(call.timestamp, 10);
        
        // Skip already processed calls
        if (callTimestamp <= lastTimestamp) {
           continue;
        }

        const duration = parseInt(call.duration || '0', 10);
        const { direction, call_type } = mapCallType(call.type);
        
        // Adjust OUTGOING type if duration is 0
        let finalType = call_type;
        if (direction === 'OUTGOING' && duration === 0) {
           finalType = 'MISSED'; // Approximate "unanswered outgoing" as MISSED
        }

        const rawPhone = call.phoneNumber || '';
        const normalizedPhone = normalizePhoneNumber(rawPhone);

        if (!normalizedPhone) continue; // Skip invalid numbers

        const deviceEventId = `android_call_${callTimestamp}_${normalizedPhone}`;
        
        const payload = {
          staff_id: userId,
          party_id: null, // Matching will be done in a later sprint or via DB triggers
          phone_number: rawPhone,
          normalized_phone: normalizedPhone,
          direction: direction,
          call_type: finalType,
          started_at: new Date(callTimestamp).toISOString(),
          ended_at: new Date(callTimestamp + (duration * 1000)).toISOString(),
          duration_seconds: duration,
          device_event_id: deviceEventId,
          source: 'android_call_log'
        };

        const maskedPhone = normalizedPhone.length >= 10 ? 
            `${normalizedPhone.substring(0, 4)}*****${normalizedPhone.substring(normalizedPhone.length - 3)}` : 
            'Unknown';
            
        console.log(`[DIAGNOSTIC] CALL_DETECTED: dir=${direction} type=${finalType} event=${deviceEventId} phone=${maskedPhone}`);

        await SyncService.enqueueOperation('crm_call_events', payload, userId);
        console.log(`[DIAGNOSTIC] CALL_QUEUED: event=${deviceEventId}`);
        enqueuedCount++;

        if (callTimestamp > maxTimestampProcessed) {
           maxTimestampProcessed = callTimestamp;
        }
      }

      if (maxTimestampProcessed > lastTimestamp) {
        await AsyncStorage.setItem(LAST_PROCESSED_CALL_TIMESTAMP_KEY, maxTimestampProcessed.toString());
      }
      
      return enqueuedCount;

    } catch (err) {
      console.error('CallLogService: Failed to sync call logs:', err);
      return 0;
    }
  }

  /**
   * Initializes the foreground state listener to trigger syncs.
   */
  static initAppStateListener() {
    if (this._appStateSubscription) return;

    this._appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          // Trigger sync without blocking the main UI thread immediately
          setTimeout(() => {
             this.syncCallLogs(session.user.id);
          }, 1000);
        }
      }
    });
  }

  static destroy() {
    if (this._appStateSubscription) {
      this._appStateSubscription.remove();
      this._appStateSubscription = null;
    }
  }
}
