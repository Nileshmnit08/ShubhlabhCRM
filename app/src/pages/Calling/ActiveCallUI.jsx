import React, { useContext, useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, SwitchCamera, Loader2 } from 'lucide-react';
import { CallContext } from './CallProvider';
import { AuthContext } from '../../AuthContext';
import { useWebRTC } from './hooks/useWebRTC';
import './CallingUI.css';

export default function ActiveCallUI() {
  const { userProfile } = useContext(AuthContext);
  const { 
    callState, 
    callType, 
    remoteUser, 
    isIncoming, 
    cancelCall, 
    endCall,
    currentSession,
    sendSignal,
    incomingOffer,
    incomingAnswer,
    incomingIceCandidates,
    setConnected
  } = useContext(CallContext);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === 'VIDEO');
  const [duration, setDuration] = useState(0);

  const {
    initWebRTC,
    cleanup,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    mediaError,
    iceConnectionState,
    toggleAudio,
    toggleVideo
  } = useWebRTC({
    onLocalStream: (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    },
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setConnected();
    },
    sendSignal,
    callSessionId: currentSession?.id,
    remoteUserId: remoteUser?.id,
  });

  // Handle WebRTC init when ACCEPTED
  useEffect(() => {
    if (callState === 'ACCEPTED' && currentSession) {
      // initiator = !isIncoming
      initWebRTC(callType, !isIncoming);
    }
    
    return () => {
      if (callState === 'ENDED' || callState === 'IDLE') {
        cleanup();
      }
    };
  }, [callState, initWebRTC, cleanup, callType, isIncoming, currentSession]);

  // Process incoming WebRTC signals
  useEffect(() => {
    if (incomingOffer) handleOffer(incomingOffer);
  }, [incomingOffer, handleOffer]);

  useEffect(() => {
    if (incomingAnswer) handleAnswer(incomingAnswer);
  }, [incomingAnswer, handleAnswer]);

  useEffect(() => {
    if (incomingIceCandidates.length > 0) {
      incomingIceCandidates.forEach(handleIceCandidate);
    }
  }, [incomingIceCandidates, handleIceCandidate]);

  // Duration timer
  useEffect(() => {
    let interval;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleToggleAudio = () => {
    setAudioEnabled(toggleAudio());
  };

  const handleToggleVideo = () => {
    if (callType === 'VIDEO') {
      setVideoEnabled(toggleVideo());
    }
  };

  if (callState === 'IDLE' || callState === 'RINGING') {
    return null; // Ringing is handled by IncomingCallModal, unless we are caller
  }
  
  if (isIncoming && callState === 'INITIATING') {
     return null; // Should not happen
  }

  // Caller view before pickup
  const isWaiting = callState === 'INITIATING' || (callState === 'RINGING' && !isIncoming);

  return (
    <div className="active-call-overlay">
      <div className={`active-call-container ${callType === 'AUDIO' ? 'audio-only' : ''}`}>
        
        {/* Remote Video / Audio Info */}
        <div className="remote-media-container">
          {callType === 'VIDEO' && (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="remote-video"
            />
          )}
          
          {(callType === 'AUDIO' || !remoteVideoRef.current?.srcObject) && (
            <div className="call-info-overlay">
              <div className="caller-avatar large">
                {remoteUser?.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <h2 className="caller-name large">{remoteUser?.name || 'Unknown'}</h2>
              <p className="call-status-text">
                {isWaiting ? 'Ringing...' : (callState === 'ACCEPTED' || callState === 'CONNECTING') ? 'Connecting...' : formatDuration(duration)}
              </p>
              {iceConnectionState === 'disconnected' && (
                <p className="call-warning">Connection lost. Reconnecting...</p>
              )}
              {mediaError && (
                <p className="call-error">{mediaError}</p>
              )}
            </div>
          )}
        </div>

        {/* Local Video Preview */}
        {callType === 'VIDEO' && callState !== 'IDLE' && !isWaiting && (
          <div className="local-media-container">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted // always mute local playback
              className="local-video"
            />
          </div>
        )}

        {/* Controls */}
        <div className="call-controls">
          {isWaiting ? (
            <button className="btn-call btn-reject" onClick={cancelCall} title="Cancel Call">
              <PhoneOff size={24} />
            </button>
          ) : (
            <>
              <button 
                className={`btn-call-control ${!audioEnabled ? 'muted' : ''}`} 
                onClick={handleToggleAudio}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                {audioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              
              {callType === 'VIDEO' && (
                <button 
                  className={`btn-call-control ${!videoEnabled ? 'muted' : ''}`} 
                  onClick={handleToggleVideo}
                  title={videoEnabled ? 'Stop Video' : 'Start Video'}
                >
                  {videoEnabled ? <VideoIcon size={22} /> : <VideoOff size={22} />}
                </button>
              )}
              
              <button className="btn-call btn-reject" onClick={endCall} title="End Call">
                <PhoneOff size={24} />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
