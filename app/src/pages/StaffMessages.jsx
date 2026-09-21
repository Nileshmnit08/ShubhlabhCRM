import React, { useEffect, useState, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { MessageSquare, Search, Clock, User, Send, Shield } from 'lucide-react';

export default function StaffMessages() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchConversations();
    }
  }, [userProfile]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(c => 
          c.participantNames.toLowerCase().includes(lowerQuery)
        )
      );
    }
  }, [searchQuery, conversations]);

  // Real-time subscription for the selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`public:chat_messages:admin_${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          
          // Fetch sender info if needed
          const { data: senderData } = await supabase
            .from('app_users')
            .select('display_name, role')
            .eq('id', newMsg.sender_id)
            .single();
            
          const completeMsg = {
            ...newMsg,
            app_users: senderData || { display_name: 'Unknown' }
          };
          
          setMessages(prev => [...prev, completeMsg]);
          
          // Mark as read if received while looking at this chat and not sent by current user
          if (newMsg.sender_id !== userProfile.id) {
            markMessagesAsRead(selectedConversation, userProfile.id);
          }
          
          // Update conversation list preview
          updateConversationPreview(selectedConversation, completeMsg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, userProfile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateConversationPreview = (conversationId, latestMsg) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, latestMessage: latestMsg, updated_at: latestMsg.created_at };
      }
      return conv;
    }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  };

  async function fetchConversations() {
    setLoading(true);
    try {
      const { data: convData, error: convError } = await supabase
        .from('chat_conversations')
        .select(`
          id,
          updated_at,
          chat_participants (
            user_id
          )
        `)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Extract all unique user IDs to fetch their display names
      const userIds = new Set();
      convData.forEach(conv => {
        conv.chat_participants.forEach(p => userIds.add(p.user_id));
      });

      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('id, display_name')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      const userMap = {};
      usersData.forEach(u => {
        userMap[u.id] = u.display_name;
      });

      const formattedConvs = await Promise.all(convData.map(async (conv) => {
        const names = conv.chat_participants
          .map(p => userMap[p.user_id] || 'Unknown')
          .join(' & ');

        const { data: latestMsgData } = await supabase
          .from('chat_messages')
          .select('message_text, created_at, read_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        const latestMsg = latestMsgData && latestMsgData.length > 0 ? latestMsgData[0] : null;

        return {
          id: conv.id,
          updated_at: conv.updated_at,
          participants: conv.chat_participants,
          participantNames: names,
          latestMessage: latestMsg
        };
      }));

      setConversations(formattedConvs);
      setFilteredConversations(formattedConvs);
    } catch (err) {
      console.error(err);
      setError("Failed to load staff messages.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(conversationId) {
    setMessagesLoading(true);
    setSelectedConversation(conversationId);
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message_text,
          created_at,
          read_at,
          sender_id
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // Extract unique sender IDs to fetch their profiles
      const senderIds = new Set(msgData?.map(m => m.sender_id) || []);
      
      const { data: sendersData } = await supabase
        .from('app_users')
        .select('id, display_name, role')
        .in('id', Array.from(senderIds));

      const senderMap = {};
      if (sendersData) {
        sendersData.forEach(u => {
          senderMap[u.id] = u;
        });
      }

      const completeMessages = msgData?.map(msg => ({
        ...msg,
        app_users: senderMap[msg.sender_id] || { display_name: 'Unknown', role: 'Staff' }
      })) || [];

      setMessages(completeMessages);
      
      // Mark unread as read
      markMessagesAsRead(conversationId, userProfile.id);
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function markMessagesAsRead(conversationId, adminId) {
    await supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', adminId)
      .is('read_at', null);
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedConversation) return;

    setIsSending(true);
    const textToSend = newMessageText.trim();
    setNewMessageText(''); // optimistic clear

    try {
      // 1. Insert message
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            conversation_id: selectedConversation,
            sender_id: userProfile.id,
            message_text: textToSend,
          }
        ])
        .select();

      if (error) throw error;

      // 2. Dispatch notifications to conversation participants
      const activeConv = conversations.find(c => c.id === selectedConversation);
      if (activeConv) {
        const otherParticipants = activeConv.participants.filter(p => p.user_id !== userProfile.id);
        
        for (const p of otherParticipants) {
          await supabase
            .from('crm_notifications')
            .insert([
              {
                user_id: p.user_id,
                entity_type: 'CHAT_MESSAGE',
                entity_id: selectedConversation,
                notification_type: 'CHAT',
                title: userProfile.display_name,
                message: textToSend.length > 50 ? textToSend.substring(0, 50) + '...' : textToSend,
                link_url: `/chat/${selectedConversation}`
              }
            ]);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Staff Messages...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Area */}
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={24} className="text-primary" /> Staff Messages
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            Manage staff communications and reply in real-time.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: '600px' }}>
        
        {/* Left Pane: Conversations List */}
        <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search staff names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.5rem 0.5rem 2.2rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No conversations found.
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => fetchMessages(conv.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedConversation === conv.id ? 'var(--bg-surface-hover)' : 'transparent',
                    borderLeft: selectedConversation === conv.id ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }} className="truncate">
                      {conv.participantNames}
                    </div>
                    {conv.latestMessage && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                        {formatTime(conv.latestMessage.created_at)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {conv.latestMessage ? conv.latestMessage.message_text : <span style={{fontStyle: 'italic'}}>No messages yet</span>}
                    </div>
                    {conv.latestMessage && !conv.latestMessage.read_at && conv.latestMessage.sender_id !== userProfile?.id && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginLeft: '0.5rem' }}></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Message History */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
          {!selectedConversation ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
              <div>Select a conversation to start chatting</div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {conversations.find(c => c.id === selectedConversation)?.participantNames}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Conversation ID: {selectedConversation.substring(0, 8)}...
                  </div>
                </div>
              </div>

              {/* Message List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messagesLoading && messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No messages in this conversation. Send one below!</div>
                ) : (
                  messages.map((msg, index) => {
                    const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);
                    const isMine = msg.sender_id === userProfile.id;
                    const isAdmin = msg.app_users?.role === 'Admin';
                    
                    return (
                      <React.Fragment key={msg.id || index}>
                        {showDate && (
                          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                            <span style={{ background: 'var(--bg-base)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div style={{ 
                          alignSelf: isMine ? 'flex-end' : 'flex-start', 
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start'
                        }}>
                          {!isMine && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', paddingLeft: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {msg.app_users?.display_name || 'Unknown'}
                              {isAdmin && <Shield size={10} className="text-primary" title="Administrator" />}
                            </div>
                          )}
                          <div style={{ 
                            background: isMine ? 'var(--primary)' : 'var(--bg-base)', 
                            padding: '0.75rem 1rem', 
                            borderRadius: '12px',
                            borderBottomRightRadius: isMine ? '2px' : '12px',
                            borderTopLeftRadius: !isMine ? '2px' : '12px',
                            border: isMine ? 'none' : '1px solid var(--border)',
                            color: isMine ? '#fff' : 'var(--text-primary)',
                            fontSize: '0.95rem',
                            wordBreak: 'break-word'
                          }}>
                            {msg.message_text}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', padding: '0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {isMine && msg.read_at && <span style={{color: 'var(--success)'}}>Read</span>}
                            <Clock size={10} /> {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isSending}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={!newMessageText.trim() || isSending}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem' }}
                  >
                    <Send size={16} /> 
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
