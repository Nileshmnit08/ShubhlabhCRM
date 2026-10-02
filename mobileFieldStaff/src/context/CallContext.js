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
import { AppState, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  // IDLE | RINGING | ACCEPTED | CONNECTING | CONNECTED | ENDED
  const [callState, setCallState] = useState('IDLE');
  const [currentSession, setCurrentSession] = useState(null); // { id }
  const [remoteUser, setRemoteUser] = useState(null); // { id, name, role }
  const [callType, setCallType] = useState('AUDIO'); // AUDIO | VIDEO
  const [isIncoming, setIsIncoming] = useState(false);

  // ─── WebRTC State ─────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // ─── Audio Routing ────────────────────────────────────────────────
  const configureAudioMode = useCallback(async (speaker) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: !speaker, // true = earpiece, false = speaker
        shouldRouteThroughEarpiece: !speaker, // for iOS
      });
    } catch (e) {
      console.warn('[Call] Failed to set audio mode:', e);
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
  const channelRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const switchingCameraRef = useRef(false);

  useEffect(() => { stateRef.current = callState; }, [callState]);
  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { remoteUserRef.current = remoteUser; }, [remoteUser]);

  // ─── Duration Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'CONNECTED') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(s => s + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (callState === 'IDLE') setCallDuration(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // ─── Cleanup Resources ─────────────────────────────────────────────
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
    setIsMuted(false);
    setIsCameraOff(false);
    pendingIceCandidatesRef.current = [];
  }, []);

  const resetCall = useCallback(() => {
    cleanupMedia();
    setCallState('IDLE');
    setCurrentSession(null);
    setRemoteUser(null);
    setIsIncoming(false);
    setIsSpeakerOn(false);
    setCallDuration(0);
  }, [cleanupMedia]);

  // ─── Send Signal via Supabase Broadcast ───────────────────────────
  const sendSignal = useCallback(async (targetUserId, signalData) => {
    if (!targetUserId || !userId) return;
    const targetChannelName = `call_signals:${targetUserId}`;
    const channel = supabase.channel(targetChannelName);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call_event',
          payload: { ...signalData, senderId: userId },
        });
        setTimeout(() => supabase.removeChannel(channel), 600);
      }
    });
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
        sendSignalRef.current?.(remoteUserRef.current.id, {
          type: 'WEBRTC_ICE',
          callSessionId: sessionRef.current?.id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WEBRTC] REMOTE_TRACK_RECEIVED kind=${event.track?.kind}`);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else if (event.track) {
        setRemoteStream(prev => {
          let MediaStream;
          try { MediaStream = require('react-native-webrtc').MediaStream; } catch (e) { return prev; }
          const s = prev || new MediaStream();
          s.addTrack(event.track);
          return s;
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setCallState('CONNECTED');
        supabase
          .from('call_sessions')
          .update({ status: 'CONNECTED', connected_at: new Date().toISOString() })
          .eq('id', sessionRef.current?.id);
      } else if (
        state === 'failed' ||
        state === 'closed'
      ) {
        setCallState('FAILED');
        setTimeout(() => resetCall(), 2000);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [resetCall]);

  // ─── Get Media Stream ─────────────────────────────────────────────
  const getLocalStream = useCallback(async (withVideo) => {
    let mediaDevices;
    try {
      mediaDevices = require('react-native-webrtc').mediaDevices;
    } catch (e) {
      console.error('[Call] react-native-webrtc not available:', e);
      return null;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
          ? { facingMode: 'user', width: 640, height: 480 }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      stream.getTracks().forEach(track => {
        console.log(`[WEBRTC] LOCAL_${track.kind.toUpperCase()}_TRACK_ADDED`);
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

    // Busy guard
    if (type === 'CALL_INITIATED' && currentState !== 'IDLE') {
      sendSignalRef.current?.(senderId, { type: 'CALL_BUSY', callSessionId });
      return;
    }

    // Ignore signals from different sessions when active
    if (currentState !== 'IDLE' && session && callSessionId !== session.id) return;

    switch (type) {
      case 'CALL_INITIATED': {
        setRemoteUser({ id: senderId, name: senderName, role: senderRole });
        setCallType(cType || 'AUDIO');
        setIsSpeakerOn(cType === 'VIDEO');
        setCurrentSession({ id: callSessionId });
        setIsIncoming(true);
        setCallState('RINGING');
        // Notify caller we are ringing
        sendSignalRef.current?.(senderId, { type: 'CALL_RINGING', callSessionId });
        break;
      }

      case 'CALL_CANCELLED':
        if (currentState === 'RINGING' || currentState === 'INITIATING') resetCall();
        break;

      case 'CALL_ACCEPTED':
        if (currentState === 'INITIATING' || currentState === 'RINGING') {
          setCallState('ACCEPTED');
          if (!isIncoming) {
            (async () => {
              const pc = createPeerConnection();
              if (!pc) { resetCall(); return; }
              const withVideo = callType === 'VIDEO' || cType === 'VIDEO';
              const stream = await getLocalStream(withVideo);
              if (!stream) { 
                sendSignalRef.current?.(senderId, {
                  type: 'CALL_CANCELLED',
                  callSessionId: session?.id,
                });
                resetCall(); 
                return; 
              }
              stream.getTracks().forEach(track => pc.addTrack(track, stream));

              try {
                console.log('[WEBRTC] OFFER_CREATED');
                const offerDesc = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: withVideo,
                });
                await pc.setLocalDescription(offerDesc);
                logWebRTCState(pc, 'setLocalDescription(offer)');

                sendSignalRef.current?.(senderId, {
                  type: 'WEBRTC_OFFER',
                  callSessionId: session?.id,
                  offer: offerDesc,
                });
                console.log('[WEBRTC] OFFER_SENT');
                setCallState('CONNECTING');
              } catch (e) {
                console.error('[WEBRTC] Error creating offer:', e);
                resetCall();
              }
            })();
          }
        }
        break;

      case 'CALL_REJECTED':
        if (currentState === 'INITIATING' || currentState === 'RINGING') {
           resetCall();
        }
        break;

      case 'CALL_BUSY':
        if (currentState === 'INITIATING') {
           resetCall();
        }
        break;

      case 'WEBRTC_OFFER': {
        console.log('[WEBRTC] OFFER_RECEIVED');
        if (!offer || !offer.type || !offer.sdp) {
          console.error('[WEBRTC] Invalid OFFER payload', { type: offer?.type });
          break;
        }

        const pc = createPeerConnection();
        if (!pc) break;
        const stream = await getLocalStream(callType === 'VIDEO' || cType === 'VIDEO');
        if (!stream) {
          sendSignalRef.current?.(remoteUserRef.current?.id, {
            type: 'CALL_CANCELLED',
            callSessionId: sessionRef.current?.id,
          });
          resetCall();
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

          console.log('[WEBRTC] ANSWER_CREATED');
          const answerDesc = await pc.createAnswer();
          await pc.setLocalDescription(answerDesc);
          logWebRTCState(pc, 'setLocalDescription(answer)');

          sendSignalRef.current?.(remoteUserRef.current?.id, {
            type: 'WEBRTC_ANSWER',
            callSessionId: sessionRef.current?.id,
            answer: answerDesc,
          });
          console.log('[WEBRTC] ANSWER_SENT');
          setCallState('CONNECTING');
        } catch (e) {
          console.error('[WEBRTC] Error processing offer / creating answer:', e);
        }
        break;
      }

      case 'WEBRTC_ANSWER': {
        console.log('[WEBRTC] ANSWER_RECEIVED');
        if (!answer || !answer.type || !answer.sdp) {
          console.error('[WEBRTC] Invalid ANSWER payload', { type: answer?.type });
          break;
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
        }
        break;
      }

      case 'WEBRTC_ICE': {
        const pc3 = peerConnectionRef.current;
        if (!pc3 || !candidate) break;
        
        const RTCIceCandidate = require('react-native-webrtc').RTCIceCandidate;
        const iceCandidate = new RTCIceCandidate(candidate);

        if (!pc3.remoteDescription) {
          console.log('[WEBRTC] Queuing ICE candidate (remoteDescription is null)');
          pendingIceCandidatesRef.current.push(iceCandidate);
        } else {
          try {
            await pc3.addIceCandidate(iceCandidate);
          } catch (e) {
            console.error('[WEBRTC] addIceCandidate error:', e);
          }
        }
        break;
      }

      case 'CALL_ENDED':
        resetCall();
        break;

      default:
        break;
    }
  }, [callType, createPeerConnection, getLocalStream, resetCall]);

  // ─── Subscribe to Signaling Channel ───────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channelName = `call_signals:${userId}`;
    const channel = supabase.channel(channelName);
    channel
      .on('broadcast', { event: 'call_event' }, (event) => {
        handleSignal(event.payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, handleSignal]);

  // ─── Initiate Call ─────────────────────────────────────────────────
  const initiateCall = useCallback(async (targetUser, type) => {
    if (stateRef.current !== 'IDLE') return;

    setCallState('INITIATING');
    setRemoteUser(targetUser);
    setCallType(type);
    setIsSpeakerOn(type === 'VIDEO');
    setIsIncoming(false);

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

    // Update DB
    await supabase
      .from('call_sessions')
      .update({ status: 'ACCEPTED', answered_at: new Date().toISOString() })
      .eq('id', session.id);

    // Signal caller we accepted
    sendSignalRef.current?.(remote.id, {
      type: 'CALL_ACCEPTED',
      callSessionId: session.id,
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

    if (session) {
      await supabase
        .from('call_sessions')
        .update({ status: 'ENDED', ended_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    sendSignalRef.current?.(remote?.id, {
      type: 'CALL_ENDED',
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
      setIsCameraOff(!videoTrack.enabled);
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
    setIsSpeakerOn(prev => !prev);
  }, []);

  // ─── Missed Call Timer (30s) ───────────────────────────────────────
  const missedTimerRef = useRef(null);
  useEffect(() => {
    if (callState === 'RINGING' && isIncoming) {
      missedTimerRef.current = setTimeout(async () => {
        const session = sessionRef.current;
        if (stateRef.current === 'RINGING' && session) {
          await supabase
            .from('call_sessions')
            .update({ status: 'MISSED', end_reason: 'MISSED', ended_at: new Date().toISOString() })
            .eq('id', session.id);
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
    localStream,
    remoteStream,
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
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
