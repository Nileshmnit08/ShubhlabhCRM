import React, { useRef, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';

/**
 * MessageComposer
 *
 * The message input + send button.
 * Handles:
 *  - Enter to send, Shift+Enter for newline
 *  - Auto-resize textarea
 *  - Disabled and sending states
 *  - Send error display
 */
export default function MessageComposer({
  value,
  onChange,
  onSend,
  isSending,
  disabled,
  sendError,
  onDismissError,
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isSending && value.trim()) {
        onSend(e);
      }
    }
  };

  return (
    <div className="sm-composer">
      {sendError && (
        <div className="sm-composer-error">
          <AlertCircle size={14} />
          <span>{sendError}</span>
          <button className="sm-composer-error-dismiss" onClick={onDismissError}>×</button>
        </div>
      )}
      <form className="sm-composer-form" onSubmit={onSend}>
        <textarea
          ref={textareaRef}
          className="sm-composer-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          disabled={disabled || isSending}
          rows={1}
        />
        <button
          type="submit"
          className="btn btn-primary sm-composer-send"
          disabled={!value.trim() || isSending || disabled}
          title="Send message"
        >
          {isSending ? (
            <span className="sm-sending-spinner" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}
