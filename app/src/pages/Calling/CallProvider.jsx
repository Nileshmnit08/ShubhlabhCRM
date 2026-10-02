import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useSignaling } from './hooks/useSignaling';

export const CallContext = createContext(null);

// States: IDLE | INITIATING | RINGING | ACCEPTED | CONNECTING | CONNECTED | ENDED
export function CallProvider({ children, userProfile }) {
  const [callState, setCallState] = useState('IDLE');
  const [currentSession, setCurrentSession] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null); // { id, name, role }
  const [callType, setCallType] = useState('AUDIO');
  const [isIncoming, setIsIncoming] = useState(false);

  // We need to use refs for callbacks to have latest state without re-rendering signaling
  const stateRef = useRef(callState);
  const sessionRef = useRef(currentSession);
  useEffect(() => { stateRef.current = callState; }, [callState]);
  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  
  // Audio Ringtone Ref
  const ringtoneRef = useRef(null);
  
  const playRingtone = useCallback(() => {
    // Basic ringtone implementation
    if (!ringtoneRef.current) {
      const audio = new Audio('/ringtone.mp3'); // We'll assume a generic ringtone or generate a basic beep
      audio.loop = true;
      ringtoneRef.current = audio;
    }
    ringtoneRef.current.play().catch(e => console.warn('Audio play blocked:', e));
  }, []);
  
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // WebRTC Signals
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [incomingAnswer, setIncomingAnswer] = useState(null);
  const [incomingIceCandidates, setIncomingIceCandidates] = useState([]);

  const resetCall = useCallback(() => {
    setCallState('IDLE');
    setCurrentSession(null);
    setRemoteUser(null);
    setIncomingOffer(null);
    setIncomingAnswer(null);
    setIncomingIceCandidates([]);
    setIsIncoming(false);
    stopRingtone();
  }, [stopRingtone]);

  // We need a ref to sendSignal to break the circular dependency
  const sendSignalRef = useRef(null);

  // Handle Incoming Signals
  const handleSignal = useCallback((payload) => {
    const currentState = stateRef.current;
    const session = sessionRef.current;
    
    // Basic state machine validation
    const { type, callSessionId, senderId, senderName, senderRole, callType: cType, offer, answer, candidate } = payload;
    
    // Ignore signals if we are busy in another call
    if (type === 'CALL_INITIATED' && currentState !== 'IDLE') {
      sendSignalRef.current?.(senderId, { type: 'CALL_BUSY', callSessionId });
      return;
    }

    if (currentState !== 'IDLE' && session && callSessionId !== session.id) {
       // Ignore signals from other sessions if active
       return;
    }

    switch (type) {
      case 'CALL_INITIATED':
        setRemoteUser({ id: senderId, name: senderName, role: senderRole });
        setCallType(cType);
        setCurrentSession({ id: callSessionId });
        setIsIncoming(true);
        setCallState('RINGING');
        playRingtone();
        
        // Let caller know we are ringing
        sendSignalRef.current?.(senderId, { type: 'CALL_RINGING', callSessionId });
        break;
        
      case 'CALL_RINGING':
        if (currentState === 'INITIATING') {
          setCallState('RINGING');
        }
        break;

      case 'CALL_ACCEPTED':
        if (currentState === 'RINGING' || currentState === 'INITIATING') {
          setCallState('ACCEPTED');
          stopRingtone();
        }
        break;

      case 'CALL_REJECTED':
      case 'CALL_CANCELLED':
      case 'CALL_BUSY':
        resetCall();
        break;

      case 'WEBRTC_OFFER':
        setIncomingOffer(offer);
        break;

      case 'WEBRTC_ANSWER':
        setIncomingAnswer(answer);
        break;

      case 'WEBRTC_ICE':
        setIncomingIceCandidates(prev => [...prev, candidate]);
        break;
        
      case 'CALL_ENDED':
        resetCall();
        break;
        
      default:
        break;
    }
  }, [playRingtone, stopRingtone, resetCall]);

  const { sendSignal } = useSignaling(userProfile?.id, handleSignal);
  
  useEffect(() => {
    sendSignalRef.current = sendSignal;
  }, [sendSignal]);

  const initiateCall = useCallback(async (targetUser, type) => {
    if (callState !== 'IDLE') return;

    setCallState('INITIATING');
    setRemoteUser(targetUser);
    setCallType(type);
    setIsIncoming(false);

    // Create session in DB
    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        caller_id: userProfile.id,
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
    
    // Signal receiver
    sendSignal(targetUser.id, {
      type: 'CALL_INITIATED',
      callSessionId: data.id,
      callType: type,
      senderName: userProfile.full_name || 'Admin',
      senderRole: userProfile.role
    });

  }, [callState, userProfile, sendSignal, resetCall]);

  const acceptCall = useCallback(async () => {
    if (callState !== 'RINGING') return;
    
    setCallState('ACCEPTED');
    stopRingtone();
    
    // Update DB
    await supabase.from('call_sessions').update({ status: 'ACCEPTED', answered_at: new Date().toISOString() }).eq('id', currentSession.id);
    
    // Signal caller
    sendSignal(remoteUser.id, {
      type: 'CALL_ACCEPTED',
      callSessionId: currentSession.id
    });
  }, [callState, currentSession, remoteUser, sendSignal, stopRingtone]);

  const rejectCall = useCallback(async () => {
    if (callState !== 'RINGING') return;
    
    // Update DB
    await supabase.from('call_sessions').update({ status: 'REJECTED', end_reason: 'REJECTED', ended_at: new Date().toISOString() }).eq('id', currentSession.id);
    
    sendSignal(remoteUser.id, {
      type: 'CALL_REJECTED',
      callSessionId: currentSession.id
    });
    
    resetCall();
  }, [callState, currentSession, remoteUser, sendSignal, resetCall]);
  
  const cancelCall = useCallback(async () => {
    if (callState !== 'RINGING' && callState !== 'INITIATING') return;
    
    await supabase.from('call_sessions').update({ status: 'CANCELLED', end_reason: 'CANCELLED', ended_at: new Date().toISOString() }).eq('id', currentSession.id);
    
    sendSignal(remoteUser.id, {
      type: 'CALL_CANCELLED',
      callSessionId: currentSession.id
    });
    
    resetCall();
  }, [callState, currentSession, remoteUser, sendSignal, resetCall]);

  const endCall = useCallback(async () => {
    if (!currentSession) return;
    
    await supabase.from('call_sessions').update({ status: 'ENDED', ended_at: new Date().toISOString() }).eq('id', currentSession.id);
    
    if (remoteUser) {
      sendSignal(remoteUser.id, {
        type: 'CALL_ENDED',
        callSessionId: currentSession.id
      });
    }
    
    resetCall();
  }, [currentSession, remoteUser, sendSignal, resetCall]);
  
  const setConnected = useCallback(async () => {
    setCallState('CONNECTED');
    if (currentSession) {
      await supabase.from('call_sessions').update({ status: 'CONNECTED', connected_at: new Date().toISOString() }).eq('id', currentSession.id);
    }
  }, [currentSession]);

  const contextValue = {
    callState,
    setCallState,
    currentSession,
    remoteUser,
    callType,
    isIncoming,
    initiateCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    sendSignal,
    incomingOffer,
    incomingAnswer,
    incomingIceCandidates,
    setConnected
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
}
