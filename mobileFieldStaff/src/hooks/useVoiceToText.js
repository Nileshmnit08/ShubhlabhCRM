/**
 * useVoiceToText.js
 *
 * FA-VOICE-TO-TEXT-01 — Native On-Device Voice to Chat
 *
 * VOICE_RECOGNITION_MODE = ON_DEVICE
 *
 * This hook:
 * - Uses Android's native SpeechRecognizer via the SpeechRecognizerModule native module.
 * - Explicitly requires isOnDeviceRecognitionAvailable() === true before starting.
 * - Does NOT use any cloud, paid, or network speech service.
 * - Does NOT save, store, or upload any audio.
 * - Only produces a transcript string which the caller appends to the chat TextInput.
 * - Does NOT auto-send. The user controls Send.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';

// Native module injected by SpeechRecognizerPackage (Kotlin)
const { SpeechRecognizerModule } = NativeModules;

// ─────────────────────────────────────────────────────────────────
// Mic states
// ─────────────────────────────────────────────────────────────────
export const MicState = {
  IDLE:       'IDLE',
  LISTENING:  'LISTENING',
  PROCESSING: 'PROCESSING', // onEndOfSpeech received, awaiting onResults
  ERROR:      'ERROR',
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────
/**
 * @param {Object} options
 * @param {string}   options.locale          - BCP-47 locale tag, e.g. 'en-IN' or 'hi-IN'
 * @param {Function} options.onTranscript    - called with final transcript string
 * @param {Function} options.onPartial       - called with partial transcript string (optional)
 *
 * @returns {{
 *   micState: string,
 *   voiceError: string|null,
 *   startListening: Function,
 *   stopListening: Function,
 *   cancelListening: Function,
 *   destroyRecognizer: Function,
 * }}
 */
export function useVoiceToText({ locale = 'en-IN', onTranscript, onPartial } = {}) {
  const [micState, setMicState] = useState(MicState.IDLE);
  const [voiceError, setVoiceError] = useState(null);

  // Error auto-clear timer
  const errorTimerRef = useRef(null);
  // Prevent stale closure captures of callbacks
  const onTranscriptRef = useRef(onTranscript);
  const onPartialRef    = useRef(onPartial);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onPartialRef.current    = onPartial;    }, [onPartial]);

  // ── NativeEventEmitter subscriptions ──────────────────────────
  useEffect(() => {
    if (!SpeechRecognizerModule) {
      // Module not available (e.g. on iOS or misconfigured Android build)
      return;
    }

    const emitter = new NativeEventEmitter(SpeechRecognizerModule);

    const subscriptions = [
      emitter.addListener('onSpeechStarted', () => {
        setMicState(MicState.LISTENING);
        clearVoiceError();
      }),

      emitter.addListener('onSpeechPartialResults', (event) => {
        if (onPartialRef.current && event?.transcript) {
          onPartialRef.current(event.transcript);
        }
      }),

      emitter.addListener('onSpeechResults', (event) => {
        setMicState(MicState.IDLE);
        if (event?.transcript != null && onTranscriptRef.current) {
          onTranscriptRef.current(event.transcript);
        }
      }),

      emitter.addListener('onSpeechEnd', () => {
        // Transition to PROCESSING only if we were LISTENING
        setMicState((prev) =>
          prev === MicState.LISTENING ? MicState.PROCESSING : prev
        );
      }),

      emitter.addListener('onSpeechError', (event) => {
        setMicState(MicState.IDLE);
        const msg = event?.message || 'Voice recognition failed. Please try again.';
        showVoiceError(msg);
      }),
    ];

    return () => {
      subscriptions.forEach((s) => s.remove());
    };
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (SpeechRecognizerModule) {
        try { SpeechRecognizerModule.destroy(); } catch (_) {}
      }
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // ── Error helpers ──────────────────────────────────────────────
  const showVoiceError = (msg) => {
    setVoiceError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setVoiceError(null), 4000);
  };

  const clearVoiceError = () => {
    setVoiceError(null);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  };

  // ── startListening ─────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (Platform.OS !== 'android') {
      showVoiceError('Voice typing is only available on Android.');
      return;
    }

    if (!SpeechRecognizerModule) {
      showVoiceError('Voice recognition module is not available on this build.');
      return;
    }

    // 1. Check RECORD_AUDIO permission
    let permissionStatus;
    try {
      permissionStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'Field Assistant needs microphone access to convert your speech into a chat message.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );
    } catch (e) {
      showVoiceError('Could not request microphone permission.');
      return;
    }

    if (permissionStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showVoiceError(
        'Microphone permission is permanently denied. Please enable it in Android Settings to use voice typing.'
      );
      return;
    }

    if (permissionStatus !== PermissionsAndroid.RESULTS.GRANTED) {
      showVoiceError('Microphone permission is required for voice typing.');
      return;
    }

    // 2. Check on-device recognizer availability
    await new Promise((resolve) => {
      SpeechRecognizerModule.isAvailable((err, available) => {
        if (err || !available) {
          showVoiceError('Offline voice typing is not available on this device.');
          resolve(false);
          return;
        }
        resolve(true);
      });
    }).then((ok) => {
      if (!ok) return;
      // 3. Start recognition
      setMicState(MicState.LISTENING);
      clearVoiceError();
      try {
        SpeechRecognizerModule.start(locale);
      } catch (e) {
        setMicState(MicState.IDLE);
        showVoiceError('Could not start voice recognition. Please try again.');
      }
    });
  }, [locale]);

  // ── stopListening ──────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (!SpeechRecognizerModule) return;
    try { SpeechRecognizerModule.stop(); } catch (_) {}
  }, []);

  // ── cancelListening ────────────────────────────────────────────
  const cancelListening = useCallback(() => {
    if (!SpeechRecognizerModule) return;
    try {
      SpeechRecognizerModule.cancel();
      setMicState(MicState.IDLE);
    } catch (_) {}
  }, []);

  // ── destroyRecognizer ──────────────────────────────────────────
  const destroyRecognizer = useCallback(() => {
    if (!SpeechRecognizerModule) return;
    try { SpeechRecognizerModule.destroy(); } catch (_) {}
    setMicState(MicState.IDLE);
  }, []);

  return {
    micState,
    voiceError,
    startListening,
    stopListening,
    cancelListening,
    destroyRecognizer,
  };
}
