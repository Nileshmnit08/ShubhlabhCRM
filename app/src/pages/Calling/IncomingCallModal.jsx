import React, { useContext } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallContext } from './CallProvider';
import './CallingUI.css';

export default function IncomingCallModal() {
  const { callState, callType, remoteUser, isIncoming, acceptCall, rejectCall } = useContext(CallContext);

  if (callState !== 'RINGING' || !isIncoming) {
    return null;
  }

  return (
    <div className="call-overlay">
      <div className="incoming-call-modal">
        <div className="incoming-call-header">
          {callType === 'VIDEO' ? <Video size={24} /> : <Phone size={24} />}
          <span>Incoming {callType === 'VIDEO' ? 'Video' : 'Audio'} Call</span>
        </div>
        
        <div className="incoming-call-body">
          <div className="caller-avatar">
            {remoteUser?.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <h2 className="caller-name">{remoteUser?.name || 'Unknown'}</h2>
          <p className="caller-role">{remoteUser?.role || 'Staff'}</p>
        </div>
        
        <div className="incoming-call-actions">
          <button className="btn-call btn-reject" onClick={rejectCall}>
            <PhoneOff size={24} />
            <span>Reject</span>
          </button>
          
          <button className="btn-call btn-accept" onClick={acceptCall}>
            {callType === 'VIDEO' ? <Video size={24} /> : <Phone size={24} />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
