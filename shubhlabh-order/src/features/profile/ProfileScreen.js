import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import {
  ChevronRight,
  MapPin,
  Globe,
  HeadphonesIcon,
  Users,
  Settings,
  LogOut,
  Lock,
  ClipboardList,
  Award,
  Store,
  FileText,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
  const { t, language, toggleLanguage } = useTranslation();
  const { session, userProfile, customerProfile, logout, refreshBuyerData } = useAuth();
  const isHindi = language === 'hi';

  // Automatically refresh profile on screen focus to reflect recent edits
  useFocusEffect(
    useCallback(() => {
      if (refreshBuyerData) {
        refreshBuyerData();
      }
    }, [refreshBuyerData])
  );

  const shopName = customerProfile?.display_name || (isHindi ? 'दुकान का नाम' : 'Shop Name');
  const ownerName =
    customerProfile?.legal_or_core_name ||
    userProfile?.display_name ||
    (isHindi ? 'मालिक का नाम' : 'Owner / Buyer');
  const locationText =
    [customerProfile?.city, customerProfile?.state].filter(Boolean).join(', ') ||
    (isHindi ? 'स्थान उपलब्ध नहीं' : 'Location not set');

  // Defined Canonical Profile Fields for Completion Calculation:
  // 1. Shop / Business Name
  // 2. Owner / Contact Person Name
  // 3. Primary Mobile
  // 4. City
  // 5. State
  const hasShop = Boolean(customerProfile?.display_name?.trim());
  const hasOwner = Boolean(
    customerProfile?.legal_or_core_name?.trim() || userProfile?.display_name?.trim()
  );
  const hasMobile = Boolean(
    (customerProfile?.mobile || userProfile?.mobile)?.trim()
  );
  const hasCity = Boolean(customerProfile?.city?.trim());
  const hasState = Boolean(customerProfile?.state?.trim());
  const hasGst = Boolean(customerProfile?.gst_number?.trim());

  const coreFields = [hasShop, hasOwner, hasMobile, hasCity, hasState];
  const completedCount = coreFields.filter(Boolean).length;
  const completionPercent = Math.round((completedCount / coreFields.length) * 100);
  const isComplete = completionPercent === 100;

  // Contextual Banner Details
  let bannerCtaText = t('profile.completeCta') || 'Complete your business profile';
  let bannerTargetSection = null;
  if (!hasCity || !hasState) {
    bannerCtaText = t('profile.addAddressCta') || 'Add registered business address';
    bannerTargetSection = 'address';
  } else if (!hasGst) {
    bannerCtaText = t('profile.addGstCta') || 'Add GST registration details';
    bannerTargetSection = 'gst';
  }

  const navigateToEditor = (section) => {
    navigation.navigate('BusinessProfile', { initialSection: section });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={t('profile.title')} showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* A. BUSINESS IDENTITY CARD */}
        <TouchableOpacity
          style={styles.identityCard}
          activeOpacity={0.85}
          onPress={() => navigateToEditor(null)}
        >
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(shopName || 'S').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.identityInfo}>
              <View style={styles.shopNameRow}>
                <Text style={styles.shopTitle} numberOfLines={1}>
                  {shopName}
                </Text>
              </View>
              <Text style={styles.ownerText} numberOfLines={1}>
                {ownerName}
              </Text>
              <View style={styles.locationBadgeRow}>
                <MapPin size={13} color={theme.colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>
            </View>
            <View style={styles.editPill}>
              <Edit3 size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.editPillText}>{t('profile.editProfile') || 'Edit'}</Text>
            </View>
          </View>

          {/* Profile Completion Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {t('profile.completion') || 'Profile Completion'}
              </Text>
              <View style={styles.completionBadge}>
                {isComplete ? (
                  <CheckCircle2 size={13} color="#138A4B" style={{ marginRight: 3 }} />
                ) : null}
                <Text
                  style={[
                    styles.completionPercentText,
                    { color: isComplete ? '#138A4B' : theme.colors.primary }
                  ]}
                >
                  {isComplete
                    ? (t('profile.completeBadge') || '100% Complete')
                    : `${completionPercent}%`}
                </Text>
              </View>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${completionPercent}%`,
                    backgroundColor: isComplete ? '#138A4B' : theme.colors.primary
                  }
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* B. CONTEXTUAL COMPLETION BANNER */}
        {!isComplete ? (
          <View style={styles.bannerContainer}>
            <View style={styles.bannerIconBox}>
              <AlertTriangle size={22} color="#E65100" />
            </View>
            <View style={styles.bannerTextBox}>
              <Text style={styles.bannerTitle}>{bannerCtaText}</Text>
              <Text style={styles.bannerSub}>
                {isHindi
                  ? 'तेज़ ऑर्डर और डिलीवरी के लिए अपने व्यापार विवरण अपडेट करें।'
                  : 'Update your registered business details for seamless ordering.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bannerActionBtn}
              onPress={() => navigateToEditor(bannerTargetSection)}
            >
              <Text style={styles.bannerActionText}>
                {isHindi ? 'पूरा करें' : 'Update'}
              </Text>
              <ArrowRight size={14} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.verifiedBanner}>
            <ShieldCheck size={20} color="#138A4B" style={{ marginRight: 8 }} />
            <Text style={styles.verifiedBannerText}>
              {t('profile.activeAccount') || 'Active Business Account'}
            </Text>
          </View>
        )}

        {/* C. ORGANISED PROFILE MENU */}

        {/* SECTION 1: MY BUSINESS */}
        <Text style={styles.menuSectionHeader}>{t('profile.myBusiness') || 'My Business'}</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigateToEditor(null)}
          >
            <View style={styles.iconBox}>
              <Store size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTitleContainer}>
              <Text style={styles.rowTitle}>{t('profile.businessProfile') || 'Business Profile'}</Text>
              <Text style={styles.rowSubtitle}>{shopName}</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('DeliveryAddress')}
          >
            <View style={styles.iconBox}>
              <MapPin size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTitleContainer}>
              <Text style={styles.rowTitle}>{t('profile.deliveryAddresses') || 'Delivery Addresses'}</Text>
              <Text style={styles.rowSubtitle}>
                {isHindi ? 'ऑर्डर डिलीवरी गंतव्य' : 'Drop-off destination'}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigateToEditor('gst')}
          >
            <View style={styles.iconBox}>
              <FileText size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTitleContainer}>
              <Text style={styles.rowTitle}>{t('profile.gstDetails') || 'GST & Tax Details'}</Text>
              <Text style={styles.rowSubtitle}>
                {customerProfile?.gst_number
                  ? customerProfile.gst_number
                  : isHindi
                    ? 'पंजीकरण स्थिति देखें'
                    : 'Add or review GSTIN'}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: MY ORDERS & REWARDS */}
        <Text style={styles.menuSectionHeader}>
          {t('profile.myOrdersAndRewards') || 'My Orders & Rewards'}
        </Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('OrdersStack', { screen: 'MyOrders' })}
          >
            <View style={styles.iconBox}>
              <ClipboardList size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{isHindi ? 'मेरे ऑर्डर' : 'My Orders'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('MyRewardSchemes')}
          >
            <View style={styles.iconBox}>
              <Award size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>
              {t('rewards.title') || (isHindi ? 'मेरी रिवॉर्ड योजनाएं' : 'My Reward Schemes')}
            </Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: UPDATES & NOTICES */}
        <Text style={styles.menuSectionHeader}>{t('profile.updatesSection') || 'Updates & Notices'}</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('NotificationInbox', { initialFilter: 'BUSINESS' })}
          >
            <View style={styles.iconBox}>
              <Globe size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{isHindi ? 'व्यावसायिक अपडेट' : 'Business Updates'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('NotificationInbox', { initialFilter: 'SHUBH_LABH' })}
          >
            <View style={styles.iconBox}>
              <Globe size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>
              {t('updates.title') || (isHindi ? 'शुभ लाभ अपडेट' : 'Shubh Labh Updates')}
            </Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* SECTION 4: HELP & SUPPORT */}
        <Text style={styles.menuSectionHeader}>{t('profile.supportSection') || 'Help & Support'}</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ComplaintCenter')}
          >
            <View style={styles.iconBox}>
              <HeadphonesIcon size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>
              {t('support.title') || (isHindi ? 'सहायता एवं शिकायतें' : 'Support & Complaints')}
            </Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('MySalesperson')}
          >
            <View style={styles.iconBox}>
              <Users size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{t('profile.mySalesperson') || 'My Salesperson'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* SECTION 5: ACCOUNT */}
        <Text style={styles.menuSectionHeader}>{t('profile.accountSection') || 'Account'}</Text>
        <View style={styles.section}>
          {/* Language Switch */}
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Globe size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{t('profile.language') || 'Language'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginRight: 8, color: theme.colors.textSecondary, fontSize: 14 }}>
                {language === 'en' ? 'English' : 'हिंदी'}
              </Text>
              <Switch
                value={language === 'hi'}
                onValueChange={toggleLanguage}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
          </View>

          {/* App Settings */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.iconBox}>
              <Settings size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{t('profile.settings') || 'App Settings'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.iconBox}>
              <Lock size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{t('profile.changePassword') || 'Change Password'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>{t('profile.logout') || 'Logout'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.md
  },
  identityCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff'
  },
  identityInfo: {
    flex: 1
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  shopTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  ownerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  locationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  locationText: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16
  },
  editPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary
  },
  progressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4'
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  completionPercentText: {
    fontSize: 12,
    fontWeight: '700'
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: theme.radius.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  bannerIconBox: {
    marginRight: 10
  },
  bannerTextBox: {
    flex: 1,
    marginRight: 8
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100'
  },
  bannerSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2
  },
  bannerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E65100',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  bannerActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: theme.radius.large,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginBottom: theme.spacing.md
  },
  verifiedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#138A4B'
  },
  menuSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4'
  },
  iconBox: {
    width: 34,
    alignItems: 'center',
    marginRight: 12
  },
  rowTitleContainer: {
    flex: 1
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary
  },
  rowSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    marginTop: 16,
    backgroundColor: '#FCE8E6',
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: '#FAD2CF'
  },
  logoutText: {
    fontSize: 15,
    color: theme.colors.error,
    fontWeight: '700'
  }
});
