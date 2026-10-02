import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  findOrCreateConversation,
  fetchStaffContext,
  fetchStaffList,
  searchMessages,
} from '../services/chatService';
import { useRealtimeMessages } from './useRealtimeMessages';

/**
 * useStaffMessages
 *
 * Central state and logic hook for the StaffMessages module.
 * Separates all business logic from presentation components.
 */
export function useStaffMessages(userProfile) {
  // ─── Conversations ──────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('DIRECT_CHAT');
  const [filterMode, setFilterMode] = useState('All');

  // ─── Search ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  // ─── Active Conversation ─────────────────────────────
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);

  // ─── Sending ─────────────────────────────────────────
  const [newMessageText, setNewMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // ─── Start Chat ──────────────────────────────────────
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  // ─── CRM Context (right panel) ───────────────────────
  const [staffContext, setStaffContext] = useState({ visits: 0, orders: 0, followUps: 0, recentWork: [] });
  const [loadingContext, setLoadingContext] = useState(false);

  // ─── Follow-up creation ──────────────────────────────
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [fuCustomer, setFuCustomer] = useState(null);
  const [fuDate, setFuDate] = useState('');
  const [fuNotes, setFuNotes] = useState('');
  const [fuIsSubmitting, setFuIsSubmitting] = useState(false);
  const [fuCustomerSearch, setFuCustomerSearch] = useState('');
  const [fuCustomerList, setFuCustomerList] = useState([]);
  const [existingCustomerFollowUps, setExistingCustomerFollowUps] = useState([]);
  const [recentCustomerWork, setRecentCustomerWork] = useState({ orders: [], visits: [] });
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  const [fuIsAdmin, setFuIsAdmin] = useState(false);

  // ─── Mobile ──────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  // ─── Derived ─────────────────────────────────────────
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (userProfile?.role === 'Admin' || userProfile?.role === 'Owner' || userProfile?.role === 'Superadmin') {
      loadConversations();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  // Clear highlight after timeout
  useEffect(() => {
    if (!highlightMessageId) return;
    const t = setTimeout(() => setHighlightMessageId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightMessageId]);

  // ──────────────────────────────────────────────────────────────────────────
  // CONVERSATION LOADING & SEARCH
  // ──────────────────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const convs = await fetchConversations(userProfile.id);
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  // Re-filter when tab, conversations, filter mode, or search changes
  useEffect(() => {
    let tabType;
    if (activeTab === 'DIRECT_CHAT') tabType = 'DIRECT_CHAT';
    else if (activeTab === 'ADMIN_CHAT') tabType = 'ADMIN_STAFF';
    else tabType = 'TEAM';
    let base = conversations.filter((c) => c.type === tabType);

    if (searchQuery.trim().length > 0) {
      const lq = searchQuery.toLowerCase();
      base = base.filter((c) => c.participantNames.toLowerCase().includes(lq));
    }

    if (filterMode === 'Unread') {
      base = base.filter(
        (c) => c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== userProfile?.id
      );
    }

    setFilteredConversations(base);

    // Debounced message search
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.trim().length >= 3) {
      const convIds = conversations.map((c) => c.id);
      searchTimer.current = setTimeout(async () => {
        setGlobalSearchLoading(true);
        try {
          const results = await searchMessages(searchQuery, convIds);
          setGlobalSearchResults(results);
        } catch (e) {
          console.error(e);
        } finally {
          setGlobalSearchLoading(false);
        }
      }, 500);
    } else {
      setGlobalSearchResults([]);
    }

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, conversations, activeTab, filterMode, userProfile]);

  // ──────────────────────────────────────────────────────────────────────────
  // MESSAGE LOADING (with pagination)
  // ──────────────────────────────────────────────────────────────────────────

  const loadMessages = useCallback(
    async (conversationId) => {
      setMessagesLoading(true);
      setMessages([]);
      setHasMoreMessages(false);
      setSelectedConversationId(conversationId);
      setNewMessageText('');
      setSendError(null);
      try {
        const { messages: msgs, hasMore } = await fetchMessages(conversationId);
        setMessages(msgs);
        setHasMoreMessages(hasMore);
        await markMessagesAsRead(conversationId, userProfile.id);
        // Update local unread state
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            if (!c.latestMessage) return c;
            return { ...c, latestMessage: { ...c.latestMessage, read_at: new Date().toISOString() } };
          })
        );
      } catch (err) {
        console.error('Failed to load messages:', err);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [userProfile]
  );

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversationId || loadingMore || !hasMoreMessages) return;
    const oldestMsg = messages[0];
    if (!oldestMsg) return;

    setLoadingMore(true);
    try {
      const { messages: olderMsgs, hasMore } = await fetchMessages(selectedConversationId, oldestMsg.id);
      setMessages((prev) => [...olderMsgs, ...prev]);
      setHasMoreMessages(hasMore);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedConversationId, messages, loadingMore, hasMoreMessages]);

  // ──────────────────────────────────────────────────────────────────────────
  // REALTIME — callbacks are stable via useCallback
  // ──────────────────────────────────────────────────────────────────────────

  const handleNewRealtimeMessage = useCallback(
    (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      updateConversationPreview(msg.conversation_id, msg);
    },
    []
  );

  const handleMarkRead = useCallback(
    async (conversationId) => {
      await markMessagesAsRead(conversationId, userProfile.id);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          if (!c.latestMessage) return c;
          return { ...c, latestMessage: { ...c.latestMessage, read_at: new Date().toISOString() } };
        })
      );
    },
    [userProfile]
  );

  const { addPendingId } = useRealtimeMessages({
    conversationId: selectedConversationId,
    currentUserId: userProfile?.id,
    onNewMessage: handleNewRealtimeMessage,
    onMarkRead: handleMarkRead,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ──────────────────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      const text = newMessageText.trim();
      if (!text || !selectedConversationId || isSending) return;

      setIsSending(true);
      setSendError(null);
      setNewMessageText('');

      try {
        const otherParticipants = selectedConversation?.participants?.filter(
          (p) => p.user_id !== userProfile.id
        ) || [];

        const completeMsg = await sendMessage(
          selectedConversationId,
          userProfile.id,
          userProfile,
          text,
          otherParticipants
        );

        // Register ID as pending so realtime echo is suppressed
        addPendingId(completeMsg.id);

        // Optimistically add to message list
        setMessages((prev) => {
          if (prev.some((m) => m.id === completeMsg.id)) return prev;
          return [...prev, completeMsg];
        });

        updateConversationPreview(selectedConversationId, completeMsg);
      } catch (err) {
        console.error('Send failed:', err);
        setSendError('Message failed to send. Please try again.');
        setNewMessageText(newMessageText); // Restore text on failure
      } finally {
        setIsSending(false);
      }
    },
    [newMessageText, selectedConversationId, isSending, selectedConversation, userProfile, addPendingId]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CONVERSATION PREVIEW UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  const updateConversationPreview = useCallback((conversationId, latestMsg) => {
    setConversations((prev) =>
      prev
        .map((conv) =>
          conv.id === conversationId
            ? { ...conv, latestMessage: latestMsg, updated_at: latestMsg.created_at }
            : conv
        )
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    );
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // START CONVERSATION MODAL
  // ──────────────────────────────────────────────────────────────────────────

  const handleOpenStaffModal = useCallback(async () => {
    setShowStaffModal(true);
    setStaffSearch('');
    try {
      const list = await fetchStaffList(userProfile.id);
      setStaffList(list);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  }, [userProfile]);

  const handleStartChat = useCallback(
    async (staffUser) => {
      setStartingChat(true);
      try {
        const { conversationId, isNew } = await findOrCreateConversation(userProfile.id, staffUser.id);
        setShowStaffModal(false);
        if (isNew) {
          await loadConversations();
        }
        await loadMessages(conversationId);
      } catch (err) {
        console.error('Failed to start chat:', err);
        alert('Failed to start conversation.');
      } finally {
        setStartingChat(false);
      }
    },
    [userProfile, loadConversations, loadMessages]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // STAFF CONTEXT (right panel)
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedConversationId) return;
    const conv = conversations.find((c) => c.id === selectedConversationId);
    const staffId = conv?.staffUserIds?.find((id) => id !== userProfile?.id) || conv?.participants?.find((p) => p.user_id !== userProfile?.id)?.user_id;
    if (!staffId) return;

    setLoadingContext(true);
    fetchStaffContext(staffId)
      .then(setStaffContext)
      .catch((err) => console.error('Context load failed:', err))
      .finally(() => setLoadingContext(false));
  }, [selectedConversationId, conversations, userProfile]);

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH: jump to message in conversation
  // ──────────────────────────────────────────────────────────────────────────

  const handleMessageResultClick = useCallback(
    async (msg) => {
      if (selectedConversationId !== msg.conversation_id) {
        await loadMessages(msg.conversation_id);
      }
      setHighlightMessageId(msg.id);
      setTimeout(() => {
        const el = document.getElementById(`msg-${msg.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    },
    [selectedConversationId, loadMessages]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ACTIVE TAB CHANGE
  // ──────────────────────────────────────────────────────────────────────────

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedConversationId(null);
    setMessages([]);
    setSearchQuery('');
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // DERIVED: UNREAD COUNTS
  // ──────────────────────────────────────────────────────────────────────────

  const unreadCountByType = {
    DIRECT_CHAT: conversations.filter(
      (c) => c.type === 'DIRECT_CHAT' && c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== userProfile?.id
    ).length,
    ADMIN_STAFF: conversations.filter(
      (c) => c.type === 'ADMIN_STAFF' && c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== userProfile?.id
    ).length,
    TEAM: conversations.filter(
      (c) => c.type === 'TEAM' && c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== userProfile?.id
    ).length,
  };

  return {
    // Conversations
    conversations,
    filteredConversations,
    loading,
    error,
    activeTab,
    filterMode,
    setFilterMode,
    handleTabChange,
    unreadCountByType,
    loadConversations,

    // Search
    searchQuery,
    setSearchQuery,
    globalSearchResults,
    globalSearchLoading,
    handleMessageResultClick,

    // Active conversation
    selectedConversationId,
    selectedConversation,
    messages,
    messagesLoading,
    hasMoreMessages,
    loadingMore,
    loadMessages,
    loadMoreMessages,
    highlightMessageId,

    // Sending
    newMessageText,
    setNewMessageText,
    isSending,
    sendError,
    setSendError,
    handleSendMessage,

    // Start chat
    showStaffModal,
    setShowStaffModal,
    staffList,
    staffSearch,
    setStaffSearch,
    startingChat,
    handleOpenStaffModal,
    handleStartChat,

    // CRM Context
    staffContext,
    loadingContext,

    // Follow-up form
    showFollowUpForm,
    setShowFollowUpForm,
    fuCustomer,
    setFuCustomer,
    fuDate,
    setFuDate,
    fuNotes,
    setFuNotes,
    fuIsSubmitting,
    setFuIsSubmitting,
    fuCustomerSearch,
    setFuCustomerSearch,
    fuCustomerList,
    setFuCustomerList,
    existingCustomerFollowUps,
    setExistingCustomerFollowUps,
    recentCustomerWork,
    setRecentCustomerWork,
    followUpSuccess,
    setFollowUpSuccess,

    // Mobile
    isMobile,
  };
}
