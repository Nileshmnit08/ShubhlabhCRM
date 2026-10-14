/**
 * CallContext.js
 * Mobile equivalent of the web CallProvider.
 * Handles signaling via Supabase Broadcast, WebRTC peer connection,
 * and call state machine for the Staff mobile app.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const { AudioRouteModule } = NativeModules;

export const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { 
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

const logWebRTCState = (pc, operation, details = {}) => {
  if (!pc) return;
  console.log(`[WEBRTC_DIAGNOSTIC] ${operation}`, {
    signalingState: pc.signalingState,
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    localDescriptionPresent: !!pc.localDescription,
    localDescriptionType: pc.localDescription?.type,
    remoteDescriptionPresent: !!pc.remoteDescription,
    remoteDescriptionType: pc.remoteDescription?.type,
    ...details
  });
};

export const CallProvider = ({ children }) => {
  const { session, staffProfile } = useAuth();
  const userId = session?.user?.id;

  // ─── Call State Machine ────────────────────────────────────────────
  // IDLE | INITIATING | RINGING | ACCEPTED | CONNECTING | CONNECTED | FAILED | ENDED
  const [callState, setCallState] = useState('IDLE');
  const [currentSession, setCurrentSession] = useState(null); // { id }
  const [remoteUser, setRemoteUser] = useState(null); // { id, name, role }
  const [callType, setCallType] = useState('AUDIO'); // AUDIO | VIDEO
  const [isIncoming, setIsIncoming] = useState(false);
  const [failureReason, setFailureReason] = useState(null);

  // ─── WebRTC State ─────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
  const [remoteTrackCount, setRemoteTrackCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // ─── Audio Routing ────────────────────────────────────────────────
  const configureAudioMode = useCallback(async (speaker) => {
    if (Platform.OS === 'android' && AudioRouteModule) {
      try {
        await AudioRouteModule.setSpeakerphoneOn(speaker);
      } catch (e) {
        console.warn('[Call] Native AudioRouteModule error:', e);
      }
    } else {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldRouteThroughEarpiece: !speaker, // for iOS
        });
      } catch (e) {
        console.warn('[Call] Failed to set iOS audio mode:', e);
      }
    }
  }, []);

  // Configure audio when call state or speaker state changes
  useEffect(() => {
    if (callState === 'IDLE') return;
    configureAudioMode(isSpeakerOn);
  }, [isSpeakerOn, callState, configureAudioMode]);

  // ─── Refs (avoid stale closures) ──────────────────────────────────
  const stateRef = useRef('IDLE');
  const sessionRef = useRef(null);
  const remoteUserRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const sendSignalRef = useRef(null);
  const durationTimerRef = useRef(null);
  const initiatingTimeoutRef = useRef(null);
  const ringingTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const disconnectTimeoutRef = useRef(null);
  const autoResetTimeoutRef = useRef(null);
  const inboundChannelRef = useRef(null);
  const outboundChannelsRef = useRef({});
  const pendingIceCandidatesRef = useRef([]);
  const switchingCameraRef = useRef(false);
  const callTypeRef = useRef('AUDIO');
  const isIncomingRef = useRef(false);
  const callDurationRef = useRef(0);
  const connectedAtRef = useRef(null);

  useEffect(() => { stateRef.current = callState; }, [callState]);
  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { remoteUserRef.current = remoteUser; }, [remoteUser]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { isIncomingRef.current = isIncoming; }, [isIncoming]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  // ─── Duration Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'CONNECTED') {
      if (!connectedAtRef.current) connectedAtRef.current = Date.now();
      durationTimerRef.current = setInterval(() => {
        setCallDuration(s => s + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (callState === 'IDLE') {
        setCallDuration(0);
        callDurationRef.current = 0;
        connectedAtRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // ─── Cleanup Resources ─────────────────────────────────────────────
  const clearAllTimeouts = useCallback(() => {
    if (initiatingTimeoutRef.current) {
      clearTimeout(initiatingTimeoutRef.current);
      initiatingTimeoutRef.current = null;
    }
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setHasRemoteVideo(false);
    setIsRemoteCameraOff(false);
    setRemoteTrackCount(0);
    setIsReconnecting(false);
    setIsMuted(false);
    setIsCameraOff(false);
    pendingIceCandidatesRef.current = [];

    if (Platform.OS === 'android' && AudioRouteModule) {
      AudioRouteModule.stopCallAudio().catch(() => {});
    }

    // Cleanup outbound channels
    Object.values(outboundChannelsRef.current).forEach(cs => {
      if (cs.channel) supabase.removeChannel(cs.channel);
    });
    outboundChannelsRef.current = {};
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  const resetCall = useCallback(() => {
    cleanupMedia();
    setCallState('IDLE');
    setCurrentSession(null);
    setRemoteUser(null);
    setIsIncoming(false);
    setIsSpeakerOn(false);
    setCallDuration(0);
    callDurationRef.current = 0;
    connectedAtRef.current = null;
    setFailureReason(null);
  }, [cleanupMedia]);

  const handleCallFailed = useCallback((reason = 'Call Failed', endReasonCode = 'FAILED') => {
    clearAllTimeouts();
    setFailureReason(reason);
    setCallState('FAILED');
    cleanupMedia();

    const session = sessionRef.current;
    if (session) {
      const isWasConnected = stateRef.current === 'CONNECTED';
      const duration = isWasConnected
        ? Math.max(callDurationRef.current, connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0)
        : 0;

      const updateData = {
        status: 'FAILED',
        end_reason: endReasonCode,
        ended_at: new Date().toISOString(),
      };
      if (isWasConnected) {
        updateData.duration_seconds = duration;
      }

      supabase
        .from('call_sessions')
        .update(updateData)
        .eq('id', session.id)
        .catch(() => {});
    }

    // Retain error status on screen for 2.5s before dismissing cleanly
    autoResetTimeoutRef.current = setTimeout(() => {
      resetCall();
    }, 2500);
  }, [clearAllTimeouts, cleanupMedia, resetCall]);

  // ─── Lifecycle State Timeouts (Truthful Failure Handling) ──────────
  useEffect(() => {
    // 1. Initiating timeout (caller waiting for remote response)
    if (callState === 'INITIATING') {
      initiatingTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'INITIATING') {
          handleCallFailed('User Unavailable', 'NO_ANSWER');
        }
      }, 18000);
    } else if (initiatingTimeoutRef.current) {
      clearTimeout(initiatingTimeoutRef.current);
      initiatingTimeoutRef.current = null;
    }

    // 2. Ringing timeout on caller side (waiting for user to answer)
    if (callState === 'RINGING' && !isIncoming) {
      ringingTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'RINGING') {
          handleCallFailed('No Answer', 'NO_ANSWER');
        }
      }, 35000);
    } else if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    // 3. Handshake/Connecting timeout
    if (callState === 'CONNECTING' || callState === 'ACCEPTED') {
      connectionTimeoutRef.current = setTimeout(() => {
        if (stateRef.current !== 'CONNECTED') {
          handleCallFailed('Connection Failed', 'TIMEOUT');
        }
      }, 25000);
    } else if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, [callState, isIncoming, handleCallFailed]);

  // ─── Send Signal via Supabase Broadcast ───────────────────────────
  const sendSignal = useCallback(async (targetUserId, signalData) => {
    if (!targetUserId || !userId) return;
    const targetChannelName = `call_signals:${targetUserId}`;
    const payload = {
      type: 'broadcast',
      event: 'call_event',
      payload: { ...signalData, senderId: userId },
    };

    let channelState = outboundChannelsRef.current[targetUserId];
    if (!channelState) {
      const channel = supabase.channel(targetChannelName);
      channelState = { channel, status: 'JOINING', queue: [payload] };
      outboundChannelsRef.current[targetUserId] = channelState;
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelState.status = 'SUBSCRIBED';
          channelState.queue.forEach(msg => channel.send(msg));
          channelState.queue = [];
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          delete outboundChannelsRef.current[targetUserId];
        }
      });
    } else {
      if (channelState.status === 'SUBSCRIBED') {
        channelState.channel.send(payload);
      } else {
        channelState.queue.push(payload);
      }
    }
  }, [userId]);

  useEffect(() => { sendSignalRef.current = sendSignal; }, [sendSignal]);

  // ─── WebRTC: Create Peer Connection ───────────────────────────────
  const createPeerConnection = useCallback(() => {
    let RTCPeerConnection;
    try {
      RTCPeerConnection = require('react-native-webrtc').RTCPeerConnection;
    } catch (e) {
      console.error('[Call] react-native-webrtc not available:', e);
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserRef.current) {
        const candidatePayload = event.candidate.toJSON
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            };
        sendSignalRef.current?.(remoteUserRef.current.id, {
          type: 'WEBRTC_ICE',
          callSessionId: sessionRef.current?.id,
          candidate: candidatePayload,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WEBRTC] REMOTE_TRACK_RECEIVED kind=${event.track?.kind}, id=${event.track?.id}`);
      const track = event.track;
      if (track && track.kind === 'video') {
        setHasRemoteVideo(true);
        setIsRemoteCameraOff(!track.enabled);
        track.onmute = () => {
          console.log('[WEBRTC] Remote video track MUTED');
        };
        track.onunmute = () => {
          console.log('[WEBRTC] Remote video track UNMUTED');
          setHasRemoteVideo(true);
          setIsRemoteCameraOff(false);
        };
        track.onended = () => {
          console.log('[WEBRTC] Remote video track ENDED');
          setHasRemoteVideo(false);
        };
      }

      setRemoteTrackCount(c => c + 1);

      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else if (track) {
        setRemoteStream(prev => {
          let MediaStream;
          try { MediaStream = require('react-native-webrtc').MediaStream; } catch (e) { return prev; }
          const s = prev || new MediaStream();
          try { s.addTrack(track); } catch (_) {}
          return s;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setIsReconnecting(false);
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
        setCallState('CONNECTED');
        supabase
          .from('call_sessions')
          .update({ status: 'CONNECTED', connected_at: new Date().toISOString() })
          .eq('id', sessionRef.current?.id)
          .catch(() => {});
      } else if (state === 'disconnected') {
        setIsReconnecting(true);
        // Allow brief network handover before declaring failure
        if (!disconnectTimeoutRef.current) {
          disconnectTimeoutRef.current = setTimeout(() => {
            if (peerConnectionRef.current?.connectionState === 'disconnected') {
              setIsReconnecting(false);
              handleCallFailed('Connection Lost', 'DISCONNECTED');
            }
          }, 8000);
        }
      } else if (state === 'failed' || state === 'closed') {
        setIsReconnecting(false);
        handleCallFailed('Connection Failed', 'FAILED');
      }
    };

    // Keep fallback for older WebRTC implementations
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'failed' || state === 'closed') {
        setIsReconnecting(false);
        handleCallFailed('Connection Failed', 'FAILED');
      } else if (state === 'disconnected') {
        setIsReconnecting(true);
      } else if ((state === 'connected' || state === 'completed') && pc.connectionState !== 'connected') {
        setIsReconnecting(false);
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
        setCallState('CONNECTED');
        supabase
          .from('call_sessions')
          .update({ status: 'CONNECTED', connected_at: new Date().toISOString() })
          .eq('id', sessionRef.current?.id)
          .catch(() => {});
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [handleCallFailed]);

  // ─── Get Media Stream ─────────────────────────────────────────────
  const getLocalStream = useCallback(async (withVideo) => {
    let mediaDevices;
    try {
      mediaDevices = require('react-native-webrtc').mediaDevices;
    } catch (e) {
      console.error('[Call] react-native-webrtc not available:', e);
      return null;
    }

    if (Platform.OS === 'android') {
      try {
        const perms = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (withVideo) {
          perms.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        }
        const granted = await PermissionsAndroid.requestMultiple(perms);
        const audioOk = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const cameraOk = !withVideo || granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        if (!audioOk || !cameraOk) {
          console.warn('[Call] Required media permissions denied by user');
          return null;
        }
      } catch (pErr) {
        console.warn('[Call] Permission check exception:', pErr);
        return null;
      }
    }

    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
      };

      const stream = await mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: withVideo
          ? { facingMode: 'user', width: 640, height: 480 }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      stream.getTracks().forEach(track => {
        console.log(`[WEBRTC] LOCAL_${track.kind.toUpperCase()}_TRACK_ADDED id=${track.id}`);
      });
      return stream;
    } catch (err) {
      console.error('[Call] getUserMedia error:', err);
      return null;
    }
  }, []);

  // ─── Incoming Signal Handler ──────────────────────────────────────
  const handleSignal = useCallback(async (payload) => {
    const { type, callSessionId, senderId, senderName, senderRole, callType: cType, offer, answer, candidate } = payload;
    const currentState = stateRef.current;
    const session = sessionRef.current;
    const effectiveCallType = cType || callTypeRef.current || 'AUDIO';

    // Busy guard
    if (type === 'CALL_INITIATED' && currentState !== 'IDLE') {
      sendSignalRef.current?.(senderId, { type: 'CALL_BUSY', callSessionId });
      return;
    }

    // Ignore signals from different sessions when active
    if (currentState !== 'IDLE' && session && callSessionId !== session.id) return;

    switch (type) {
      case 'CALL_INITIATED': {
        callTypeRef.current = effectiveCallType;
        setCallType(effectiveCallType);
        setRemoteUser({ id: senderId, name: senderName, role: senderRole });
        setIsSpeakerOn(effectiveCallType === 'VIDEO');
        setCurrentSession({ id: callSessionId });
        setIsIncoming(true);
        setCallState('RINGING');
        // Notify caller we are ringing
        sendSignalRef.current?.(senderId, {
          type: 'CALL_RINGING',
          callSessionId,
          callType: effectiveCallType,
        });
        break;
      }

      case 'CALL_RINGING':
        // Caller transitions from INITIATING to RINGING
        if (stateRef.current === 'INITIATING') {
          setCallState('RINGING');
        }
        break;

      case 'CALL_CANCELLED':
        if (currentState === 'RINGING' || currentState === 'INITIATING') {
          resetCall();
        }
        break;

      case 'CALL_ACCEPTED':
        if (currentState === 'INITIATING' || currentState === 'RINGING') {
          setCallState('ACCEPTED');
          if (cType) {
            callTypeRef.current = cType;
            setCallType(cType);
          }
          const callWithVideo = (cType || callTypeRef.current) === 'VIDEO';
          if (Platform.OS === 'android' && AudioRouteModule) {
            AudioRouteModule.startCallAudio(callWithVideo).catch(() => {});
          }
          if (!isIncomingRef.current) {
            (async () => {
              const pc = createPeerConnection();
              if (!pc) {
                handleCallFailed('Media Engine Error', 'FAILED');
                return;
              }
              const stream = await getLocalStream(callWithVideo);
              if (!stream) {
                sendSignalRef.current?.(senderId, {
                  type: 'CALL_CANCELLED',
                  callSessionId: session?.id,
                });
                handleCallFailed('Permission Denied', 'PERMISSION_DENIED');
                return;
              }
              stream.getTracks().forEach(track => pc.addTrack(track, stream));

              try {
                console.log('[WEBRTC] OFFER_CREATED withVideo=' + callWithVideo);
                const offerDesc = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: callWithVideo,
                });
                await pc.setLocalDescription(offerDesc);
                logWebRTCState(pc, 'setLocalDescription(offer)');

                sendSignalRef.current?.(senderId, {
                  type: 'WEBRTC_OFFER',
                  callSessionId: session?.id,
                  callType: callWithVideo ? 'VIDEO' : 'AUDIO',
                  offer: offerDesc,
                });
                console.log('[WEBRTC] OFFER_SENT');
                setCallState('CONNECTING');
              } catch (e) {
                console.error('[WEBRTC] Error creating offer:', e);
                handleCallFailed('Connection Failed', 'FAILED');
              }
            })();
          }
        }
        break;

      case 'CALL_REJECTED':
        if (stateRef.current === 'INITIATING' || stateRef.current === 'RINGING' || stateRef.current === 'CONNECTING') {
          handleCallFailed('Call Declined', 'REJECTED');
        }
        break;

      case 'CALL_BUSY':
        if (stateRef.current === 'INITIATING' || stateRef.current === 'RINGING') {
          handleCallFailed('User Busy', 'BUSY');
        }
        break;

      case 'CALL_MISSED':
        if (stateRef.current === 'INITIATING' || stateRef.current === 'RINGING') {
          handleCallFailed('No Answer', 'MISSED');
        }
        break;

      case 'WEBRTC_OFFER': {
        console.log('[WEBRTC] OFFER_RECEIVED');
        if (!offer || !offer.type || !offer.sdp) {
          console.error('[WEBRTC] Invalid OFFER payload', { type: offer?.type });
          break;
        }

        if (cType) {
          callTypeRef.current = cType;
          setCallType(cType);
        }
        const callWithVideo = (cType || callTypeRef.current) === 'VIDEO';

        const pc = createPeerConnection();
        if (!pc) break;
        const stream = await getLocalStream(callWithVideo);
        if (!stream) {
          sendSignalRef.current?.(remoteUserRef.current?.id, {
            type: 'CALL_CANCELLED',
            callSessionId: sessionRef.current?.id,
          });
          handleCallFailed('Permission Denied', 'PERMISSION_DENIED');
          break;
        }
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        try {
          const RTCSessionDescription = require('react-native-webrtc').RTCSessionDescription;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('[WEBRTC] REMOTE_DESCRIPTION_SET (offer)');
          logWebRTCState(pc, 'setRemoteDescription(offer)');

          // Flush queued ICE candidates
          if (pendingIceCandidatesRef.current.length > 0) {
            console.log(`[WEBRTC] Flushing ${pendingIceCandidatesRef.current.length} queued ICE candidates`);
            for (const cand of pendingIceCandidatesRef.current) {
              await pc.addIceCandidate(cand);
            }
            pendingIceCandidatesRef.current = [];
          }

          console.log('[WEBRTC] ANSWER_CREATED withVideo=' + callWithVideo);
          const answerDesc = await pc.createAnswer();
          await pc.setLocalDescription(answerDesc);
          logWebRTCState(pc, 'setLocalDescription(answer)');

          sendSignalRef.current?.(remoteUserRef.current?.id, {
            type: 'WEBRTC_ANSWER',
            callSessionId: sessionRef.current?.id,
            callType: callWithVideo ? 'VIDEO' : 'AUDIO',
            answer: answerDesc,
          });
          console.log('[WEBRTC] ANSWER_SENT');
          setCallState('CONNECTING');
        } catch (e) {
          console.error('[WEBRTC] Error processing offer / creating answer:', e);
          handleCallFailed('Connection Failed', 'FAILED');
        }
        break;
      }

      case 'WEBRTC_ANSWER': {
        console.log('[WEBRTC] ANSWER_RECEIVED');
        if (!answer || !answer.type || !answer.sdp) {
          console.error('[WEBRTC] Invalid ANSWER payload', { type: answer?.type });
          break;
        }

        if (cType) {
          callTypeRef.current = cType;
          setCallType(cType);
        }

        const pc2 = peerConnectionRef.current;
        if (!pc2) break;
        
        try {
          const RTCSessionDescription2 = require('react-native-webrtc').RTCSessionDescription;
          await pc2.setRemoteDescription(new RTCSessionDescription2(answer));
          console.log('[WEBRTC] REMOTE_DESCRIPTION_SET (answer)');
          logWebRTCState(pc2, 'setRemoteDescription(answer)');

          // Flush queued ICE candidates
          if (pendingIceCandidatesRef.current.length > 0) {
            console.log(`[WEBRTC] Flushing ${pendingIceCandidatesRef.current.length} queued ICE candidates`);
            for (const cand of pendingIceCandidatesRef.current) {
              await pc2.addIceCandidate(cand);
            }
            pendingIceCandidatesRef.current = [];
          }
        } catch (e) {
          console.error('[WEBRTC] Error processing answer:', e);
          handleCallFailed('Connection Failed', 'FAILED');
        }
        break;
      }

      case 'WEBRTC_ICE': {
        const pc3 = peerConnectionRef.current;
        if (!pc3 || !candidate) break;
        
        try {
          const RTCIceCandidate = require('react-native-webrtc').RTCIceCandidate;
          const iceCandidate = new RTCIceCandidate(candidate);

          if (!pc3.remoteDescription) {
            console.log('[WEBRTC] Queuing ICE candidate (remoteDescription is null)');
            pendingIceCandidatesRef.current.push(iceCandidate);
          } else {
            await pc3.addIceCandidate(iceCandidate);
          }
        } catch (e) {
          console.warn('[WEBRTC] addIceCandidate error:', e);
        }
        break;
      }

      case 'CAMERA_STATE_CHANGED':
        console.log('[WEBRTC] Remote camera state changed: isCameraOff =', payload.isCameraOff);
        setIsRemoteCameraOff(!!payload.isCameraOff);
        break;

      case 'CALL_ENDED':
        resetCall();
        break;

      default:
        break;
    }
  }, [createPeerConnection, getLocalStream, handleCallFailed, resetCall]);

  const handleSignalRef = useRef(handleSignal);
  useEffect(() => { handleSignalRef.current = handleSignal; }, [handleSignal]);

  // ─── Subscribe to Signaling Channel ───────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channelName = `call_signals:${userId}`;
    const channel = supabase.channel(channelName);
    channel
      .on('broadcast', { event: 'call_event' }, (event) => {
        handleSignalRef.current(event.payload);
      })
      .subscribe();

    inboundChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      inboundChannelRef.current = null;
    };
  }, [userId]);

  // ─── Initiate Call ─────────────────────────────────────────────────
  const initiateCall = useCallback(async (targetUser, type) => {
    if (stateRef.current !== 'IDLE') return;

    callTypeRef.current = type;
    setCallType(type);
    setCallState('INITIATING');
    setRemoteUser(targetUser);
    setIsSpeakerOn(type === 'VIDEO');
    setIsIncoming(false);

    if (Platform.OS === 'android' && AudioRouteModule) {
      AudioRouteModule.startCallAudio(type === 'VIDEO').catch(() => {});
    }

    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        caller_id: userId,
        receiver_id: targetUser.id,
        call_type: type,
        status: 'INITIATING'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create call session', error);
      resetCall();
      return;
    }

    setCurrentSession(data);
    
    sendSignalRef.current?.(targetUser.id, {
      type: 'CALL_INITIATED',
      callSessionId: data.id,
      callType: type,
      senderName: staffProfile?.full_name || session?.user?.user_metadata?.full_name || 'Staff',
      senderRole: staffProfile?.role || 'Staff'
    });
  }, [userId, staffProfile, session, resetCall]);

  const cancelCall = useCallback(async () => {
    if (stateRef.current !== 'RINGING' && stateRef.current !== 'INITIATING') return;
    const session = sessionRef.current;
    const remote = remoteUserRef.current;

    if (session) {
      await supabase
        .from('call_sessions')
        .update({ status: 'CANCELLED', end_reason: 'CANCELLED', ended_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    sendSignalRef.current?.(remote?.id, {
      type: 'CALL_CANCELLED',
      callSessionId: session?.id,
    });

    resetCall();
  }, [resetCall]);

  // ─── Accept Call ───────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (stateRef.current !== 'RINGING') return;
    const session = sessionRef.current;
    const remote = remoteUserRef.current;
    if (!session || !remote) return;

    setCallState('ACCEPTED');

    if (Platform.OS === 'android' && AudioRouteModule) {
      AudioRouteModule.startCallAudio(callTypeRef.current === 'VIDEO').catch(() => {});
    }

    // Update DB
    await supabase
      .from('call_sessions')
      .update({ status: 'ACCEPTED', answered_at: new Date().toISOString() })
      .eq('id', session.id);

    // Signal caller we accepted
    sendSignalRef.current?.(remote.id, {
      type: 'CALL_ACCEPTED',
      callSessionId: session.id,
      callType: callTypeRef.current,
    });
    // Wait for WEBRTC_OFFER from the caller
  }, [resetCall]);

  // ─── Reject Call ───────────────────────────────────────────────────
  const rejectCall = useCallback(async () => {
    const session = sessionRef.current;
    const remote = remoteUserRef.current;
    if (!session) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'REJECTED', end_reason: 'REJECTED', ended_at: new Date().toISOString() })
      .eq('id', session.id);

    sendSignalRef.current?.(remote?.id, {
      type: 'CALL_REJECTED',
      callSessionId: session.id,
    });

    resetCall();
  }, [resetCall]);

  // ─── End Call ─────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const session = sessionRef.current;
    const remote = remoteUserRef.current;
    const currentState = stateRef.current;

    if (session) {
      const isPreConnect = currentState === 'INITIATING' || currentState === 'RINGING';
      const wasConnected = !isPreConnect && (currentState === 'CONNECTED' || currentState === 'ACCEPTED' || currentState === 'CONNECTING');
      const status = isPreConnect ? 'CANCELLED' : 'ENDED';
      const duration = wasConnected
        ? Math.max(callDurationRef.current, connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0)
        : 0;
      const updateData = {
        status,
        end_reason: isPreConnect ? 'CANCELLED' : 'USER_ENDED',
        ended_at: new Date().toISOString(),
      };
      if (wasConnected) updateData.duration_seconds = duration;
      await supabase
        .from('call_sessions')
        .update(updateData)
        .eq('id', session.id);
    }

    sendSignalRef.current?.(remote?.id, {
      type: currentState === 'INITIATING' || currentState === 'RINGING' ? 'CALL_CANCELLED' : 'CALL_ENDED',
      callSessionId: session?.id,
    });

    resetCall();
  }, [resetCall]);

  // ─── Mute / Camera / Switch ────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const isOff = !videoTrack.enabled;
      setIsCameraOff(isOff);
      if (remoteUserRef.current) {
        sendSignalRef.current?.(remoteUserRef.current.id, {
          type: 'CAMERA_STATE_CHANGED',
          callSessionId: sessionRef.current?.id,
          isCameraOff: isOff,
        });
      }
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (switchingCameraRef.current) {
      console.log('[WEBRTC_DIAGNOSTIC] CAMERA_SWITCH_IGNORED_BUSY (CallId: ' + sessionRef.current?.id + ')');
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && videoTrack._switchCamera) {
      console.log('[WEBRTC_DIAGNOSTIC] CAMERA_SWITCH_REQUEST');
      switchingCameraRef.current = true;
      setIsSwitchingCamera(true);
      console.log('[WEBRTC_DIAGNOSTIC] CAMERA_SWITCH_START');
      try {
        await videoTrack._switchCamera();
        setIsFrontCamera(prev => !prev);
        console.log('[WEBRTC_DIAGNOSTIC] CAMERA_SWITCH_SUCCESS');
      } catch (error) {
        console.error('[WEBRTC_DIAGNOSTIC] CAMERA_SWITCH_FAILED:', error);
      } finally {
        switchingCameraRef.current = false;
        setIsSwitchingCamera(false);
        console.log('[WEBRTC_DIAGNOSTIC] CAMERA_SWITCH_END');
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => {
      const next = !prev;
      if (Platform.OS === 'android' && AudioRouteModule) {
        AudioRouteModule.setSpeakerphoneOn(next).catch(() => {});
      }
      return next;
    });
  }, []);

  // ─── Missed Call Timer (30s on receiver side) ──────────────────────
  const missedTimerRef = useRef(null);
  useEffect(() => {
    if (callState === 'RINGING' && isIncoming) {
      missedTimerRef.current = setTimeout(async () => {
        const session = sessionRef.current;
        const remote = remoteUserRef.current;
        if (stateRef.current === 'RINGING' && session) {
          await supabase
            .from('call_sessions')
            .update({ status: 'MISSED', end_reason: 'MISSED', ended_at: new Date().toISOString() })
            .eq('id', session.id);
          sendSignalRef.current?.(remote?.id, {
            type: 'CALL_MISSED',
            callSessionId: session.id,
          });
          resetCall();
        }
      }, 30000);
    } else {
      if (missedTimerRef.current) {
        clearTimeout(missedTimerRef.current);
        missedTimerRef.current = null;
      }
    }
    return () => {
      if (missedTimerRef.current) clearTimeout(missedTimerRef.current);
    };
  }, [callState, isIncoming, resetCall]);

  const value = {
    callState,
    currentSession,
    remoteUser,
    callType,
    isIncoming,
    failureReason,
    localStream,
    remoteStream,
    hasRemoteVideo,
    isRemoteCameraOff,
    remoteTrackCount,
    isReconnecting,
    isMuted,
    isCameraOff,
    isFrontCamera,
    isSpeakerOn,
    callDuration,
    initiateCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    isSwitchingCamera,
    toggleSpeaker,
    handleCallFailed,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

