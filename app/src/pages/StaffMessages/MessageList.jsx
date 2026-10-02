import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Shield, LinkIcon } from 'lucide-react';
import { formatTime, formatRelativeDate } from './utils/formatters';

/**
 * MessageList
 *
 * Renders the paginated message timeline with:
 *  - Date separators
 *  - Consecutive message grouping (no repeat sender avatar)
 *  - Incoming / outgoing bubble distinction
 *  - Read receipt for own messages
 *  - Link rendering inside message text
 *  - Message highlight (search result jump)
 *  - "Load more" trigger at top
 */
export default function MessageList({
  messages,
  messagesLoading,
  hasMoreMessages,
  loadingMore,
  onLoadMore,
  currentUserId,
  highlightMessageId,
  scrollRef,
}) {
  if (messagesLoading) {
    return (
      <div className="sm-msg-loading">
        <div className="sm-msg-skeleton" />
        <div className="sm-msg-skeleton sm-msg-skeleton--right" />
        <div className="sm-msg-skeleton" />
        <div className="sm-msg-skeleton sm-msg-skeleton--right" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="sm-empty-chat">
        <div className="sm-empty-chat-icon">💬</div>
        <div className="sm-empty-chat-title">No messages yet</div>
        <div className="sm-empty-chat-sub">Send a message below to start the conversation.</div>
      </div>
    );
  }

  return (
    <div className="sm-msg-list">
      {/* Load more trigger */}
      {hasMoreMessages && (
        <div className="sm-load-more-row">
          <button
            className="sm-load-more-btn"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load earlier messages'}
          </button>
        </div>
      )}

      {messages.map((msg, index) => {
        const prevMsg = messages[index - 1];
        const nextMsg = messages[index + 1];

        const showDateSeparator =
          index === 0 ||
          formatRelativeDate(prevMsg?.created_at) !== formatRelativeDate(msg.created_at);

        const isMine = msg.sender_id === currentUserId;
        const isAdmin = msg.app_users?.role === 'Admin';

        // Grouping: don't show sender label if previous message is from same sender
        // and within 5 minutes
        const prevIsSameSender =
          prevMsg &&
          !showDateSeparator &&
          prevMsg.sender_id === msg.sender_id &&
          new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;

        const nextIsSameSender =
          nextMsg &&
          nextMsg.sender_id === msg.sender_id &&
          new Date(nextMsg.created_at) - new Date(msg.created_at) < 5 * 60 * 1000;

        const isHighlighted = highlightMessageId === msg.id;

        return (
          <React.Fragment key={msg.id}>
            {/* Date separator */}
            {showDateSeparator && (
              <div className="sm-date-sep" role="separator">
                <span className="sm-date-sep-label">{formatRelativeDate(msg.created_at)}</span>
              </div>
            )}

            {/* Message bubble */}
            <div
              id={`msg-${msg.id}`}
              className={`sm-msg-row ${isMine ? 'sm-msg-row--mine' : 'sm-msg-row--theirs'} ${isHighlighted ? 'sm-msg-row--highlight' : ''}`}
            >
              {/* Sender label (incoming only, first in group) */}
              {!isMine && !prevIsSameSender && (
                <div className="sm-msg-sender">
                  {msg.app_users?.display_name || 'Unknown'}
                  {isAdmin && (
                    <Shield size={10} className="sm-msg-admin-icon" title="Administrator" />
                  )}
                </div>
              )}

              {/* Bubble */}
              <div
                className={[
                  'sm-bubble',
                  isMine ? 'sm-bubble--mine' : 'sm-bubble--theirs',
                  prevIsSameSender ? 'sm-bubble--grouped-top' : '',
                  nextIsSameSender ? 'sm-bubble--grouped-bottom' : '',
                ].filter(Boolean).join(' ')}
              >
                {renderMessageText(msg.message_text)}
              </div>

              {/* Timestamp row */}
              <div className={`sm-msg-meta ${isMine ? 'sm-msg-meta--mine' : ''}`}>
                {isMine && msg.read_at && (
                  <span className="sm-read-receipt">Read</span>
                )}
                <Clock size={10} />
                <span>{formatTime(msg.created_at)}</span>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Scroll anchor */}
      <div ref={scrollRef} />
    </div>
  );
}

/**
 * Parse markdown-style links [label](url) in message text.
 * Returns an array of React nodes (spans + Link elements).
 */
function renderMessageText(text) {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      return (
        <Link
          key={i}
          to={match[2]}
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <LinkIcon size={11} />
          {match[1]}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
