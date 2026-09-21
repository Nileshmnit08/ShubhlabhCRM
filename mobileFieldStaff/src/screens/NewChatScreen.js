import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { chatService } from '../services/ChatService';

export const NewChatScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

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

  const startChat = async () => {
    if (!selectedStaff || !session?.user?.id) {
      return;
    }
    
    if (selectedStaff.id === session.user.id) {
      return;
    }

    setCreatingChat(true);
    
    try {
      const { data, error } = await chatService.getOrCreateConversation(
        session.user.id,
        selectedStaff.id,
        selectedStaff
      );
      
      setCreatingChat(false);
      setModalVisible(false);
      
      if (error) {
        console.error(`Failed to create/get conversation!`, error);
        return;
      }
      
      if (data && data.id) {
        // Small delay to allow modal to close smoothly
        setTimeout(() => {
          navigation.replace('ChatConversation', {
            conversationId: data.id,
            otherUser: selectedStaff
          });
        }, 300);
      } else {
        console.error(`Navigation failed: data.id is null!`);
      }
    } catch (ex) {
      console.error(`Exception in startChat:`, ex);
      setCreatingChat(false);
      setModalVisible(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const filteredStaff = staff.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickConnectStaff = filteredStaff.slice(0, 2);
  const remainingStaff = filteredStaff; // Or slice(2) if we don't want them in both

  const handleStaffPress = (user) => {
    setSelectedStaff(user);
    setModalVisible(true);
  };

  const renderQuickCard = (user, index) => {
    const isFirst = index === 0;
    return (
      <TouchableOpacity 
        key={user.id} 
        style={styles.quickCard}
        onPress={() => handleStaffPress(user)}
        activeOpacity={0.7}
      >
        <View style={styles.quickCardTop}>
          <View>
            <View style={[styles.quickAvatar, isFirst ? styles.quickAvatarPrimary : styles.quickAvatarTertiary]}>
              <Text style={styles.quickAvatarText}>{getInitials(user.full_name)}</Text>
            </View>
            <View style={styles.quickOnlineDotWrapper}>
              <View style={styles.quickOnlineDot} />
            </View>
          </View>
          <View style={[styles.quickRolePill, isFirst ? styles.quickRolePillSecondary : styles.quickRolePillTertiary]}>
            <MaterialIcons name={isFirst ? "verified-user" : "warehouse"} size={12} color={isFirst ? colors.onSecondaryFixed || '#2f1500' : colors.onTertiaryFixed || '#111c2d'} />
            <Text style={[styles.quickRoleText, isFirst ? {color: colors.onSecondaryFixed} : {color: colors.onTertiaryFixed}]}>
              {isFirst ? 'Lead' : 'Depot'}
            </Text>
          </View>
        </View>
        <Text style={styles.quickName} numberOfLines={1}>{user.full_name}</Text>
        <Text style={styles.quickRoleDesc} numberOfLines={1}>{user.role || 'Staff'}</Text>
        <View style={styles.quickStatusRow}>
          <View style={styles.quickOnlineDotSmall} />
          <Text style={styles.quickStatusText} numberOfLines={1}>Online</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStaffRow = ({ item }) => (
    <TouchableOpacity 
      style={styles.staffRow}
      onPress={() => handleStaffPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.staffRowLeft}>
        <View style={styles.staffAvatarWrapper}>
          <View style={styles.staffAvatar}>
            <Text style={styles.staffAvatarText}>{getInitials(item.full_name)}</Text>
          </View>
          <View style={styles.staffOnlineDotWrapper}>
            <View style={styles.staffOnlineDot} />
          </View>
        </View>
        <View style={styles.staffInfo}>
          <View style={styles.staffNameRow}>
            <Text style={styles.staffName} numberOfLines={1}>{item.full_name || 'Unknown'}</Text>
            <View style={styles.staffTag}>
              <Text style={styles.staffTagText}>Staff</Text>
            </View>
          </View>
          <Text style={styles.staffRole} numberOfLines={1}>{item.role || 'Field Staff'}</Text>
          <View style={styles.staffStatusRow}>
            <View style={styles.staffOnlineDotSmall} />
            <Text style={styles.staffStatusText} numberOfLines={1}>Online</Text>
          </View>
        </View>
      </View>
      <MaterialIcons name="arrow-forward-ios" size={18} color={colors.outline} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitleText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerTitleText}>New Chat — Staff Directory</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.syncBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.syncText}>Synced</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={remainingStaff}
        keyExtractor={(item) => item.id}
        renderItem={renderStaffRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.contextHeader}>
              <View style={styles.contextHeaderRow}>
                <View style={styles.contextIconRow}>
                  <MaterialIcons name="group-add" size={16} color={colors.primary} />
                  <Text style={styles.contextTitle}>Select Colleague • सहकर्मी चुनें</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{filteredStaff.length} Active</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={22} color={colors.onSurfaceVariant} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type name or department... / नाम या विभाग"
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

            {quickConnectStaff.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialIcons name="bolt" size={18} color={colors.secondary} />
                    <Text style={styles.sectionTitle}>Quick Connect / Supervisors</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>तुरंत संपर्क</Text>
                </View>
                <View style={styles.quickGrid}>
                  {quickConnectStaff.map((user, index) => renderQuickCard(user, index))}
                </View>
              </View>
            )}

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="badge" size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>All Staff Directory</Text>
                </View>
                <Text style={styles.sectionSubtitleText}>सभी सहकर्मी ({remainingStaff.length})</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <MaterialIcons name="person-search" size={26} color={colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>No Staff Found</Text>
              <Text style={styles.emptySubtitle}>कोई सहकर्मी नहीं मिला। Check the spelling or search by department name.</Text>
            </View>
          )
        }
      />

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={() => {}} // Block tap from closing modal
          >
            <View style={styles.modalHandle} />
            
            {selectedStaff && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{getInitials(selectedStaff.full_name)}</Text>
                  </View>
                  <View style={styles.modalHeaderInfo}>
                    <Text style={styles.modalName} numberOfLines={1}>{selectedStaff.full_name}</Text>
                    <Text style={styles.modalRole} numberOfLines={1}>{selectedStaff.role || 'Staff Member'}</Text>
                  </View>
                </View>

                <View style={styles.modalNotice}>
                  <MaterialIcons name="chat-bubble" size={20} color={colors.primary} />
                  <Text style={styles.modalNoticeText}>Initiating direct staff-to-staff chat thread / सीधा संवाद शुरू करें</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalBtnCancel} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>Cancel / रद्द</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.modalBtnConfirm} 
                    onPress={startChat}
                    disabled={creatingChat}
                  >
                    {creatingChat ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <Text style={styles.modalBtnConfirmText}>Start Chat</Text>
                        <MaterialIcons name="send" size={18} color={colors.onPrimary} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  contextHeader: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  contextHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextTitle: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginLeft: 6,
  },
  activeBadge: {
    backgroundColor: colors.primaryFixed || '#a9f3c5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  sectionSubtitle: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '600',
  },
  sectionSubtitleText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    width: '48%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  quickAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAvatarPrimary: {
    backgroundColor: colors.primary,
  },
  quickAvatarTertiary: {
    backgroundColor: colors.tertiary || '#2f3a4d',
  },
  quickAvatarText: {
    ...typography.headlineSm,
    color: colors.onPrimary,
  },
  quickOnlineDotWrapper: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryFixed || '#a9f3c5',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  quickRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickRolePillSecondary: {
    backgroundColor: colors.secondaryFixed || '#ffdcc3',
  },
  quickRolePillTertiary: {
    backgroundColor: colors.tertiaryFixed || '#d8e3fb',
  },
  quickRoleText: {
    ...typography.labelSm,
    marginLeft: 2,
  },
  quickName: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  quickRoleDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  quickStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quickOnlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  quickStatusText: {
    ...typography.labelSm,
    color: colors.primary,
  },
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    minHeight: 64,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  staffRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatarWrapper: {
    marginRight: 12,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    ...typography.headlineSm,
    color: colors.primary,
  },
  staffOnlineDotWrapper: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryFixed || '#a9f3c5',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginRight: 8,
  },
  staffTag: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  staffTagText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  staffRole: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  staffStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  staffOnlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  staffStatusText: {
    ...typography.labelSm,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 32,
    marginTop: 8,
  },
  emptyIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(33, 49, 69, 0.4)', // inverse-surface with opacity
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    ...typography.headlineMd,
    color: colors.onPrimary,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalName: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  modalRole: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  modalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalNoticeText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtnCancel: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  modalBtnCancelText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  modalBtnConfirm: {
    flex: 1,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalBtnConfirmText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    marginRight: 6,
  }
});
