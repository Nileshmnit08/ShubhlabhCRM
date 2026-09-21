import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/ChatService';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

import { useNotifications } from '../context/NotificationContext';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

export const ChatConversationScreen = ({ route, navigation }) => {
  const { conversationId, otherUser } = route.params;
  const { session } = useAuth();
  const { setActiveChatId } = useNotifications();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef();
  
  const currentUserId = session?.user?.id;
  const senderName = session?.user?.user_metadata?.full_name || 'Staff Member';

  useEffect(() => {
    fetchMessages();
    
    // Register active chat to suppress duplicate notifications
    setActiveChatId(conversationId);
    
    // Mark messages as read
    if (currentUserId) {
      chatService.markMessagesAsRead(conversationId, currentUserId);
    }

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(current => {
            if (current.some(m => m.id === payload.new.id)) return current;
            // Mark read if it's from the other person
            if (payload.new.sender_id !== currentUserId) {
              chatService.markMessagesAsRead(conversationId, currentUserId);
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
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(current => 
            current.map(m => m.id === payload.new.id ? payload.new : m)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setActiveChatId(null);
    };
  }, [conversationId, currentUserId, setActiveChatId]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await chatService.getMessages(conversationId);
    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId) return;
    
    const textToSend = newMessage.trim();
    setNewMessage('');
    
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      message_text: textToSend,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true
    };
    
    setMessages(current => [tempMessage, ...current]);
    
    await chatService.sendMessage(conversationId, currentUserId, textToSend, otherUser?.id, senderName);
  };

  const handleCall = () => {
    // In a real app, use the actual phone number
    Linking.openURL('tel:+919876543210');
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === currentUserId;
    
    return (
      <View style={[
        styles.messageWrapper,
        isMe ? styles.messageWrapperMe : styles.messageWrapperOther
      ]}>
        <View style={[
          styles.messageBubble,
          isMe ? styles.messageBubbleMe : styles.messageBubbleOther
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.messageTextMe : styles.messageTextOther
          ]}>
            {item.message_text}
          </Text>
          
          <View style={[styles.metaRow, isMe ? styles.metaRowMe : styles.metaRowOther]}>
            <Text style={[
              styles.timeText,
              isMe ? styles.timeTextMe : styles.timeTextOther
            ]}>
              {formatTime(item.created_at)}
            </Text>
            {isMe && !item.pending && (
              <MaterialIcons 
                name={item.read_at ? "done-all" : "done"} 
                size={14} 
                color={item.read_at ? colors.primaryFixed || '#a9f3c5' : (colors.onPrimaryContainer || '#ffffff')} 
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
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitleText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerTitleText}>Chat Conversation</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.syncBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.syncText}>Synced</Text>
          </View>
        </View>
      </View>

      <View style={styles.topStickyHeader}>
        <View style={styles.contactCard}>
          <View style={styles.contactCardLeft}>
            <View style={styles.contactAvatarWrapper}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>{getInitials(otherUser?.full_name)}</Text>
              </View>
              <View style={styles.contactOnlineDotWrapper}>
                <View style={styles.contactOnlineDot} />
              </View>
            </View>
            <View style={styles.contactInfo}>
              <View style={styles.contactNameRow}>
                <Text style={styles.contactName} numberOfLines={1}>{otherUser?.full_name || 'Staff'}</Text>
                <View style={styles.contactTag}>
                  <Text style={styles.contactTagText}>ASM</Text>
                </View>
              </View>
              <Text style={styles.contactRole} numberOfLines={1}>{otherUser?.role || 'Staff Member'} • Online</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <MaterialIcons name="call" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted={true}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.datePillContainer}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>
                Today • {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message... / संदेश लिखें"
            placeholderTextColor={colors.onSurfaceVariant}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity 
          style={styles.sendBtn}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <MaterialIcons name="send" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    marginLeft: 4,
    flex: 1,
  },
  headerSubtitleText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  headerTitleText: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  headerRight: {
    paddingRight: 8,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFixed || '#a9f3c5',
    paddingHorizontal: 8,
    height: 32,
    borderRadius: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  syncText: {
    ...typography.labelSm,
    color: colors.onPrimaryFixed || '#002111',
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
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
    paddingVertical: 8,
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
    maxHeight: 100,
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
  }
});
