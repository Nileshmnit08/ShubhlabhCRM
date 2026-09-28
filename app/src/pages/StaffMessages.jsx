import React, { useEffect, useState, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { MessageSquare, Search, Clock, User, Send, Shield, ChevronLeft, Link as LinkIcon, X, CheckCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const [staffContext, setStaffContext] = useState({ visits: 0, orders: 0, followUps: 0, currentWork: [] });
  const [loadingContext, setLoadingContext] = useState(false);
  const [conversationContexts, setConversationContextsState] = useState([]);
  const [selectingContextType, setSelectingContextType] = useState(null);
  const [contextSearchQuery, setContextSearchQuery] = useState('');
  const [contextSearchResults, setContextSearchResults] = useState([]);
  const [contextSearching, setContextSearching] = useState(false);

  const addConversationContext = (val) => {
     setConversationContextsState(prev => {
        if (prev.some(p => p.id === val.id && p.type === val.type)) return prev;
        const newCtx = [...prev, val];
        if (selectedConversation) {
           localStorage.setItem(`chat_context_arr_${selectedConversation}`, JSON.stringify(newCtx));
        }
        return newCtx;
     });
  };

  const removeConversationContext = (index) => {
     setConversationContextsState(prev => {
        const newCtx = prev.filter((_, i) => i !== index);
        if (selectedConversation) {
           if (newCtx.length > 0) localStorage.setItem(`chat_context_arr_${selectedConversation}`, JSON.stringify(newCtx));
           else localStorage.removeItem(`chat_context_arr_${selectedConversation}`);
        }
        return newCtx;
     });
  };

  useEffect(() => {
     if (selectedConversation) {
       try {
         // check for legacy single record first, then array
         const savedArr = localStorage.getItem(`chat_context_arr_${selectedConversation}`);
         if (savedArr) {
            setConversationContextsState(JSON.parse(savedArr));
         } else {
            const savedSingle = localStorage.getItem(`chat_context_${selectedConversation}`);
            if (savedSingle) setConversationContextsState([JSON.parse(savedSingle)]);
            else setConversationContextsState([]);
         }
       } catch (e) {
         setConversationContextsState([]);
       }
     } else {
       setConversationContextsState([]);
     }
     setSelectingContextType(null);
     setContextSearchQuery('');
  }, [selectedConversation]);

  // Dynamically refresh Follow-up statuses
  useEffect(() => {
     const fetchStatuses = async () => {
        const fuContexts = conversationContexts.filter(c => c.type === 'Follow-up');
        if (fuContexts.length === 0) return;
        
        const ids = fuContexts.map(c => c.id);
        const { data } = await supabase.from('follow_ups').select('id, status').in('id', ids);
        
        if (data && data.length > 0) {
           setConversationContextsState(prev => {
              const updated = prev.map(c => {
                 if (c.type === 'Follow-up') {
                    const match = data.find(d => d.id === c.id);
                    if (match && match.status !== c.status) return { ...c, status: match.status };
                 }
                 return c;
              });
              // Avoid infinite loops by only updating state if it actually changed
              if (JSON.stringify(updated) !== JSON.stringify(prev)) {
                  if (selectedConversation) localStorage.setItem(`chat_context_arr_${selectedConversation}`, JSON.stringify(updated));
                  return updated;
              }
              return prev;
           });
        }
     };
     fetchStatuses();
  }, [conversationContexts.length, selectedConversation]);

  useEffect(() => {
    if (selectingContextType && contextSearchQuery.trim().length > 2) {
      const search = async () => {
        setContextSearching(true);
        try {
          if (selectingContextType === 'Customer') {
            const { data } = await supabase.from('crm_parties').select('id, display_name').ilike('display_name', `%${contextSearchQuery}%`).limit(5);
            setContextSearchResults(data?.map(d => ({ type: 'Customer', id: d.id, display: d.display_name, label: d.display_name, link: `/customers/${d.id}` })) || []);
          } else if (selectingContextType === 'Order') {
            const { data } = await supabase.from('requirements').select('id, customer_name, product_type').or(`customer_name.ilike.%${contextSearchQuery}%,product_type.ilike.%${contextSearchQuery}%`).limit(5);
            setContextSearchResults(data?.map(d => ({ type: 'Order', id: d.id, display: `${d.customer_name} - ${d.product_type}`, label: `Order: ${d.product_type} - ${d.customer_name}`, link: `/requirements/${d.id}` })) || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setContextSearching(false);
        }
      };
      const timer = setTimeout(search, 300);
      return () => clearTimeout(timer);
    } else if (selectingContextType === 'Visit') {
      const fetchVisits = async () => {
        setContextSearching(true);
        try {
          const { data } = await supabase.from('crm_visits').select('id, started_at, status, crm_parties(id, display_name)').order('started_at', { ascending: false }).limit(5);
          setContextSearchResults(data?.map(d => ({ type: 'Visit', id: d.id, display: `Visit on ${d.started_at ? d.started_at.substring(0,10) : ''} - ${d.crm_parties?.display_name || ''} (${d.status})`, label: `Visit: ${d.crm_parties?.display_name || 'Customer'}`, link: `/visits/${d.id}` })) || []);
        } finally {
          setContextSearching(false);
        }
      };
      fetchVisits();
    } else {
      setContextSearchResults([]);
    }
  }, [contextSearchQuery, selectingContextType]);

  const handleSelectContextResult = (res) => {
    addConversationContext(res);
    setSelectingContextType(null);
    setContextSearchQuery('');
  };
  
  // Follow-up creation state
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [fuCustomer, setFuCustomer] = useState(null);
  const [fuDate, setFuDate] = useState('');
  const [fuNotes, setFuNotes] = useState('');
  const [fuIsSubmitting, setFuIsSubmitting] = useState(false);
  const [fuCustomerSearch, setFuCustomerSearch] = useState('');
  const [fuCustomerList, setFuCustomerList] = useState([]);
  const [existingCustomerFollowUps, setExistingCustomerFollowUps] = useState([]);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  
  const [filterMode, setFilterMode] = useState('All');
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (highlightMessageId) {
      const timer = setTimeout(() => setHighlightMessageId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightMessageId]);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchConversations();
    }
  }, [userProfile]);

  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(c => c.participantNames.toLowerCase().includes(lowerQuery))
      );
      
      const searchMessages = async () => {
        setGlobalSearchLoading(true);
        try {
          const convIds = conversations.map(c => c.id);
          if (convIds.length === 0) {
            setGlobalSearchResults([]);
            return;
          }
          const { data, error } = await supabase.from('chat_messages')
            .select('id, message_text, created_at, conversation_id, sender_id, app_users:sender_id(display_name)')
            .ilike('message_text', `%${searchQuery}%`)
            .in('conversation_id', convIds)
            .order('created_at', { ascending: false })
            .limit(20);
          if (error) throw error;
          setGlobalSearchResults(data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setGlobalSearchLoading(false);
        }
      };
      searchMessages();
    } else {
      setFilteredConversations(conversations);
      setGlobalSearchResults([]);
    }
  }, [searchQuery, conversations]);

  const fetchStaffContext = async (staffId) => {
    setLoadingContext(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
      const dateStr = startOfDay.split('T')[0];

      const [
        { count: visitsCount },
        { count: ordersCount },
        { count: followUpsCount },
        { data: recentReqs },
        { data: recentVisits },
        { data: todaysFollowups }
      ] = await Promise.all([
        supabase.from('crm_visits').select('*', { count: 'exact', head: true }).eq('staff_id', staffId).gte('started_at', startOfDay).lte('started_at', endOfDay),
        supabase.from('requirements').select('*', { count: 'exact', head: true }).eq('assigned_to', staffId).gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', staffId).eq('follow_up_date', dateStr),
        supabase.from('requirements').select('id, product_type, customer_name, party_id').eq('assigned_to', staffId).eq('is_pending', true).order('created_at', { ascending: false }).limit(2),
        supabase.from('crm_visits').select('id, crm_parties(id, display_name)').eq('staff_id', staffId).gte('started_at', startOfDay).lte('started_at', endOfDay).order('started_at', { ascending: false }).limit(2),
        supabase.from('follow_ups').select('id, reason, crm_parties(display_name)').eq('assigned_to', staffId).eq('follow_up_date', dateStr).order('created_at', { ascending: false }).limit(2)
      ]);

      const workItems = [];
      if (recentReqs) recentReqs.forEach(r => workItems.push({ type: 'Order', id: r.id, party_id: r.party_id, party_name: r.customer_name, label: `Order: ${r.product_type} - ${r.customer_name}`, link: `/requirements/${r.id}` }));
      if (recentVisits) recentVisits.forEach(v => workItems.push({ type: 'Visit', id: v.id, party_id: v.crm_parties?.id, party_name: v.crm_parties?.display_name, label: `Visit: ${v.crm_parties?.display_name || 'Customer'}`, link: `/customers/${v.crm_parties?.id || ''}` }));
      if (todaysFollowups) todaysFollowups.forEach(f => workItems.push({ type: 'Follow-up', id: f.id, party_id: f.crm_parties?.id, party_name: f.crm_parties?.display_name, label: `Follow-up: ${f.crm_parties?.display_name || 'Customer'}`, link: `/follow-ups/${f.id}/edit` }));

      setStaffContext({
        visits: visitsCount || 0,
        orders: ordersCount || 0,
        followUps: followUpsCount || 0,
        currentWork: workItems.slice(0, 5)
      });
    } catch (err) {
      console.error('Error fetching context:', err);
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    if (conversationContexts.some(c => c.party_id)) {
      const p = conversationContexts.find(c => c.party_id);
      setFuCustomer({ id: p.party_id, display_name: p.party_name || 'Customer' });
    }
  }, [conversationContexts]);

  useEffect(() => {
    if (fuCustomer?.id) {
      const fetchFu = async () => {
         const { data } = await supabase.from('follow_ups')
           .select('id, reason, follow_up_date, status')
           .eq('party_id', fuCustomer.id)
           .in('status', ['Pending'])
           .gte('follow_up_date', new Date().toISOString().split('T')[0])
           .order('follow_up_date', { ascending: true })
           .limit(3);
         setExistingCustomerFollowUps(data || []);
      };
      fetchFu();
    } else {
      setExistingCustomerFollowUps([]);
    }
  }, [fuCustomer]);

  useEffect(() => {
    if (fuCustomerSearch.length > 2 && !fuCustomer) {
      const search = async () => {
        const { data } = await supabase.from('crm_parties')
          .select('id, display_name')
          .ilike('display_name', `%${fuCustomerSearch}%`)
          .limit(5);
        setFuCustomerList(data || []);
      };
      search();
    } else {
      setFuCustomerList([]);
    }
  }, [fuCustomerSearch, fuCustomer]);

  const handleSaveFollowUp = async () => {
    if (!fuCustomer || !fuDate || !fuNotes.trim()) {
      alert("Please complete all fields.");
      return;
    }
    
    setFuIsSubmitting(true);
    try {
      const conv = conversations.find(c => c.id === selectedConversation);
      const staffUser = conv?.participants.find(p => p.user_id !== userProfile.id);
      
      const { data, error } = await supabase.from('follow_ups').insert({
        party_id: fuCustomer.id,
        reason: fuNotes,
        follow_up_date: fuDate,
        due_at: fuDate,
        priority: 'Normal',
        follow_up_type: 'Commercial',
        assigned_to: staffUser?.user_id || null
      }).select();
      
      if (error) throw error;
      
      setFollowUpSuccess(true);
      setTimeout(() => setFollowUpSuccess(false), 3000);
      
      // Auto-add follow-up to discussion context
      const newFuId = data?.[0]?.id; 
      if (newFuId) {
         addConversationContext({
            type: 'Follow-up',
            id: newFuId,
            display: `Follow-up on ${fuDate}`,
            label: `Follow-up: ${fuCustomer.display_name}`,
            link: `/follow-ups/${newFuId}/edit`,
            status: 'Pending'
         });
      }
      
      setShowFollowUpForm(false);
      setFuNotes('');
      setFuDate('');
      
      if (conversationContexts.length === 0) {
        setFuCustomer(null);
        setFuCustomerSearch('');
      }
      
      if (staffUser) fetchStaffContext(staffUser.user_id);
      
    } catch (err) {
      console.error(err);
      alert('Failed to save follow-up.');
    } finally {
      setFuIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      const conv = conversations.find(c => c.id === selectedConversation);
      const staffUser = conv?.participants.find(p => p.user_id !== userProfile.id);
      if (staffUser) {
        fetchStaffContext(staffUser.user_id);
      }
    }
  }, [selectedConversation, conversations]);

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
            app_users: senderData || { display_name: 'Unknown', role: 'Staff' }
          };
          
          setMessages(prev => {
             // Prevent duplicate messages if already appended locally (optimistic)
             if (prev.some(m => m.id === completeMsg.id)) return prev;
             return [...prev, completeMsg];
          });
          
          if (newMsg.sender_id !== userProfile.id) {
            markMessagesAsRead(selectedConversation, userProfile.id);
          }
          
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

      const userIds = new Set();
      convData.forEach(conv => {
        conv.chat_participants.forEach(p => userIds.add(p.user_id));
      });

      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('id, display_name, role')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      const userMap = {};
      usersData.forEach(u => {
        userMap[u.id] = u;
      });

      const formattedConvs = await Promise.all(convData.map(async (conv) => {
        const staffUsers = conv.chat_participants.filter(p => p.user_id !== userProfile.id).map(p => userMap[p.user_id]);
        const names = staffUsers.map(u => u?.display_name || 'Unknown').join(' & ');
        const roles = staffUsers.map(u => u?.role || 'Staff').join(', ');

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
          participantRoles: roles,
          latestMessage: latestMsg
        };
      }));

      setConversations(formattedConvs);
      setFilteredConversations(formattedConvs);
    } catch (err) {
      console.error(err);
      setError(`Failed to load staff messages.`);
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

    // Suppress active notifications
    await supabase
      .from('crm_notifications')
      .update({ is_read: true })
      .eq('entity_type', 'CHAT_MESSAGE')
      .eq('entity_id', conversationId)
      .eq('user_id', adminId)
      .eq('is_read', false);
  }

  const handleOpenStaffModal = async () => {
    setShowStaffModal(true);
    setStaffSearch('');
    const { data, error } = await supabase
      .from('app_users')
      .select('id, display_name, role, is_active')
      .eq('is_active', true)
      .neq('id', userProfile.id);
      
    if (data) {
      setStaffList(data);
    }
  };

  const handleStartChat = async (staffUser) => {
    setStartingChat(true);
    try {
      const existingConv = conversations.find(c => 
        c.participants.some(p => p.user_id === staffUser.id)
      );

      if (existingConv) {
        setShowStaffModal(false);
        fetchMessages(existingConv.id);
        setStartingChat(false);
        return;
      }

      const { data: existingParticipant } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', staffUser.id);
        
      if (existingParticipant && existingParticipant.length > 0) {
        const convIds = existingParticipant.map(ep => ep.conversation_id);
        const { data: adminParticipant } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', userProfile.id)
          .in('conversation_id', convIds);
          
        if (adminParticipant && adminParticipant.length > 0) {
           const convId = adminParticipant[0].conversation_id;
           setShowStaffModal(false);
           await fetchConversations();
           fetchMessages(convId);
           setStartingChat(false);
           return;
        }
      }

      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert([{}])
        .select()
        .single();
        
      if (convError) throw convError;

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert([
          { conversation_id: newConv.id, user_id: userProfile.id },
          { conversation_id: newConv.id, user_id: staffUser.id }
        ]);
        
      if (partError) throw partError;

      setShowStaffModal(false);
      await fetchConversations();
      fetchMessages(newConv.id);
    } catch (err) {
      console.error(err);
      alert('Failed to start conversation.');
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedConversation) return;

    setIsSending(true);
    let textToSend = newMessageText.trim();
    // In Sprint 08/09, we don't aggressively inject on every single message 
    // unless explicit, to keep chat clean.
    setNewMessageText(''); 

    try {
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
      
      const newMsg = data[0];
      const completeMsg = {
        ...newMsg,
        app_users: { display_name: userProfile.display_name, role: userProfile.role }
      };
      
      // Update local state optimistically
      setMessages(prev => {
        if (prev.some(m => m.id === completeMsg.id)) return prev;
        return [...prev, completeMsg];
      });
      updateConversationPreview(selectedConversation, completeMsg);

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

  const renderMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const label = match[1];
        const url = match[2];
        return (
          <Link key={i} to={url} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <LinkIcon size={12} /> {label}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleMessageResultClick = async (msg) => {
    if (selectedConversation !== msg.conversation_id) {
       await fetchMessages(msg.conversation_id);
    }
    setHighlightMessageId(msg.id);
    setTimeout(() => {
       const el = document.getElementById(`msg-${msg.id}`);
       if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  };

  const renderMessageSearchResult = (msg) => {
    const conv = conversations.find(c => c.id === msg.conversation_id);
    const staffName = conv?.participantNames || 'Unknown';
    return (
      <div key={msg.id} onClick={() => handleMessageResultClick(msg)} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-base)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-surface-hover)'} onMouseLeave={e => e.currentTarget.style.background='var(--bg-base)'}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{staffName}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
           "{msg.message_text}"
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
           {formatDate(msg.created_at)}, {formatTime(msg.created_at)}
        </div>
      </div>
    );
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Staff Messages...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  const unreadConvs = filteredConversations.filter(c => c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== userProfile?.id);
  const recentConvs = filteredConversations.filter(c => !(c.latestMessage && !c.latestMessage.read_at && c.latestMessage.sender_id !== userProfile?.id));

  const renderConversationCard = (conv) => (
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
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Area - Hidden on mobile if viewing a conversation */}
      {!(isMobile && selectedConversation) && (
        <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={24} className="text-primary" /> Staff Messages
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
              Manage staff communications and reply in real-time.
            </p>
          </div>
          <button 
            onClick={handleOpenStaffModal} 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            + Start Conversation
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Pane: Conversations List */}
        {(!isMobile || !selectedConversation) && (
          <div className="glass-panel" style={{ width: isMobile ? '100%' : '350px', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search conversations or staff..."
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
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {searchQuery.trim().length > 2 ? (
                <>
                  <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STAFF MATCHES</div>
                  {filteredConversations.length === 0 ? <div style={{ padding: '0 1rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No staff found.</div> : filteredConversations.map(conv => renderConversationCard(conv))}
                  
                  <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--border)' }}>MESSAGE MATCHES</div>
                  {globalSearchLoading ? <div style={{ padding: '0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Searching...</div> : 
                    globalSearchResults.length === 0 ? <div style={{ padding: '0 1rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No messages found.</div> :
                    globalSearchResults.map(msg => renderMessageSearchResult(msg))
                  }
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                     <button className={`btn btn-sm ${filterMode === 'All' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterMode('All')} style={{ padding: '0.25rem 0.75rem' }}>All</button>
                     <button className={`btn btn-sm ${filterMode === 'Unread' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterMode('Unread')} style={{ padding: '0.25rem 0.75rem' }}>Unread</button>
                     <button className={`btn btn-sm ${filterMode === 'Recent' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterMode('Recent')} style={{ padding: '0.25rem 0.75rem' }}>Recent</button>
                  </div>
                  
                  {filteredConversations.length === 0 ? (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>No conversations yet</div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Start a conversation with a staff member.</div>
                      <button className="btn btn-primary btn-sm" onClick={handleOpenStaffModal} style={{ padding: '0.5rem 1rem' }}>
                        Start Conversation
                      </button>
                    </div>
                  ) : (
                    <>
                      {filterMode === 'All' && (
                        <>
                          {unreadConvs.length > 0 && <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UNREAD</div>}
                          {unreadConvs.map(conv => renderConversationCard(conv))}
                          {recentConvs.length > 0 && <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: unreadConvs.length > 0 ? '1px solid var(--border)' : 'none' }}>RECENT</div>}
                          {recentConvs.map(conv => renderConversationCard(conv))}
                        </>
                      )}
                      {filterMode === 'Unread' && (
                        <>
                          {unreadConvs.length === 0 ? <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No unread conversations.</div> : unreadConvs.map(conv => renderConversationCard(conv))}
                        </>
                      )}
                      {filterMode === 'Recent' && (
                        <>
                           {recentConvs.length === 0 && unreadConvs.length === 0 ? <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent conversations.</div> : [...unreadConvs, ...recentConvs].map(conv => renderConversationCard(conv))}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Right Pane: Message History */}
        {(!isMobile || selectedConversation) && (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minWidth: 0 }}>
            {!selectedConversation ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <div>Select a conversation to start chatting</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  {/* Chat Header */}
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isMobile && (
                      <button 
                        onClick={() => setSelectedConversation(null)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <ChevronLeft size={24} />
                      </button>
                    )}
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                      <User size={20} />
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conversations.find(c => c.id === selectedConversation)?.participantNames}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {conversations.find(c => c.id === selectedConversation)?.participantRoles || 'Staff'}
                      </div>
                    </div>
                    {/* Quick Actions top-right */}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                       <button className="btn btn-ghost btn-sm" onClick={() => setSelectingContextType('Customer')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>+ Customer</button>
                       <button className="btn btn-ghost btn-sm" onClick={() => setSelectingContextType('Order')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>+ Order</button>
                       <button className="btn btn-ghost btn-sm" onClick={() => setSelectingContextType('Visit')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>+ Visit</button>
                    </div>
                  </div>
                  
                  {/* Context Selection Modal */}
                  {selectingContextType && (
                    <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                         <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Select {selectingContextType}</h4>
                         <button className="btn btn-ghost btn-sm" onClick={() => setSelectingContextType(null)} style={{ padding: '0.25rem' }}><X size={16} /></button>
                       </div>
                       {selectingContextType !== 'Visit' && (
                         <input 
                           type="text" 
                           placeholder={`Search ${selectingContextType}s...`} 
                           value={contextSearchQuery}
                           onChange={e => setContextSearchQuery(e.target.value)}
                           autoFocus
                           style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                         />
                       )}
                       <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                         {contextSearching ? <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching...</div> : 
                          contextSearchResults.map(res => (
                            <div key={res.id} onClick={() => handleSelectContextResult(res)} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {res.display}
                            </div>
                          ))
                         }
                         {contextSearchQuery.length > 2 && !contextSearching && contextSearchResults.length === 0 && selectingContextType !== 'Visit' && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matches found.</div>
                         )}
                       </div>
                    </div>
                  )}

                  {/* Related Context Banner (Multiple) */}
                  {conversationContexts.length > 0 && !selectingContextType && (
                    <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Discussion Context:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {conversationContexts.map((ctx, index) => (
                           <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                               <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{ctx.label}</span>
                               {ctx.type === 'Follow-up' && ctx.status && (
                                 <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px', background: ctx.status === 'Completed' ? 'var(--success-light)' : 'var(--warning-light)', color: ctx.status === 'Completed' ? 'var(--success)' : 'var(--warning)' }}>
                                   {ctx.status}
                                 </span>
                               )}
                             </div>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>
                               <button className="btn btn-ghost btn-sm" onClick={() => removeConversationContext(index)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Remove</button>
                               <Link to={ctx.link} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Open {ctx.type}</Link>
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                            <div id={`msg-${msg.id}`} style={{ 
                              alignSelf: isMine ? 'flex-end' : 'flex-start', 
                              maxWidth: '85%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMine ? 'flex-end' : 'flex-start',
                              transition: 'box-shadow 0.5s ease-in-out',
                              boxShadow: highlightMessageId === msg.id ? '0 0 0 4px rgba(245, 158, 11, 0.4)' : 'none',
                              borderRadius: '12px'
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
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {renderMessageText(msg.message_text)}
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
                        placeholder="Type a message..."
                        disabled={isSending}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-base)',
                          color: 'var(--text-primary)',
                          minWidth: 0
                        }}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={!newMessageText.trim() || isSending}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem', flexShrink: 0 }}
                      >
                        <Send size={16} /> 
                        {isSending ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Staff Context Sidebar (Hidden on narrow screens) */}
                {!isMobile && (
                  <div style={{ width: '220px', borderLeft: '1px solid var(--border)', background: 'var(--bg-base)', padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Context</div>
                     
                     {loadingContext ? (
                       <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>
                     ) : (
                       <>
                         <div>
                           <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>TODAY</div>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                               <span style={{ color: 'var(--text-secondary)' }}>Visits</span>
                               <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{staffContext.visits}</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                               <span style={{ color: 'var(--text-secondary)' }}>Orders</span>
                               <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{staffContext.orders}</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                               <span style={{ color: 'var(--text-secondary)' }}>Follow-ups</span>
                               <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{staffContext.followUps}</span>
                             </div>
                           </div>
                         </div>

                         <div>
                           <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CURRENT WORK</div>
                           {staffContext.currentWork.length === 0 ? (
                             <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                               No current activity
                             </div>
                           ) : (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                               {staffContext.currentWork.map((work, i) => (
                                 <div key={i} style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', transition: 'border-color 0.2s' }} 
                                      onClick={() => addConversationContext(work)}
                                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                      title="Click to discuss in chat"
                                 >
                                   <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{work.type}</div>
                                   <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{work.label.replace(`${work.type}: `, '')}</div>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                         
                         <div>
                           <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>DISCUSSION FOLLOW-UP</div>
                           
                           {followUpSuccess && (
                             <div style={{ padding: '0.5rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                               <CheckCircle size={14} /> Follow-up created
                             </div>
                           )}
                           
                           {!showFollowUpForm ? (
                             <button 
                               className="btn btn-secondary" 
                               style={{ width: '100%', justifyContent: 'center' }}
                               onClick={() => setShowFollowUpForm(true)}
                             >
                               + Add Follow-up
                             </button>
                           ) : (
                             <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                               
                               <div>
                                 <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Customer</label>
                                 {fuCustomer ? (
                                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                     <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fuCustomer.display_name}</span>
                                     <button onClick={() => { setFuCustomer(null); setFuCustomerSearch(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
                                   </div>
                                 ) : (
                                   <div style={{ position: 'relative' }}>
                                     <input 
                                       type="text" 
                                       placeholder="Search customer..." 
                                       value={fuCustomerSearch}
                                       onChange={e => setFuCustomerSearch(e.target.value)}
                                       style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                                     />
                                     {fuCustomerList.length > 0 && (
                                       <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px', zIndex: 10, marginTop: '2px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                         {fuCustomerList.map(c => (
                                           <div 
                                             key={c.id} 
                                             style={{ padding: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                             onClick={() => { setFuCustomer(c); setFuCustomerSearch(''); setFuCustomerList([]); }}
                                           >
                                             {c.display_name}
                                           </div>
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                 )}
                               </div>
                               
                               {fuCustomer && existingCustomerFollowUps.length > 0 && (
                                 <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '4px', borderLeft: '2px solid var(--warning)' }}>
                                   <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.25rem' }}>EXISTING FOLLOW-UPS</div>
                                   {existingCustomerFollowUps.map(ef => (
                                     <div key={ef.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                       <span style={{ fontWeight: 500 }}>{ef.follow_up_date === new Date().toISOString().split('T')[0] ? 'Today' : ef.follow_up_date}:</span> {ef.reason}
                                     </div>
                                   ))}
                                 </div>
                               )}
                               
                               <div>
                                 <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date</label>
                                 <input 
                                   type="date" 
                                   value={fuDate}
                                   onChange={e => setFuDate(e.target.value)}
                                   style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                                 />
                               </div>
                               
                               <div>
                                 <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</label>
                                 <textarea 
                                   placeholder="Action required..."
                                   value={fuNotes}
                                   onChange={e => setFuNotes(e.target.value)}
                                   style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', minHeight: '60px', resize: 'vertical', color: 'var(--text-primary)' }}
                                 />
                               </div>
                               
                               <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                 <button className="btn btn-ghost" style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }} onClick={() => setShowFollowUpForm(false)}>Cancel</button>
                                 <button className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }} onClick={handleSaveFollowUp} disabled={fuIsSubmitting}>{fuIsSubmitting ? 'Saving...' : 'Save'}</button>
                               </div>
                               
                             </div>
                           )}
                         </div>
                       </>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff Modal Overlay */}
      {showStaffModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '400px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} /> Start Conversation
              </h3>
              <button onClick={() => setShowStaffModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                placeholder="Search staff..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {staffList.filter(s => s.display_name?.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No staff found.</div>
              ) : (
                staffList.filter(s => s.display_name?.toLowerCase().includes(staffSearch.toLowerCase())).map(staff => {
                  const hasConv = conversations.some(c => c.participants.some(p => p.user_id === staff.id));
                  return (
                    <div 
                      key={staff.id} 
                      onClick={() => !startingChat && handleStartChat(staff)}
                      style={{ 
                        padding: '0.75rem', 
                        margin: '0.25rem 0', 
                        borderRadius: '6px', 
                        cursor: startingChat ? 'not-allowed' : 'pointer', 
                        background: 'var(--bg-base)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        opacity: startingChat ? 0.5 : 1,
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!startingChat) e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{staff.display_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {staff.role} • {hasConv ? <span style={{color: 'var(--primary)', fontWeight: 500}}>Conversation exists</span> : <span>No conversation yet</span>}
                        </div>
                      </div>
                      {startingChat && <Clock size={14} className="text-muted" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
