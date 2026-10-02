import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { chatService } from '../services/ChatService';
import { useIsFocused } from '@react-navigation/native';
import { BottomSheetFoundation } from '../components/BottomSheet';
import { AppHeader } from '../components';

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  return `${diffInDays}d ago`;
};

export const MessagesInboxScreen = ({ navigation }) => {
  const { session } = useAuth();
  const isFocused = useIsFocused();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('TEAM');

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleLongPress = (conversation) => {
    setSelectedConversation(conversation);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedConversation(null);
  };

  const handleBlocked = (actionName) => {
    Alert.alert('Not Available', `${actionName} is pending Product Owner database migration approval.`);
    closeActionSheet();
  };

  const handleMarkAsRead = async () => {
    if (selectedConversation) {
      await chatService.markMessagesAsRead(selectedConversation.id, session?.user?.id);
      fetchConversations();
    }
    closeActionSheet();
  };

  const fetchConversations = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data, error } = await chatService.getConversations(session.user.id);
    if (!error && data) {
      const mappedData = data.map((conv, idx) => ({
        ...conv,
        isOnline: idx < 2
      }));
      setConversations(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isFocused) {
      fetchConversations();
    }
  }, [isFocused, session]);

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatConversation', { 
      conversationId: conversation.id,
      otherUser: conversation.otherUser 
    });
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getLeftAccentColor = (type, unread) => {
    if (unread > 0) {
      if (type === 'ADMIN_STAFF') return colors.secondaryContainer;
      return colors.primary;
    }
    return 'transparent';
  };

  const filteredConversations = conversations.filter(conv => {
    const nameMatch = (conv.otherUser?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const filterMatch = conv.type === activeFilter;
    return nameMatch && filterMatch;
  });

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatCard, item.pending && { opacity: 0.8 }]}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.leftAccent, 
        { backgroundColor: getLeftAccentColor(item.type, item.unreadCount) }
      ]} />
      
      <View style={styles.cardContent}>
        <View style={styles.avatarWrapper}>
          {item.otherUser?.isGroup ? (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="groups" size={24} color={colors.onPrimary} />
            </View>
          ) : (
            <View style={[
              styles.avatar, 
              item.unreadCount > 0 && item.type === 'ADMIN_STAFF' ? styles.avatarPrimary : styles.avatarSecondary
            ]}>
              <Text style={[
                styles.avatarText,
                item.unreadCount > 0 && item.type === 'ADMIN_STAFF' ? styles.avatarTextPrimary : styles.avatarTextSecondary
              ]}>
                {getInitials(item.otherUser?.full_name)}
              </Text>
            </View>
          )}
          {item.isOnline && (
            <View style={styles.onlineDotWrapper}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {item.otherUser?.full_name || 'Unknown User'}
            </Text>
            <Text style={[
              styles.timeText,
              item.unreadCount > 0 ? styles.timeTextUnread : null
            ]}>
              {getRelativeTime(item.updated_at)}
            </Text>
          </View>

          {!item.otherUser?.isGroup && (
            <View style={styles.roleRow}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>
                  {item.otherUser?.role || 'Staff'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.previewRow}>
            <Text style={[styles.previewText, (item.pending || item.latest_pending) && { fontStyle: 'italic' }]} numberOfLines={1}>
              {item.latest_message || 'Started a new conversation'}
            </Text>
            {item.pending || item.latest_pending ? (
              <MaterialIcons name="schedule" size={16} color={colors.outline} />
            ) : item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : (
              <MaterialIcons name="done-all" size={16} color={colors.primary} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader variant="A" title="Messages / संदेश" subtitle="Internal Field Network • आंतरिक स्टाफ संवाद" />
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={filteredConversations.length === 0 ? styles.flexGrow : styles.listPadding}
        refreshing={loading}
        onRefresh={fetchConversations}
        ListHeaderComponent={
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={22} color={colors.primary} />
                <View style={styles.searchInputWrapper}>
                  <Text style={styles.searchLabel}>सहकर्मी खोजें • Quick Directory</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search staff by name or role..."
                    placeholderTextColor={colors.outline}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                    <MaterialIcons name="close" size={18} color={colors.outline} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.filterScroll}>
              <TouchableOpacity 
                style={[styles.filterChip, activeFilter === 'TEAM' && styles.filterChipActive]}
                onPress={() => setActiveFilter('TEAM')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'TEAM' && styles.filterChipTextActive]}>Team Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, activeFilter === 'ADMIN_STAFF' && styles.filterChipActive]}
                onPress={() => setActiveFilter('ADMIN_STAFF')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'ADMIN_STAFF' && styles.filterChipTextActive]}>Admin Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, activeFilter === 'DIRECT_CHAT' && styles.filterChipActive]}
                onPress={() => setActiveFilter('DIRECT_CHAT')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'DIRECT_CHAT' && styles.filterChipTextActive]}>Direct Chat</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color={colors.outline} />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'TEAM' ? 'No team conversations yet' : 'No staff conversations yet'}
              </Text>
              <Text style={styles.emptySubtitle}>Start a chat to connect with staff.</Text>
              <TouchableOpacity style={styles.emptyActionBtn} onPress={() => navigation.navigate('NewChat')}>
                <Text style={styles.emptyActionText}>Start a chat</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="chat-bubble" size={22} color={colors.onPrimary} />
        <View style={styles.fabTextContainer}>
          <Text style={styles.fabTextMain}>+ New Chat</Text>
          <Text style={styles.fabTextSub}>नया संदेश</Text>
        </View>
      </TouchableOpacity>

      <BottomSheetFoundation
        visible={actionSheetVisible}
        onClose={closeActionSheet}
        title="Conversation Actions"
      >
        {selectedConversation && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ ...typography.titleMd, marginBottom: 16 }}>{selectedConversation.otherUser?.full_name}</Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={() => { closeActionSheet(); handleConversationPress(selectedConversation); }}>
              <Text style={styles.actionText}>Open Conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleMarkAsRead}>
              <Text style={styles.actionText}>Mark as read</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Mark as unread')}>
              <Text style={styles.actionText}>Mark as unread</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Mute')}>
              <Text style={styles.actionText}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Pin')}>
              <Text style={styles.actionText}>📌 Pin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleBlocked('Archive')}>
              <Text style={styles.actionText}>Archive</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetFoundation>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flexGrow: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 80,
  },
  listPadding: {
    padding: 16,
    paddingBottom: 80,
  },
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  headerTitleHindi: {
    ...typography.headlineSm,
    color: colors.onSurfaceVariant,
    fontWeight: 'normal',
    marginLeft: 4,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  totalUnreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  totalUnreadText: {
    ...typography.labelSm,
    fontWeight: 'bold',
    color: colors.onPrimaryContainer,
  },
  searchContainer: {
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInputWrapper: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  searchLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  searchInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0,
    margin: 0,
    height: 20,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  chatCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  leftAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPrimary: {
    backgroundColor: colors.primaryContainer,
  },
  avatarSecondary: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  avatarText: {
    ...typography.headlineSm,
    fontWeight: 'bold',
  },
  avatarTextPrimary: {
    color: colors.onPrimaryContainer,
  },
  avatarTextSecondary: {
    color: colors.primary,
  },
  onlineDotWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  nameText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: 'bold',
    flex: 1,
  },
  timeText: {
    ...typography.labelSm,
    color: colors.outline,
    marginLeft: 8,
  },
  timeTextUnread: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  rolePill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rolePillText: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    ...typography.labelSm,
    color: colors.onAccent,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: colors.primaryContainer,
    borderRadius: 26,
    height: 52,
    paddingLeft: 16,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabTextContainer: {
    marginLeft: 8,
  },
  fabTextMain: {
    ...typography.labelLg,
    color: colors.onPrimaryContainer || colors.onPrimary,
    fontWeight: 'bold',
  },
  fabTextSub: {
    fontSize: 10,
    color: colors.onPrimaryContainer || colors.onPrimary,
  },
  actionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  actionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  emptyActionBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  }
});
