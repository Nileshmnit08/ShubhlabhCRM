import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { supabase } from '../../core/api/supabase';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../../shared/localization/i18n';
import { useNotifications } from '../notifications/NotificationContext';
import {
  Award,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Layers,
  Gift,
  Sparkles,
  Package,
  Megaphone,
  Truck,
  AlertCircle,
  Bell,
  MessageCircle,
  FileText,
  Paperclip,
  Users,
  RotateCcw,
} from 'lucide-react-native';

const SUPPORT_PHONE = '9461924461';

function getCategoryIcon(type, color = '#EA580C', size = 15) {
  const key = String(type || '').toUpperCase();
  switch (key) {
    case 'PRICE_UPDATE':
      return <TrendingUp size={size} color={color} />;
    case 'RAW_MATERIAL_UPDATE':
      return <Layers size={size} color={color} />;
    case 'SCHEME':
      return <Award size={size} color={color} />;
    case 'REWARD':
      return <Gift size={size} color={color} />;
    case 'OFFER':
      return <Sparkles size={size} color={color} />;
    case 'PRODUCT_UPDATE':
      return <Package size={size} color={color} />;
    case 'ANNOUNCEMENT':
      return <Megaphone size={size} color={color} />;
    case 'SUPPLY_UPDATE':
      return <Truck size={size} color={color} />;
    case 'IMPORTANT_NOTICE':
      return <AlertCircle size={size} color={color} />;
    default:
      return <Bell size={size} color={color} />;
  }
}

const CATEGORY_COLORS = {
  PRICE_UPDATE: { color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
  RAW_MATERIAL_UPDATE: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  SCHEME: { color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
  REWARD: { color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
  OFFER: { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
  PRODUCT_UPDATE: { color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  ANNOUNCEMENT: { color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
  SUPPLY_UPDATE: { color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4' },
  IMPORTANT_NOTICE: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  OTHER: { color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
};

function getCategoryStyling(type) {
  const key = String(type || '').toUpperCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHER;
}

export default function BusinessUpdateDetailScreen({ route, navigation }) {
  const { updateId } = route.params;
  const [update, setUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useAuth();
  const { t } = useTranslation();
  const { markAsRead: contextMarkAsRead } = useNotifications();

  useEffect(() => {
    fetchDetail();
  }, [updateId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('business_updates')
        .select('*')
        .eq('id', updateId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!data) {
        setError('NOT_FOUND');
        setUpdate(null);
      } else {
        setUpdate(data);

        // Mark as read in context and remote
        if (contextMarkAsRead) {
          contextMarkAsRead(updateId);
        } else {
          markAsReadLocal(updateId);
        }
      }
    } catch (e) {
      console.warn('Error fetching update detail:', e);
      setError(e.message || 'QUERY_FAILED');
    } finally {
      setLoading(false);
    }
  };

  const markAsReadLocal = async (id) => {
    try {
      if (!userProfile?.crm_party_id) return;
      const { data: existing } = await supabase
        .from('business_update_recipients')
        .select('id, read_at')
        .eq('update_id', id)
        .eq('customer_id', userProfile.crm_party_id)
        .maybeSingle();

      const nowIso = new Date().toISOString();
      if (existing) {
        if (!existing.read_at) {
          await supabase
            .from('business_update_recipients')
            .update({ read_at: nowIso })
            .eq('id', existing.id);
        }
      } else {
        await supabase
          .from('business_update_recipients')
          .insert({
            update_id: id,
            customer_id: userProfile.crm_party_id,
            read_at: nowIso,
            delivered_at: nowIso,
          });
      }
    } catch (e) {
      console.warn('Error marking notice as read locally:', e);
    }
  };

  const handleOpenWhatsAppSupport = () => {
    const titleText = update?.title || 'Notice';
    const message = encodeURIComponent(
      `Hello Shubh Labh Team, I have a query regarding this notice: "${titleText}"`
    );
    const url = `whatsapp://send?phone=+91${SUPPORT_PHONE}&text=${message}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(`tel:+91${SUPPORT_PHONE}`);
        }
      })
      .catch(() => {
        Linking.openURL(`tel:+91${SUPPORT_PHONE}`);
      });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SLHeader
          title={t('notifications.updateDetails') || 'Update Details'}
          navigation={navigation}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !update) {
    return (
      <SafeAreaView style={styles.container}>
        <SLHeader
          title={t('notifications.updateDetails') || 'Update Details'}
          navigation={navigation}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <View style={styles.errorIconCircle}>
            <AlertCircle size={36} color="#DC2626" />
          </View>
          <Text style={styles.errorTitle}>
            {t('notifications.notFound') || 'This update is no longer available.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryBtnText}>
              {t('notifications.backToUpdates') || 'Back to Notifications'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Formatting dates for Indian users
  const dateObj = new Date(update.published_at || update.created_at);
  const dateFormatted = !isNaN(dateObj)
    ? dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const timeFormatted = !isNaN(dateObj)
    ? dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const catStyle = getCategoryStyling(update.type);
  const displayType = (update.type || 'Notice').replace(/_/g, ' ');
  const isRewardUpdate =
    (update.type || '').toUpperCase() === 'REWARD' ||
    (update.type || '').toUpperCase() === 'SCHEME';

  return (
    <SafeAreaView style={styles.container}>
      <SLHeader
        title={t('notifications.updateDetails') || 'Update Details'}
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* TOP IDENTITY & HEADING CARD */}
        <View style={styles.headerCard}>
          {/* Badge Row */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: catStyle.bg, borderColor: catStyle.border },
              ]}
            >
              {getCategoryIcon(update.type, catStyle.color, 14)}
              <Text style={[styles.categoryBadgeText, { color: catStyle.color }]}>
                {displayType}
              </Text>
            </View>

            <View style={styles.officialChip}>
              <CheckCircle2 size={13} color="#059669" />
              <Text style={styles.officialChipText}>
                {t('notifications.officialNotice') || 'Official Notice'}
              </Text>
            </View>
          </View>

          {/* Primary Heading */}
          <Text style={styles.titleText}>{update.title}</Text>

          {/* Compact Metadata Row */}
          <View style={styles.metadataRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{dateFormatted}</Text>
            </View>

            {timeFormatted ? (
              <View style={styles.metaItem}>
                <Clock size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{timeFormatted}</Text>
              </View>
            ) : null}

            {update.audience_type ? (
              <View style={styles.metaItem}>
                <Users size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>
                  {update.audience_type === 'ALL' ? 'All Buyers' : 'Direct Notice'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Optional Effective Date (Only if supplied by source data) */}
          {update.effective_date && (
            <View style={styles.effectiveDateBox}>
              <Text style={styles.effectiveDateLabel}>Effective Date:</Text>
              <Text style={styles.effectiveDateValue}>
                {new Date(update.effective_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* NOTICE MESSAGE CONTENT CARD */}
        <View style={styles.messageCard}>
          <View style={styles.cardSectionHeader}>
            <FileText size={16} color={theme.colors.primary} />
            <Text style={styles.cardSectionTitle}>
              {t('notifications.noticeContent') || 'Notice Details'}
            </Text>
          </View>
          <Text style={styles.messageText}>{update.message}</Text>
        </View>

        {/* OPTIONAL SUPPORTING IMAGE */}
        {update.image_url ? (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: update.image_url }}
              style={styles.attachedImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* OPTIONAL ATTACHMENT */}
        {update.attachment_url ? (
          <TouchableOpacity
            style={styles.attachmentCard}
            onPress={() => Linking.openURL(update.attachment_url)}
            activeOpacity={0.8}
          >
            <View style={styles.attachmentLeft}>
              <Paperclip size={18} color={theme.colors.primary} />
              <Text style={styles.attachmentTitle}>
                {t('notifications.viewAttachment') || 'View Attachment'}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}

        {/* REWARD / SCHEME CTA */}
        {isRewardUpdate && (
          <TouchableOpacity
            style={styles.rewardNavBtn}
            onPress={() => {
              if (update.scheme_id) {
                navigation.navigate('RewardDetail', { schemeId: update.scheme_id });
              } else {
                navigation.navigate('MyRewardSchemes');
              }
            }}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              <Award size={20} color="#FFFFFF" />
              <Text style={styles.rewardNavBtnText}>
                {t('notifications.viewScheme') || 'View Scheme & Rewards'}
              </Text>
            </View>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* CONTACT / SUPPORT ACTION CARD */}
        <View style={styles.supportCard}>
          <View style={styles.supportTextContainer}>
            <Text style={styles.supportTitle}>
              {t('notifications.haveQuestions') || 'Questions about this update?'}
            </Text>
            <Text style={styles.supportSubtitle}>
              Direct helpline: +91 {SUPPORT_PHONE}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.supportBtn}
            onPress={handleOpenWhatsAppSupport}
            activeOpacity={0.8}
          >
            <MessageCircle size={16} color="#FFFFFF" />
            <Text style={styles.supportBtnText}>
              {t('notifications.contactSupport') || 'Ask on WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing to ensure floating FAB does not obscure controls */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  officialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  officialChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 28,
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  effectiveDateBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  effectiveDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  effectiveDateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1F2937',
  },
  imageCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attachedImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  rewardNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
  },
  rewardNavBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
