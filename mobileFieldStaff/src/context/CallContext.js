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
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

// STUN/TURN config — use Google public STUN (production should add TURN)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
  const [callDuration, setCallDuration] = useState(0);

  // ─── Refs (avoid stale closures) ──────────────────────────────────
  const stateRef = useRef('IDLE');
  const sessionRef = useRef(null);
  const remoteUserRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const sendSignalRef = useRef(null);
  const durationTimerRef = useRef(null);
  const channelRef = useRef(null);

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
  }, []);

  const resetCall = useCallback(() => {
    cleanupMedia();
    setCallState('IDLE');
    setCurrentSession(null);
    setRemoteUser(null);
    setIsIncoming(false);
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
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('CONNECTED');
        supabase
          .from('call_sessions')
          .update({ status: 'CONNECTED', connected_at: new Date().toISOString() })
          .eq('id', sessionRef.current?.id);
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        resetCall();
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
        setCurrentSession({ id: callSessionId });
        setIsIncoming(true);
        setCallState('RINGING');
        // Notify caller we are ringing
        sendSignalRef.current?.(senderId, { type: 'CALL_RINGING', callSessionId });
        break;
      }

      case 'CALL_CANCELLED':
        if (currentState === 'RINGING') resetCall();
        break;

      case 'WEBRTC_OFFER': {
        // Receiver gets the offer — create answer
        const pc = createPeerConnection();
        if (!pc) break;
        const stream = await getLocalStream(callType === 'VIDEO' || cType === 'VIDEO');
        if (!stream) break;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const RTCSessionDescription = require('react-native-webrtc').RTCSessionDescription;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answerDesc = await pc.createAnswer();
        await pc.setLocalDescription(answerDesc);

        sendSignalRef.current?.(remoteUserRef.current?.id, {
          type: 'WEBRTC_ANSWER',
          callSessionId: sessionRef.current?.id,
          answer: answerDesc,
        });
        setCallState('CONNECTING');
        break;
      }

      case 'WEBRTC_ANSWER': {
        // Caller gets the answer
        const pc2 = peerConnectionRef.current;
        if (!pc2) break;
        const RTCSessionDescription2 = require('react-native-webrtc').RTCSessionDescription;
        await pc2.setRemoteDescription(new RTCSessionDescription2(answer));
        break;
      }

      case 'WEBRTC_ICE': {
        const pc3 = peerConnectionRef.current;
        if (!pc3 || !candidate) break;
        const RTCIceCandidate = require('react-native-webrtc').RTCIceCandidate;
        await pc3.addIceCandidate(new RTCIceCandidate(candidate));
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

    // Get media, create peer connection, send offer
    const withVideo = callType === 'VIDEO';
    const stream = await getLocalStream(withVideo);
    if (!stream) { resetCall(); return; }

    const pc = createPeerConnection();
    if (!pc) { resetCall(); return; }
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // IMPORTANT: The receiver creates the offer (role reversal vs browser WebRTC norms)
    // This is because the web caller has already rendered its UI; mobile staff initiates
    // the actual WebRTC handshake after accepting.
    const offerDesc = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: withVideo,
    });
    await pc.setLocalDescription(offerDesc);

    sendSignalRef.current?.(remote.id, {
      type: 'WEBRTC_OFFER',
      callSessionId: session.id,
      offer: offerDesc,
    });
    setCallState('CONNECTING');
  }, [callType, createPeerConnection, getLocalStream, resetCall]);

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

  const switchCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && videoTrack._switchCamera) {
      videoTrack._switchCamera();
      setIsFrontCamera(prev => !prev);
    }
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
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
