import React, { useState } from 'react';
import { MessageSquare, X, Maximize2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import StaffMessagesUI from '../pages/StaffMessages/StaffMessagesUI';

export default function FloatingStaffMessages({ sm, isAuthorized }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthorized) return null;

  // Don't show floating FAB if we are actually ON the full StaffMessages page
  if (location.pathname === '/staff-messages') {
    return null;
  }

  const totalUnread = 
    (sm.unreadCountByType?.TEAM || 0) + 
    (sm.unreadCountByType?.ADMIN_STAFF || 0) + 
    (sm.unreadCountByType?.DIRECT_CHAT || 0);

  return (
    <>
      {/* FAB */}
      <button 
        className="floating-comm-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open Communication"
      >
        <MessageSquare size={24} color="#fff" />
        {totalUnread > 0 && (
          <span className="floating-comm-badge">{totalUnread}</span>
        )}
      </button>

      {/* Floating Panel */}
      <div className={`floating-comm-panel ${isOpen ? 'open' : ''} chat-inverse-theme`}>
        <div className="floating-comm-header">
          <div className="floating-comm-title">
            <MessageSquare size={16} style={{ marginRight: '0.5rem' }} />
            Communication
          </div>
          <div className="floating-comm-actions">
            <button 
              className="btn-icon" 
              title="Open Full Communication"
              onClick={() => {
                setIsOpen(false);
                navigate('/staff-messages');
              }}
            >
              <Maximize2 size={16} />
            </button>
            <button 
              className="btn-icon" 
              title="Close"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="floating-comm-body">
          {/* We force isMobile to true so the 400px panel correctly behaves as a single pane */}
          <StaffMessagesUI sm={{ ...sm, isMobile: true }} isFloating={true} />
        </div>
      </div>
    </>
  );
}
