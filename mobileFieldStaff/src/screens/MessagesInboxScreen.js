import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { chatService } from '../services/ChatService';
import { useIsFocused } from '@react-navigation/native';

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
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchConversations = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data, error } = await chatService.getConversations(session.user.id);
    if (!error && data) {
      // In a real app, we might fetch unread counts per conversation.
      // For now, we'll just mock unread counts for the design fidelity.
      const mappedData = data.map((conv, idx) => ({
        ...conv,
        unreadCount: idx === 0 ? 2 : (idx === 1 ? 1 : 0),
        category: idx === 0 ? 'hq' : 'depot',
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

  const getLeftAccentColor = (category, unread) => {
    if (unread > 0) {
      if (category === 'hq') return colors.secondaryContainer;
      return colors.primary;
    }
    return 'transparent';
  };

  const filteredConversations = conversations.filter(conv => {
    const nameMatch = (conv.otherUser?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const filterMatch = activeFilter === 'all' || conv.category === activeFilter;
    return nameMatch && filterMatch;
  });

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.leftAccent, 
        { backgroundColor: getLeftAccentColor(item.category, item.unreadCount) }
      ]} />
      
      <View style={styles.cardContent}>
        <View style={styles.avatarWrapper}>
          <View style={[
            styles.avatar, 
            item.unreadCount > 0 && item.category === 'depot' ? styles.avatarPrimary : styles.avatarSecondary
          ]}>
            <Text style={[
              styles.avatarText,
              item.unreadCount > 0 && item.category === 'depot' ? styles.avatarTextPrimary : styles.avatarTextSecondary
            ]}>
              {getInitials(item.otherUser?.full_name)}
            </Text>
          </View>
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

          <View style={styles.roleRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {item.otherUser?.role || 'Staff'}
              </Text>
            </View>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewText} numberOfLines={1}>
              Last message preview would go here...
            </Text>
            {item.unreadCount > 0 ? (
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
    <View style={styles.container}>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={filteredConversations.length === 0 ? styles.flexGrow : styles.listPadding}
        refreshing={loading}
        onRefresh={fetchConversations}
        ListHeaderComponent={
          <>
            <View style={styles.headerStrip}>
              <View>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>Messages</Text>
                  <Text style={styles.headerTitleHindi}> / संदेश</Text>
                </View>
                <Text style={styles.headerSubtitle}>Internal Field Network • आंतरिक स्टाफ संवाद</Text>
              </View>
              <View style={styles.totalUnreadBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.totalUnreadText}>3 Unread</Text>
              </View>
            </View>

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
                style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
                onPress={() => setActiveFilter('all')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>All Messages</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, activeFilter === 'hq' && styles.filterChipActive]}
                onPress={() => setActiveFilter('hq')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'hq' && styles.filterChipTextActive]}>HQ / Managers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, activeFilter === 'depot' && styles.filterChipActive]}
                onPress={() => setActiveFilter('depot')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'depot' && styles.filterChipTextActive]}>Indore Depot</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={48} color={colors.outline} />
              <Text style={styles.emptyTitle}>No staff found</Text>
              <Text style={styles.emptySubtitle}>कोई सहकर्मी नहीं मिला। नाम या पद दोबारा जांचें।</Text>
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
    </View>
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
    backgroundColor: colors.primaryFixed || '#a9f3c5',
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
    color: colors.onPrimaryFixed || '#002111',
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
    backgroundColor: colors.primaryFixed || '#a9f3c5',
  },
  avatarSecondary: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  avatarText: {
    ...typography.headlineSm,
    fontWeight: 'bold',
  },
  avatarTextPrimary: {
    color: colors.onPrimaryFixed || '#002111',
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
    color: colors.secondary || '#904d00',
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
    backgroundColor: colors.secondaryContainer || '#fe932c',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer || '#663500',
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
  }
});
