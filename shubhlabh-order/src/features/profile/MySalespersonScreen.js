import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import SLHeader from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import {
  Users,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  AlertCircle,
  Headset,
  RefreshCw
} from 'lucide-react-native';
import { SUPPORT_PHONE_NUMBER } from '../../shared/components/GlobalHelpFab';

export default function MySalespersonScreen({ navigation }) {
  const { t } = useTranslation();
  const { customerProfile } = useAuth();
  const [salesperson, setSalesperson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSalesperson = useCallback(async () => {
    if (!customerProfile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Canonical PostgREST query on crm_parties:
      // Retrieves assigned_owner_id, denormalized owner_name & territory_name,
      // and attempts the FK embedding via crm_parties_assigned_owner_id_fkey.
      const { data, error: queryError } = await supabase
        .from('crm_parties')
        .select(`
          id,
          assigned_owner_id,
          owner_name,
          territory_name,
          owner:app_users!crm_parties_assigned_owner_id_fkey (
            id,
            display_name,
            role,
            mobile,
            whatsapp,
            email
          )
        `)
        .eq('id', customerProfile.id)
        .single();

      if (queryError) {
        console.warn('MySalesperson: crm_parties query error:', queryError);
        setError(queryError.message || 'Failed to query CRM party');
        setSalesperson(null);
        return;
      }

      if (data?.owner && data.owner.display_name) {
        // Full salesperson record returned via FK embedding
        setSalesperson({
          id: data.owner.id,
          display_name: data.owner.display_name,
          role: data.owner.role || t('profile.salespersonDesignation'),
          mobile: data.owner.mobile || null,
          whatsapp: data.owner.whatsapp || data.owner.mobile || null,
          email: data.owner.email || null,
          territory: data.territory_name || null,
        });
      } else if (data?.owner_name) {
        // Fallback: CRM party has denormalized owner_name
        setSalesperson({
          display_name: data.owner_name,
          role: t('profile.salespersonDesignation'),
          mobile: null,
          whatsapp: null,
          email: null,
          territory: data.territory_name || null,
        });
      } else {
        // Unassigned or salesperson profile restricted
        setSalesperson(null);
      }
    } catch (err) {
      console.warn('MySalesperson: fetch exception:', err);
      setError(err?.message || 'Error fetching salesperson');
      setSalesperson(null);
    } finally {
      setLoading(false);
    }
  }, [customerProfile, t]);

  useEffect(() => {
    fetchSalesperson();
  }, [fetchSalesperson]);

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const tel = `tel:${cleanNumber}`;
    Linking.canOpenURL(tel).then((supported) => {
      if (supported) Linking.openURL(tel);
      else Alert.alert(t('common.error') || 'Error', 'Cannot place phone call from this device.');
    }).catch(() => {
      Alert.alert(t('common.error') || 'Error', 'Failed to initiate phone call.');
    });
  };

  const handleWhatsApp = (phoneNumber, name = 'Representative') => {
    if (!phoneNumber) return;
    const digits = phoneNumber.replace(/\D/g, '');
    const cleanDigits = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
    const greeting = `Hello ${name}, I am contacting you from Shubh Labh Buyer App regarding an order.`;
    const url = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(greeting)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error') || 'Error', 'WhatsApp is not installed on this device.');
    });
  };

  const getInitials = (name) => {
    if (!name) return 'SL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader
        title={t('profile.mySalesperson')}
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateCenter}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.stateLoadingText}>
              {t('profile.salespersonSubtitle') || 'Loading salesperson details...'}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <AlertCircle size={44} color={theme.colors.error} style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle}>{t('profile.salespersonLoadError')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchSalesperson}>
              <RefreshCw size={16} color={theme.colors.white} />
              <Text style={styles.retryBtnText}>{t('profile.salespersonRetry')}</Text>
            </TouchableOpacity>
          </View>
        ) : salesperson ? (
          <View style={styles.container}>
            {/* Top Verified Banner */}
            <View style={styles.verifiedBanner}>
              <ShieldCheck size={16} color="#059669" />
              <Text style={styles.verifiedBannerText}>
                {t('profile.activeAccount') || 'Official Shubh Labh Representative'}
              </Text>
            </View>

            {/* Profile Identity Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {getInitials(salesperson.display_name)}
                </Text>
              </View>

              <Text style={styles.salespersonName}>{salesperson.display_name}</Text>
              
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {salesperson.role || t('profile.salespersonDesignation')}
                </Text>
              </View>

              <View style={styles.companyRow}>
                <Building2 size={14} color={theme.colors.textSecondary} />
                <Text style={styles.companyText}>
                  {t('profile.salespersonCompany')}
                </Text>
              </View>
            </View>

            {/* Key Assignment Details Card */}
            <View style={styles.detailsCard}>
              {salesperson.territory && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    <MapPin size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>{t('profile.salespersonTerritory')}</Text>
                    <Text style={styles.detailValue}>{salesperson.territory}</Text>
                  </View>
                </View>
              )}

              {salesperson.mobile && (
                <View style={[styles.detailRow, salesperson.territory && styles.detailRowBorder]}>
                  <View style={styles.detailIconBox}>
                    <Phone size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>{t('profile.salespersonPhone')}</Text>
                    <Text style={styles.detailValue}>{salesperson.mobile}</Text>
                  </View>
                </View>
              )}

              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <View style={styles.detailIconBox}>
                  <Clock size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>{t('profile.supportSection') || 'Support Hours'}</Text>
                  <Text style={styles.detailValue}>{t('profile.salespersonWorkingHours')}</Text>
                </View>
              </View>
            </View>

            {/* Direct Contact Action Buttons */}
            {salesperson.mobile && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() => handleCall(salesperson.mobile)}
                  activeOpacity={0.85}
                >
                  <Phone size={20} color={theme.colors.white} />
                  <Text style={styles.actionBtnText}>
                    {t('profile.salespersonCallBtn')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.whatsappBtn]}
                  onPress={() => handleWhatsApp(salesperson.whatsapp || salesperson.mobile, salesperson.display_name)}
                  activeOpacity={0.85}
                >
                  <MessageCircle size={20} color={theme.colors.white} />
                  <Text style={styles.actionBtnText}>
                    {t('profile.salespersonWhatsAppBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Redesigned Premium Empty / Unassigned State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Headset size={44} color={theme.colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>
              {t('profile.salespersonUnassignedTitle')}
            </Text>

            <Text style={styles.emptyDescription}>
              {t('profile.salespersonUnassignedDesc')}
            </Text>

            {/* Central Support Card */}
            <View style={styles.supportCard}>
              <View style={styles.supportHeader}>
                <Building2 size={20} color={theme.colors.primary} />
                <Text style={styles.supportHeaderText}>
                  {t('profile.centralSupport')}
                </Text>
              </View>

              <Text style={styles.supportPhone}>+91 {SUPPORT_PHONE_NUMBER}</Text>
              <Text style={styles.supportHoursText}>{t('profile.supportHours')}</Text>

              <View style={styles.supportActions}>
                <TouchableOpacity
                  style={[styles.supportBtn, styles.supportCallBtn]}
                  onPress={() => handleCall(SUPPORT_PHONE_NUMBER)}
                  activeOpacity={0.85}
                >
                  <Phone size={18} color={theme.colors.white} />
                  <Text style={styles.supportBtnText}>
                    {t('profile.contactSupport')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.supportBtn, styles.supportWaBtn]}
                  onPress={() => handleWhatsApp(SUPPORT_PHONE_NUMBER, 'Shubh Labh Support')}
                  activeOpacity={0.85}
                >
                  <MessageCircle size={18} color={theme.colors.white} />
                  <Text style={styles.supportBtnText}>
                    {t('profile.chatSupport')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 36,
  },
  stateCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  stateLoadingText: {
    marginTop: 14,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 40,
  },
  errorTitle: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Assigned State Styles
  container: {
    flex: 1,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  verifiedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.3,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFEDD5',
    borderWidth: 3,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  salespersonName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  actionsContainer: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  callBtn: {
    backgroundColor: theme.colors.primary,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  supportCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    elevation: 1,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  supportHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  supportPhone: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  supportHoursText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  supportActions: {
    width: '100%',
    gap: 10,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  supportCallBtn: {
    backgroundColor: theme.colors.primary,
  },
  supportWaBtn: {
    backgroundColor: '#25D366',
  },
  supportBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
