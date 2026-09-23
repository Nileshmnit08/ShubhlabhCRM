import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Keyboard,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { BottomSheetFoundation } from '../components/BottomSheet';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/ChatService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../context/NotificationContext';
import { useVoiceToText, MicState } from '../hooks/useVoiceToText';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatSeparatorDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
};

// Validate UUID shape to guard against accidental misrouting
function isValidUUID(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ─────────────────────────────────────────────────────────────────
// MEMOIZED MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────
const MessageBubble = memo(({ item, nextItem, index, currentUserId, searchActive, searchResults, searchIndex, onLongPress }) => {
  const isMe = item.sender_id === currentUserId;
  const isSearchMatch = searchActive && searchResults.length > 0 && searchResults[searchIndex]?.index === index;
  
  const currentDate = formatSeparatorDate(item.created_at);
  const nextDate = nextItem ? formatSeparatorDate(nextItem.created_at) : null;
  const showDateSeparator = currentDate !== nextDate;

  return (
    <>
      {showDateSeparator && (
        <View style={styles.datePillContainer}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{currentDate}</Text>
          </View>
        </View>
      )}
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
        ]}
      >
        <TouchableOpacity
          onLongPress={() => onLongPress(item)}
          activeOpacity={0.8}
          style={[
            styles.messageBubble,
            isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
            isSearchMatch && { borderWidth: 2, borderColor: colors.primary, backgroundColor: isMe ? '#0a462c' : '#e0e0e0' }
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.messageTextMe : styles.messageTextOther,
            ]}
          >
            {item.message_text}
          </Text>

          <View
            style={[
              styles.metaRow,
              isMe ? styles.metaRowMe : styles.metaRowOther,
            ]}
          >
            <Text
              style={[
                styles.timeText,
                isMe ? styles.timeTextMe : styles.timeTextOther,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
            {isMe && !item.pending && (
              <MaterialIcons
                name={item.read_at ? 'done-all' : 'done'}
                size={14}
                color={
                  item.read_at
                    ? colors.primaryFixed || '#a9f3c5'
                    : colors.onPrimaryContainer || '#ffffff'
                }
                style={styles.statusIcon}
              />
            )}
            {isMe && item.pending && (
              <MaterialIcons
                name="schedule"
                size={14}
                color={colors.onPrimaryContainer || '#ffffff'}
                style={styles.statusIcon}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to minimize re-renders
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.item.read_at !== nextProps.item.read_at) return false;
  if (prevProps.item.pending !== nextProps.item.pending) return false;
  if (prevProps.nextItem?.created_at !== nextProps.nextItem?.created_at) return false;
  if (prevProps.searchActive !== nextProps.searchActive) return false;
  if (prevProps.searchActive && prevProps.searchIndex !== nextProps.searchIndex) return false;
  return true;
});

export const ChatConversationScreen = ({ route, navigation }) => {
  // conversationId is the authoritative routing key from navigation params.
  // otherUser may be provided (from inbox) or may need to be resolved (from notification deep-link).
  const { conversationId, otherUser: paramOtherUser } = route.params;

  const { session } = useAuth();
  const { setActiveChatId, markEntityAsRead } = useNotifications();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // otherUser can be resolved lazily if the notification only provided conversationId
  const [otherUser, setOtherUser] = useState(paramOtherUser || null);
  const [resolvingUser, setResolvingUser] = useState(!paramOtherUser);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const flatListRef = useRef();

  // ── Voice-to-Text ────────────────────────────────────────────────
  // Stores the text that was in the TextInput BEFORE mic was tapped,
  // so we can safely prepend it to partials/finals without duplication.
  const baseTextRef = useRef('');

  // Called on every partial result — updates the TextInput live
  const handleVoicePartial = useCallback((partial) => {
    setNewMessage(baseTextRef.current + partial);
  }, []);

  // Called on final result — sets the TextInput and resets base
  const handleVoiceFinal = useCallback((transcript) => {
    const base = baseTextRef.current;
    const separator = base.length > 0 && !base.endsWith(' ') ? ' ' : '';
    setNewMessage(base + separator + transcript);
    baseTextRef.current = '';
  }, []);

  const {
    micState,
    voiceError,
    startListening,
    stopListening,
    destroyRecognizer,
  } = useVoiceToText({
    locale: 'en-IN',
    onTranscript: handleVoiceFinal,
    onPartial: handleVoicePartial,
  });
  const currentUserId = session?.user?.id;
  const senderName =
    session?.user?.user_metadata?.full_name || 'Staff Member';

  // ─────────────────────────────────────────────────────────────────
  // VALIDATE CONVERSATION ID
  // ─────────────────────────────────────────────────────────────────
  const validConversationId = isValidUUID(conversationId) ? conversationId : null;

  // ─────────────────────────────────────────────────────────────────
  // RESOLVE OTHER USER FROM CONVERSATION (deep-link path)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paramOtherUser && paramOtherUser.id) {
      // Full user object provided by inbox — no need to fetch
      setOtherUser(paramOtherUser);
      setResolvingUser(false);
      return;
    }

    if (!validConversationId || !currentUserId) {
      setResolvingUser(false);
      return;
    }

    // Resolve from Supabase (notification deep-link path)
    (async () => {
      setResolvingUser(true);
      try {
        const { data: participantRow, error: pErr } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('conversation_id', validConversationId)
          .neq('user_id', currentUserId)
          .limit(1)
          .single();

        if (pErr || !participantRow) {
          // Fallback: use whatever the notification title gave us, or generic
          setOtherUser(paramOtherUser || { full_name: 'Staff Member', role: 'Staff' });
          return;
        }

        const { data: userRow, error: uErr } = await supabase
          .from('app_users')
          .select('id, display_name, role, whatsapp')
          .eq('id', participantRow.user_id)
          .single();

        if (uErr || !userRow) {
          setOtherUser(
            paramOtherUser || {
              id: participantRow.user_id,
              full_name: 'Staff Member',
              role: 'Staff',
            }
          );
          return;
        }

        setOtherUser({
          id: userRow.id,
          full_name: userRow.display_name,
          role: userRow.role,
          whatsapp: userRow.whatsapp,
        });
      } catch {
        setOtherUser(paramOtherUser || { full_name: 'Staff Member', role: 'Staff' });
      } finally {
        setResolvingUser(false);
      }
    })();
  }, [validConversationId, currentUserId]);

  // ─────────────────────────────────────────────────────────────────
  // KEYBOARD LISTENER
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // MESSAGES + REALTIME
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!validConversationId) return;

    fetchMessages();

    // Register active chat to suppress duplicate in-app toasts
    setActiveChatId(validConversationId);

    if (currentUserId) {
      chatService.markMessagesAsRead(validConversationId, currentUserId);
      markEntityAsRead(validConversationId);
    }

    const channel = supabase
      .channel(`chat_${validConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${validConversationId}`,
        },
        (payload) => {
          setMessages(current => {
            if (current.some(m => m.id === payload.new.id)) {
              return current.map(m =>
                m.id === payload.new.id ? { ...payload.new, pending: false } : m
              );
            }
            if (payload.new.sender_id !== currentUserId) {
              chatService.markMessagesAsRead(validConversationId, currentUserId);
              markEntityAsRead(validConversationId);
            }
            return [payload.new, ...current];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${validConversationId}`,
        },
        (payload) => {
          setMessages(current =>
            current.map(m => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setActiveChatId(null);
    };
  }, [validConversationId, currentUserId]);

  // Destroy the speech recognizer when navigating away from chat
  useEffect(() => {
    return () => {
      destroyRecognizer();
    };
  }, [destroyRecognizer]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await chatService.getMessages(
      validConversationId,
      currentUserId
    );
    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !validConversationId) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    const tempId =
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    const tempMessage = {
      id: tempId,
      conversation_id: validConversationId,
      sender_id: currentUserId,
      message_text: textToSend,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true,
    };

    setMessages(current => [tempMessage, ...current]);

    await chatService.sendMessage(
      validConversationId,
      currentUserId,
      textToSend,
      otherUser?.id,
      senderName,
      tempId
    );
  };

  const handleCall = () => {
    if (otherUser && otherUser.whatsapp) {
      // Normalize number (remove spaces, dashes)
      let phone = otherUser.whatsapp.replace(/[\s-]/g, '');
      // If it starts with +91, we keep it. If it starts with 91 but doesn't have a +, add +.
      // If it's a 10 digit Indian number, prefix +91.
      if (phone.length === 10) {
        phone = '+91' + phone;
      } else if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Not Available', 'Phone number is not available for this staff member.');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedMessage(null);
  };

  const executeAction = (actionFn) => {
    closeActionSheet();
    setTimeout(() => {
      actionFn();
    }, 250);
  };

  const handleCopy = () => {
    if (selectedMessage) {
      const textToCopy = selectedMessage.message_text;
      executeAction(() => {
        Clipboard.setString(textToCopy);
        Alert.alert('Copied', 'Message copied to clipboard.');
      });
    }
  };

  const handleInfo = () => {
    if (selectedMessage) {
      const created = formatTime(selectedMessage.created_at);
      const read = selectedMessage.read_at ? formatTime(selectedMessage.read_at) : 'Not read yet';
      const pending = selectedMessage.pending ? 'Yes' : 'No';
      executeAction(() => {
        Alert.alert('Message Info', `Sent: ${created}\nRead: ${read}\nPending: ${pending}`);
      });
    }
  };

  const handleBlocked = (actionName) => {
    executeAction(() => {
      Alert.alert('Not Available', `${actionName} is pending Product Owner database migration approval.`);
    });
  };

  // ─────────────────────────────────────────────────────────────────
  // SEARCH LOGIC
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchActive || !searchQuery.trim()) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results = messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.message_text.toLowerCase().includes(query));
    
    setSearchResults(results);
    setSearchIndex(0);
  }, [searchQuery, searchActive, messages]);

  useEffect(() => {
    if (searchActive && searchResults.length > 0) {
      const match = searchResults[searchIndex];
      try {
        flatListRef.current?.scrollToIndex({ index: match.index, animated: true, viewPosition: 0.5 });
      } catch (e) {
        console.warn('Scroll to search result failed', e);
      }
    }
  }, [searchIndex, searchResults, searchActive]);

  const handleSearchNext = () => {
    if (searchResults.length > 0) {
      setSearchIndex((prev) => (prev + 1) % searchResults.length);
    }
  };

  const handleSearchPrev = () => {
    if (searchResults.length > 0) {
      setSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // INVALID CONVERSATION GUARD
  // ─────────────────────────────────────────────────────────────────
  if (!validConversationId) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <MaterialIcons name="error-outline" size={48} color={colors.outline} />
        <Text style={styles.errorText}>Conversation not found.</Text>
        <TouchableOpacity
          style={styles.errorBack}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER MESSAGE BUBBLE
  // ─────────────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item, index }) => {
    return (
      <MessageBubble
        item={item}
        nextItem={messages[index + 1]}
        index={index}
        currentUserId={currentUserId}
        searchActive={searchActive}
        searchResults={searchResults}
        searchIndex={searchIndex}
        onLongPress={handleLongPress}
      />
    );
  }, [messages, currentUserId, searchActive, searchResults, searchIndex]);

  // ─────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* ── Header ── */}
      <View
        style={[styles.topStickyHeader, { paddingTop: Math.max(insets.top, 8) }]}
      >
        {!searchActive ? (
          <View style={styles.contactCard}>
            <View style={styles.contactCardLeft}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backBtn, { marginRight: 4, width: 32, height: 32 }]}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.onSurface}
                />
              </TouchableOpacity>

              <View style={styles.contactAvatarWrapper}>
                <View style={styles.contactAvatar}>
                  {resolvingUser ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.contactAvatarText}>
                      {getInitials(otherUser?.full_name)}
                    </Text>
                  )}
                </View>
                <View style={styles.contactOnlineDotWrapper}>
                  <View style={styles.contactOnlineDot} />
                </View>
              </View>

              <View style={styles.contactInfo}>
                <View style={styles.contactNameRow}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {resolvingUser ? 'Loading…' : otherUser?.full_name || 'Staff'}
                  </Text>
                  <View style={styles.contactTag}>
                    <Text style={styles.contactTagText}>ASM</Text>
                  </View>
                </View>
                <Text style={styles.contactRole} numberOfLines={1}>
                  {otherUser?.role || 'Staff Member'} • Online
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.callBtn, { marginRight: 8 }]} onPress={() => setSearchActive(true)}>
              <MaterialIcons name="search" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <MaterialIcons name="call" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => setSearchActive(false)} style={[styles.backBtn, { marginRight: 8, width: 32, height: 32 }]}>
              <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversation..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchResults.length > 0 && (
              <View style={styles.searchNav}>
                <Text style={styles.searchCount}>{searchResults.length - searchIndex} / {searchResults.length}</Text>
                <TouchableOpacity onPress={handleSearchPrev} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-up" size={24} color={colors.onSurface} /></TouchableOpacity>
                <TouchableOpacity onPress={handleSearchNext} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-down" size={24} color={colors.onSurface} /></TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Messages ── */}
      <FlatList
        style={{ flex: 1 }}
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted={true}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Input bar ── */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message... / संदेश लिखें"
            placeholderTextColor={colors.onSurfaceVariant}
            value={newMessage}
            onChangeText={(text) => {
              // Keep baseText in sync when user types manually while mic is idle
              if (micState === MicState.IDLE) {
                baseTextRef.current = '';
              }
              setNewMessage(text);
            }}
            multiline
            maxLength={500}
          />
        </View>

        {/* ── Mic button — state-aware ── */}
        <TouchableOpacity
          style={[
            styles.micBtn,
            micState === MicState.LISTENING && styles.micBtnListening,
            micState === MicState.ERROR     && styles.micBtnError,
          ]}
          onPress={() => {
            if (micState === MicState.LISTENING || micState === MicState.PROCESSING) {
              stopListening();
            } else {
              // Capture current text as the prefix before mic starts
              baseTextRef.current = newMessage;
              startListening();
            }
          }}
          accessibilityLabel={
            micState === MicState.LISTENING ? 'Stop voice input' : 'Start voice input'
          }
        >
          {micState === MicState.PROCESSING ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : micState === MicState.LISTENING ? (
            <MaterialIcons name="mic" size={22} color={colors.error} />
          ) : micState === MicState.ERROR ? (
            <MaterialIcons name="mic-off" size={22} color={colors.error} />
          ) : (
            <MaterialIcons name="mic" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <MaterialIcons name="send" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Voice error message ── */}
      {voiceError ? (
        <View style={styles.voiceErrorBar}>
          <MaterialIcons name="info-outline" size={14} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={styles.voiceErrorText}>{voiceError}</Text>
        </View>
      ) : null}

      {/* ── Action Sheet ── */}
      <BottomSheetFoundation
        visible={actionSheetVisible}
        onClose={closeActionSheet}
        title="Message Actions"
      >
        {selectedMessage && (
          <View style={{ marginTop: 8, paddingBottom: insets.bottom || 16 }}>
            {/* Primary Actions */}
            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Reply')}>
              <MaterialIcons name="reply" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleCopy}>
              <MaterialIcons name="content-copy" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>

            {selectedMessage.sender_id === currentUserId && (
              <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Edit')}>
                <MaterialIcons name="edit" size={24} color={colors.onSurface} style={styles.actionIcon} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Forward')}>
              <MaterialIcons name="shortcut" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Forward</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Secondary Actions */}
            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Star')}>
              <MaterialIcons name="star-outline" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Star</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Pin')}>
              <MaterialIcons name="push-pin" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Pin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleInfo}>
              <MaterialIcons name="info-outline" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Info</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Translate')}>
              <MaterialIcons name="translate" size={24} color={colors.onSurface} style={styles.actionIcon} />
              <Text style={styles.actionText}>Translate</Text>
            </TouchableOpacity>

            {/* Destructive Actions */}
            {selectedMessage.sender_id === currentUserId && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => handleBlocked('Delete')}>
                  <MaterialIcons name="delete-outline" size={24} color={colors.error} style={styles.actionIcon} />
                  <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </BottomSheetFoundation>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 12,
    marginBottom: 20,
  },
  errorBack: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorBackText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topStickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(248, 249, 255, 0.95)',
    zIndex: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatarWrapper: {
    marginRight: 10,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  contactOnlineDotWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryFixed || '#a9f3c5',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryFixed || '#a9f3c5',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginRight: 6,
  },
  contactTag: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contactTagText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  contactRole: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  datePillContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  datePill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  datePillText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'column',
    marginBottom: 8,
    maxWidth: '85%',
  },
  messageWrapperMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageWrapperOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageBubbleMe: {
    backgroundColor: colors.primaryContainer || '#0d5c3a',
    borderTopRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 4,
  },
  messageText: {
    ...typography.bodyMd,
    lineHeight: 20,
  },
  messageTextMe: {
    color: colors.onPrimaryContainer || '#ffffff',
  },
  messageTextOther: {
    color: colors.onSurface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaRowMe: {
    justifyContent: 'flex-end',
  },
  metaRowOther: {
    justifyContent: 'flex-end',
  },
  timeText: {
    ...typography.bodySm,
  },
  timeTextMe: {
    color: colors.onPrimaryContainer || '#ffffff',
    opacity: 0.8,
  },
  timeTextOther: {
    color: colors.onSurfaceVariant,
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(248, 249, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginRight: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
    maxHeight: 100,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  micBtnListening: {
    backgroundColor: '#FEF2F2', // Soft red wash while listening
  },
  micBtnError: {
    backgroundColor: '#FEF2F2',
  },
  voiceErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.errorContainer,
  },
  voiceErrorText: {
    ...typography.bodySm,
    color: colors.onErrorContainer,
    flex: 1,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer || '#0d5c3a',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: 4,
  },
  actionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyLg,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
  },
  searchNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchCount: {
    ...typography.bodySm,
    marginRight: 8,
    color: colors.onSurfaceVariant,
  }
});
