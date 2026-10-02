import React from 'react';
import { Search, MessageSquare, Plus } from 'lucide-react';
import { formatConversationTime, getInitials, parseUTCString } from './utils/formatters';

/**
 * ConversationList
 *
 * Left sidebar: tabs, search, unread/all filter, conversation cards.
 * Intentionally has no state — all data flows from the parent hook.
 */
export default function ConversationList({
  conversations,
  filteredConversations,
  selectedConversationId,
  searchQuery,
  setSearchQuery,
  globalSearchResults,
  globalSearchLoading,
  activeTab,
  onTabChange,
  filterMode,
  setFilterMode,
  unreadCountByType,
  currentUserId,
  onSelectConversation,
  onSearchResultClick,
  onStartChat,
}) {
  const isSearchMode = searchQuery.trim().length >= 3;

  const unreadConvs = filteredConversations.filter(
    (c) => c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== currentUserId
  );
  const readConvs = filteredConversations.filter(
    (c) => !(c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== currentUserId)
  );

  return (
    <div className="sm-conv-list">
      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="sm-tabs">
        <button
          className={`sm-tab ${activeTab === 'TEAM_CHAT' ? 'sm-tab--active' : ''}`}
          onClick={() => onTabChange('TEAM_CHAT')}
        >
          Team Chat
          {unreadCountByType.TEAM > 0 && (
            <span className="sm-unread-badge">{unreadCountByType.TEAM}</span>
          )}
        </button>
        <button
          className={`sm-tab ${activeTab === 'ADMIN_CHAT' ? 'sm-tab--active' : ''}`}
          onClick={() => onTabChange('ADMIN_CHAT')}
        >
          Admin Chat
          {unreadCountByType.ADMIN_STAFF > 0 && (
            <span className="sm-unread-badge">{unreadCountByType.ADMIN_STAFF}</span>
          )}
        </button>
        <button
          className={`sm-tab ${activeTab === 'DIRECT_CHAT' ? 'sm-tab--active' : ''}`}
          onClick={() => onTabChange('DIRECT_CHAT')}
        >
          Direct Chat
          {unreadCountByType.DIRECT_CHAT > 0 && (
            <span className="sm-unread-badge">{unreadCountByType.DIRECT_CHAT}</span>
          )}
        </button>
      </div>

      {/* ── Search ───────────────────────────────────── */}
      <div className="sm-search-row">
        <div className="sm-search-wrap">
          <Search size={14} className="sm-search-icon" />
          <input
            type="text"
            placeholder="Search staff or messages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm-search-input"
          />
          {searchQuery && (
            <button className="sm-search-clear" onClick={() => setSearchQuery('')} title="Clear search">×</button>
          )}
        </div>
        {activeTab === 'DIRECT_CHAT' && (
          <button
            className="btn btn-primary sm-new-chat-btn"
            onClick={onStartChat}
            title="Start a new direct chat"
          >
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* ── Filter Pills ─────────────────────────────── */}
      {!isSearchMode && (
        <div className="sm-filter-row">
          {['All', 'Unread'].map((mode) => (
            <button
              key={mode}
              className={`sm-filter-pill ${filterMode === mode ? 'sm-filter-pill--active' : ''}`}
              onClick={() => setFilterMode(mode)}
            >
              {mode}
              {mode === 'Unread' && unreadConvs.length > 0 && (
                <span className="sm-filter-count">{unreadConvs.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── List Body ────────────────────────────────── */}
      <div className="sm-conv-scroll">
        {isSearchMode ? (
          /* ── Search Results ── */
          <>
            <div className="sm-section-label">Staff Matches</div>
            {filteredConversations.length === 0 ? (
              <div className="sm-empty-inline">No staff found</div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conv={conv}
                  isActive={selectedConversationId === conv.id}
                  currentUserId={currentUserId}
                  onSelect={onSelectConversation}
                />
              ))
            )}
            <div className="sm-section-label sm-section-label--border">Message Matches</div>
            {globalSearchLoading ? (
              <div className="sm-empty-inline">Searching…</div>
            ) : globalSearchResults.length === 0 ? (
              <div className="sm-empty-inline">No messages found</div>
            ) : (
              globalSearchResults.map((msg) => (
                <MessageSearchResult
                  key={msg.id}
                  msg={msg}
                  onClick={onSearchResultClick}
                  conversations={conversations}
                />
              ))
            )}
          </>
        ) : filteredConversations.length === 0 ? (
          /* ── Empty State ── */
          <div className="sm-empty-state">
            <MessageSquare size={32} className="sm-empty-icon" />
            <div className="sm-empty-title">
              {activeTab === 'ADMIN_CHAT' ? 'No staff conversations yet' : 'No team conversations yet'}
            </div>
            {activeTab === 'ADMIN_CHAT' && (
              <button className="btn btn-primary btn-sm" onClick={onStartChat}>
                <Plus size={14} /> Start Conversation
              </button>
            )}
          </div>
        ) : (
          /* ── Normal Conversation List ── */
          <>
            {filterMode === 'Unread' ? (
              unreadConvs.length === 0 ? (
                <div className="sm-empty-inline">No unread conversations</div>
              ) : (
                unreadConvs.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conv={conv}
                    isActive={selectedConversationId === conv.id}
                    currentUserId={currentUserId}
                    onSelect={onSelectConversation}
                  />
                ))
              )
            ) : (
              <>
                {unreadConvs.length > 0 && (
                  <>
                    <div className="sm-section-label">Unread</div>
                    {unreadConvs.map((conv) => (
                      <ConversationCard
                        key={conv.id}
                        conv={conv}
                        isActive={selectedConversationId === conv.id}
                        currentUserId={currentUserId}
                        onSelect={onSelectConversation}
                      />
                    ))}
                    {readConvs.length > 0 && <div className="sm-section-label sm-section-label--border">Recent</div>}
                  </>
                )}
                {readConvs.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conv={conv}
                    isActive={selectedConversationId === conv.id}
                    currentUserId={currentUserId}
                    onSelect={onSelectConversation}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* ConversationCard                               */
/* ─────────────────────────────────────────────── */
function ConversationCard({ conv, isActive, currentUserId, onSelect }) {
  const isUnread =
    conv.latestMessage && !conv.latestMessage.read_at && conv.latestMessage.sender_id !== currentUserId;

  const initials = getInitials(conv.participantNames);
  const preview = conv.latestMessage?.message_text;
  const time = formatConversationTime(conv.latestMessage?.created_at || conv.updated_at);

  return (
    <button
      className={`sm-conv-card ${isActive ? 'sm-conv-card--active' : ''} ${isUnread ? 'sm-conv-card--unread' : ''}`}
      onClick={() => onSelect(conv.id)}
      aria-current={isActive ? 'true' : undefined}
    >
      {/* Avatar */}
      <div className={`sm-avatar ${isUnread ? 'sm-avatar--unread' : ''}`} aria-hidden="true">
        {initials}
      </div>

      {/* Info */}
      <div className="sm-conv-info">
        <div className="sm-conv-row">
          <span className={`sm-conv-name ${isUnread ? 'sm-conv-name--unread' : ''}`}>
            {conv.participantNames}
          </span>
          <span className="sm-conv-time">{time}</span>
        </div>
        <div className="sm-conv-row sm-conv-row--preview">
          <span className={`sm-conv-preview ${isUnread ? 'sm-conv-preview--unread' : ''}`}>
            {preview || <em>No messages yet</em>}
          </span>
          {isUnread && <span className="sm-unread-dot" aria-label="Unread" />}
        </div>
        {conv.participantRoles && (
          <div className="sm-conv-role">{conv.participantRoles}</div>
        )}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────── */
/* MessageSearchResult                            */
/* ─────────────────────────────────────────────── */
function MessageSearchResult({ msg, onClick, conversations }) {
  const conv = conversations.find((c) => c.id === msg.conversation_id);
  const staffName = conv?.participantNames || 'Unknown';

  return (
    <button className="sm-msg-search-result" onClick={() => onClick(msg)}>
      <div className="sm-msg-search-name">{staffName}</div>
      <div className="sm-msg-search-text">"{msg.message_text}"</div>
      <div className="sm-msg-search-time">
        {parseUTCString(msg.created_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short',
        })},{' '}
        {(() => {
          const d = parseUTCString(msg.created_at);
          let h = d.getHours();
          const m = d.getMinutes().toString().padStart(2, '0');
          const ap = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          return `${h}:${m} ${ap}`;
        })()}
      </div>
    </button>
  );
}
