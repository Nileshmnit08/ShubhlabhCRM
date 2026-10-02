import { useRef, useCallback, useState } from 'react';

// Using Google STUN servers for standard NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC({ onLocalStream, onRemoteStream, sendSignal, callSessionId, remoteUserId }) {
  const pc = useRef(null);
  const localStream = useRef(null);
  
  const [mediaError, setMediaError] = useState(null);
  const [iceConnectionState, setIceConnectionState] = useState('new');

  const cleanup = useCallback(() => {
    if (pc.current) {
      pc.current.onicecandidate = null;
      pc.current.ontrack = null;
      pc.current.oniceconnectionstatechange = null;
      pc.current.close();
      pc.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    setIceConnectionState('closed');
  }, []);

  const initWebRTC = useCallback(async (callType, isInitiator) => {
    try {
      // 1. Get User Media
      const constraints = {
        audio: true,
        video: callType === 'VIDEO' ? { facingMode: 'user' } : false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      if (onLocalStream) onLocalStream(stream);

      // 2. Initialize RTCPeerConnection
      pc.current = new RTCPeerConnection(ICE_SERVERS);

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.current.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(remoteUserId, {
            type: 'WEBRTC_ICE',
            candidate: event.candidate,
            callSessionId,
          });
        }
      };

      // Handle remote stream
      pc.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (onRemoteStream) onRemoteStream(event.streams[0]);
        }
      };
      
      // Monitor ICE connection state
      pc.current.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.current.iceConnectionState);
        if (pc.current.iceConnectionState === 'failed' || pc.current.iceConnectionState === 'disconnected') {
           // Possible reconnection logic or ending call could happen here
        }
      };

      // 3. Create Offer if Initiator
      if (isInitiator) {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        sendSignal(remoteUserId, {
          type: 'WEBRTC_OFFER',
          offer,
          callSessionId,
        });
      }

      return true;
    } catch (err) {
      console.error('WebRTC Init Error:', err);
      setMediaError(err.message || 'Failed to access media devices.');
      cleanup();
      return false;
    }
  }, [remoteUserId, callSessionId, sendSignal, onLocalStream, onRemoteStream, cleanup]);

  const handleOffer = useCallback(async (offer) => {
    if (!pc.current) return;
    try {
      await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      sendSignal(remoteUserId, {
        type: 'WEBRTC_ANSWER',
        answer,
        callSessionId,
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [remoteUserId, callSessionId, sendSignal]);

  const handleAnswer = useCallback(async (answer) => {
    if (!pc.current) return;
    try {
      await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    if (!pc.current) return;
    try {
      await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  }, []);
  
  const toggleAudio = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);
  
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  return {
    initWebRTC,
    cleanup,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    mediaError,
    iceConnectionState,
    toggleAudio,
    toggleVideo
  };
}
