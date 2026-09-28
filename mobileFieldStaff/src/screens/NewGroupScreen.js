import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { chatService } from '../services/ChatService';

export const NewGroupScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set());
  const [groupTitle, setGroupTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data, error } = await chatService.getStaffDirectory(session.user.id);
    if (!error && data) {
      setStaff(data);
    }
    setLoading(false);
  };

  const toggleSelection = (userId) => {
    const newSet = new Set(selectedStaffIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedStaffIds(newSet);
  };

  const handleCreateGroup = async () => {
    if (selectedStaffIds.size === 0) {
      Alert.alert('Error', 'Please select at least one staff member.');
      return;
    }
    if (!groupTitle.trim()) {
      Alert.alert('Error', 'Please enter a group name.');
      return;
    }

    setCreating(true);
    try {
      // In a real implementation this will call a new method in ChatService
      // For now we simulate the creation until the SQL migration is applied
      const { data, error } = await chatService.createGroupConversation(
        session.user.id,
        Array.from(selectedStaffIds),
        groupTitle.trim()
      );

      setCreating(false);
      
      if (error) {
        Alert.alert('Failed to create group', error.message || 'Please check database migrations.');
        return;
      }

      if (data && data.id) {
        navigation.replace('ChatConversation', {
          conversationId: data.id,
          otherUser: { full_name: groupTitle.trim(), isGroup: true }
        });
      }
    } catch (ex) {
      setCreating(false);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const filteredStaff = staff.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderStaffRow = ({ item }) => {
    const isSelected = selectedStaffIds.has(item.id);
    return (
      <TouchableOpacity 
        style={styles.staffRow}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.staffRowLeft}>
          <View style={styles.staffAvatarWrapper}>
            <View style={[styles.staffAvatar, isSelected && styles.staffAvatarSelected]}>
              <Text style={styles.staffAvatarText}>{getInitials(item.full_name)}</Text>
            </View>
          </View>
          <View style={styles.staffInfo}>
            <Text style={styles.staffName} numberOfLines={1}>{item.full_name || 'Unknown'}</Text>
            <Text style={styles.staffRole} numberOfLines={1}>{item.role || 'Staff'}</Text>
          </View>
        </View>
        <MaterialIcons 
          name={isSelected ? "check-circle" : "radio-button-unchecked"} 
          size={24} 
          color={isSelected ? colors.primary : colors.outlineVariant} 
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText}>New Group</Text>
            <Text style={styles.headerSubText}>{selectedStaffIds.size} selected</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.createBtn, (!groupTitle.trim() || selectedStaffIds.size === 0) && styles.createBtnDisabled]}
            onPress={handleCreateGroup}
            disabled={!groupTitle.trim() || selectedStaffIds.size === 0 || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.createBtnText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.groupInfoContainer}>
        <View style={styles.groupAvatarPlaceholder}>
          <MaterialIcons name="groups" size={28} color={colors.onSurfaceVariant} />
        </View>
        <TextInput
          style={styles.groupNameInput}
          placeholder="Group Subject"
          placeholderTextColor={colors.outline}
          value={groupTitle}
          onChangeText={setGroupTitle}
          maxLength={50}
        />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search colleagues..."
            placeholderTextColor={colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredStaff}
        keyExtractor={(item) => item.id}
        renderItem={renderStaffRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No colleagues found</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  headerTitleContainer: { justifyContent: 'center' },
  headerTitleText: { ...typography.titleLg, color: colors.onSurface },
  headerSubText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  createBtnText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  groupAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groupNameInput: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.onSurface,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  clearBtn: { padding: 4 },
  listContent: { paddingBottom: 24 },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  staffRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  staffAvatarWrapper: { marginRight: 12 },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarSelected: {
    backgroundColor: colors.primaryContainer,
  },
  staffAvatarText: { ...typography.titleMd, color: colors.onSurfaceVariant },
  staffInfo: { flex: 1, justifyContent: 'center' },
  staffName: { ...typography.bodyLg, color: colors.onSurface },
  staffRole: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { ...typography.titleMd, color: colors.onSurfaceVariant },
});
