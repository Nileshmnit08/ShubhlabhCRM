import React from 'react';
import { Search, X, Clock } from 'lucide-react';
import { getInitials } from './utils/formatters';

/**
 * StaffSearchModal
 *
 * Modal to select a staff member and start a 1:1 conversation.
 * Displays existing conversations indicator.
 */
export default function StaffSearchModal({
  show,
  onClose,
  staffList,
  staffSearch,
  setStaffSearch,
  startingChat,
  onStartChat,
  conversations,
}) {
  if (!show) return null;

  const filtered = staffList.filter((s) =>
    s.display_name?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="sm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sm-modal glass-panel animate-fade-in">
        {/* Header */}
        <div className="sm-modal-header">
          <div className="sm-modal-title">
            <Search size={16} />
            New Conversation
          </div>
          <button className="sm-modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="sm-modal-search">
          <div className="sm-search-wrap">
            <Search size={14} className="sm-search-icon" />
            <input
              type="text"
              placeholder="Search staff member…"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="sm-search-input"
              autoFocus
            />
          </div>
        </div>

        {/* Staff List */}
        <div className="sm-modal-list">
          {filtered.length === 0 ? (
            <div className="sm-empty-inline">No staff found</div>
          ) : (
            filtered.map((staff) => {
              const hasConv = conversations.some((c) =>
                c.participants.some((p) => p.user_id === staff.id)
              );
              const initials = getInitials(staff.display_name);

              return (
                <button
                  key={staff.id}
                  className={`sm-modal-staff-item ${startingChat ? 'sm-modal-staff-item--disabled' : ''}`}
                  onClick={() => !startingChat && onStartChat(staff)}
                  disabled={startingChat}
                >
                  <div className="sm-avatar sm-avatar--sm">{initials}</div>
                  <div className="sm-modal-staff-info">
                    <div className="sm-modal-staff-name">{staff.display_name}</div>
                    <div className="sm-modal-staff-meta">
                      {staff.role}
                      {hasConv && (
                        <span className="sm-modal-existing-badge">Existing chat</span>
                      )}
                    </div>
                  </div>
                  {startingChat && <Clock size={14} className="text-muted" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
