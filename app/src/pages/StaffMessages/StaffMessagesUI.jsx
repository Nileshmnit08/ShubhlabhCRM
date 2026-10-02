import React, { useRef, useEffect, useContext } from 'react';
import { AuthContext } from '../../AuthContext';
import { MessageSquare, ChevronLeft, Shield, Info } from 'lucide-react';
import { useStaffMessages } from './hooks/useStaffMessages';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ContextSidebar from './ContextSidebar';
import StaffSearchModal from './StaffSearchModal';
import { getInitials } from './utils/formatters';
import './StaffMessages.css';


/**
 * StaffMessages — Entry point
 *
 * Orchestrates the 3-pane layout:
 *   LEFT:   ConversationList
 *   CENTER: ChatWindow (header + MessageList + MessageComposer)
 *   RIGHT:  ContextSidebar
 *
 * On mobile: single-pane, conversation list slides to chat on selection.
 */
export default function StaffMessagesUI({ sm, isFloating = false }) {
  const { userProfile } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const [showContextPanel, setShowContextPanel] = React.useState(false);

  // Scroll to bottom when messages change or conversation loads
  useEffect(() => {
    if (!sm.messagesLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sm.messages, sm.messagesLoading]);

  // Scroll to bottom when conversation is first loaded (instant)
  useEffect(() => {
    if (!sm.messagesLoading && sm.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [sm.selectedConversationId]);

  // Access guard
  const isAuthorized =
    userProfile?.role === 'Admin' ||
    userProfile?.role === 'Owner' ||
    userProfile?.role === 'Superadmin';

  if (!isAuthorized && !sm.loading) {
    return (
      <div className="sm-access-denied">
        <Shield size={40} className="sm-access-icon" />
        <h2>Access Restricted</h2>
        <p>Staff Messages is available to administrators only.</p>
      </div>
    );
  }

  if (sm.loading) {
    return (
      <div className="sm-page-loading">
        <div className="sm-page-loading-spinner" />
        <div>Loading Staff Messages…</div>
      </div>
    );
  }

  if (sm.error) {
    return (
      <div className="sm-error-state">
        <div className="sm-error-icon">⚠️</div>
        <div className="sm-error-title">{sm.error}</div>
        <button className="btn btn-primary btn-sm" onClick={sm.loadConversations}>
          Retry
        </button>
      </div>
    );
  }

  const activeConv = sm.selectedConversation;
  const staffName = activeConv?.participantNames || '';
  const staffRole = activeConv?.participantRoles || 'Staff';
  const headerInitials = getInitials(staffName);

  // Mobile view: show conversation list OR chat, never both
  const showList = !sm.isMobile || !sm.selectedConversationId;
  const showChat = !sm.isMobile || !!sm.selectedConversationId;

  return (
    <div className={`sm-page ${isFloating ? 'sm-page-floating' : ''}`}>
      {/* Left panel */}
      {showList && (
        <ConversationList
          conversations={sm.conversations}
          filteredConversations={sm.filteredConversations}
          selectedConversationId={sm.selectedConversationId}
          searchQuery={sm.searchQuery}
          setSearchQuery={sm.setSearchQuery}
          globalSearchResults={sm.globalSearchResults}
          globalSearchLoading={sm.globalSearchLoading}
          activeTab={sm.activeTab}
          onTabChange={sm.handleTabChange}
          filterMode={sm.filterMode}
          setFilterMode={sm.setFilterMode}
          unreadCountByType={sm.unreadCountByType}
          currentUserId={userProfile?.id}
          onSelectConversation={sm.loadMessages}
          onSearchResultClick={sm.handleMessageResultClick}
          onStartChat={sm.handleOpenStaffModal}
        />
      )}

      {/* Center + Right panel wrapper */}
      {showChat && (
        <div className="sm-chat-area">
          {!sm.selectedConversationId ? (
            /* Empty / Welcome state */
            <div className="sm-welcome">
              <MessageSquare size={52} className="sm-welcome-icon" />
              <h2 className="sm-welcome-title">Staff Messages</h2>
              <p className="sm-welcome-sub">
                Select a conversation on the left, or start a new one.
              </p>
              <button
                className="btn btn-primary"
                onClick={sm.handleOpenStaffModal}
              >
                + Start Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat panel */}
              <div className="sm-chat-panel">
                {/* ── Chat Header ─────────────────────────── */}
                <div className="sm-chat-header">
                  {sm.isMobile && (
                    <button
                      className="sm-back-btn"
                      onClick={() => sm.handleTabChange(sm.activeTab)}
                      title="Back to conversations"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}

                  <div className="sm-chat-header-avatar">{headerInitials}</div>

                  <div className="sm-chat-header-info">
                    <div className="sm-chat-header-name">{staffName}</div>
                    <div className="sm-chat-header-role">{staffRole}</div>
                  </div>

                  {/* Context toggle button (mobile) */}
                  {sm.isMobile && (
                    <button
                      className="btn-icon sm-ctx-toggle-btn"
                      onClick={() => setShowContextPanel((v) => !v)}
                      title="Staff context"
                    >
                      <Info size={18} />
                    </button>
                  )}
                </div>

                {/* ── Message List ─────────────────────────── */}
                <div className="sm-msg-scroll">
                  <MessageList
                    messages={sm.messages}
                    messagesLoading={sm.messagesLoading}
                    hasMoreMessages={sm.hasMoreMessages}
                    loadingMore={sm.loadingMore}
                    onLoadMore={sm.loadMoreMessages}
                    currentUserId={userProfile?.id}
                    highlightMessageId={sm.highlightMessageId}
                    scrollRef={messagesEndRef}
                  />
                </div>

                {/* ── Composer ─────────────────────────────── */}
                <MessageComposer
                  value={sm.newMessageText}
                  onChange={sm.setNewMessageText}
                  onSend={sm.handleSendMessage}
                  isSending={sm.isSending}
                  disabled={!sm.selectedConversationId}
                  sendError={sm.sendError}
                  onDismissError={() => sm.setSendError(null)}
                />
              </div>

              {/* Right context panel (desktop always, mobile on toggle) */}
              {(!sm.isMobile || showContextPanel) && (
                <ContextSidebar
                  staffContext={sm.staffContext}
                  loadingContext={sm.loadingContext}
                  selectedConversation={activeConv}
                  currentUserId={userProfile?.id}
                  userProfile={userProfile}
                  showFollowUpForm={sm.showFollowUpForm}
                  setShowFollowUpForm={sm.setShowFollowUpForm}
                  fuCustomer={sm.fuCustomer}
                  setFuCustomer={sm.setFuCustomer}
                  fuDate={sm.fuDate}
                  setFuDate={sm.setFuDate}
                  fuNotes={sm.fuNotes}
                  setFuNotes={sm.setFuNotes}
                  fuIsSubmitting={sm.fuIsSubmitting}
                  setFuIsSubmitting={sm.setFuIsSubmitting}
                  fuCustomerSearch={sm.fuCustomerSearch}
                  setFuCustomerSearch={sm.setFuCustomerSearch}
                  fuCustomerList={sm.fuCustomerList}
                  setFuCustomerList={sm.setFuCustomerList}
                  existingCustomerFollowUps={sm.existingCustomerFollowUps}
                  setExistingCustomerFollowUps={sm.setExistingCustomerFollowUps}
                  recentCustomerWork={sm.recentCustomerWork}
                  setRecentCustomerWork={sm.setRecentCustomerWork}
                  followUpSuccess={sm.followUpSuccess}
                  setFollowUpSuccess={sm.setFollowUpSuccess}
                  onFollowUpCreated={() => {
                    // Optionally reload context after follow-up creation
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Staff Search Modal */}
      <StaffSearchModal
        show={sm.showStaffModal}
        onClose={() => sm.setShowStaffModal(false)}
        staffList={sm.staffList}
        staffSearch={sm.staffSearch}
        setStaffSearch={sm.setStaffSearch}
        startingChat={sm.startingChat}
        onStartChat={sm.handleStartChat}
        conversations={sm.conversations}
      />
    </div>
  );
}
