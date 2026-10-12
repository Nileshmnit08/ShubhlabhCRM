import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Award,
  Calendar,
  Gift,
  Clock,
  TrendingUp,
  CircleAlert,
  CheckCircle2,
  Package,
  RotateCcw,
  Info,
  RefreshCw,
  FileText,
} from 'lucide-react-native';

import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { SLCard } from '../../shared/components/SLCard';
import { SLStatusBadge } from '../../shared/components/SLStatusBadge';
import { useTranslation } from '../../shared/localization/i18n';
import {
  fetchSchemeDetails,
  fetchSchemeQualifyingActivity,
  getDevActivityFixtures,
  getMilestoneStatusMeta,
  REWARD_ERROR_CODES,
} from './rewardService';

export default function RewardDetailScreen({ navigation, route }) {
  const { t, language } = useTranslation();
  const initialScheme = route.params?.scheme || null;
  const schemeId = route.params?.schemeId || initialScheme?.scheme_id;
  const initialIsDevPreview = route.params?.isDevPreview || initialScheme?.is_dev_fixture || false;

  const [scheme, setScheme] = useState(initialScheme);
  const [loading, setLoading] = useState(!initialScheme);
  const [refreshing, setRefreshing] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [isDevPreview, setIsDevPreview] = useState(initialIsDevPreview);

  // Qualifying activity state
  const [activityRecords, setActivityRecords] = useState([]);
  const [activityMissingDependency, setActivityMissingDependency] = useState(false);

  const loadData = async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else if (!scheme) {
      setLoading(true);
    }
    setErrorInfo(null);

    // 1. Load Scheme Details
    const detailsRes = await fetchSchemeDetails(schemeId);
    if (detailsRes.success && detailsRes.data) {
      setScheme(detailsRes.data);
      setIsDevPreview(Boolean(detailsRes.isDevFixture));
    } else {
      setErrorInfo(detailsRes);
    }

    // 2. Load Qualifying Activity History
    const activityRes = await fetchSchemeQualifyingActivity(schemeId);
    if (activityRes.success && Array.isArray(activityRes.data) && activityRes.data.length > 0) {
      setActivityRecords(activityRes.data);
      setActivityMissingDependency(false);
    } else {
      setActivityRecords([]);
      if (activityRes.errorCode === REWARD_ERROR_CODES.ACTIVITY_RPC_NOT_DEPLOYED) {
        setActivityMissingDependency(true);
      } else {
        setActivityMissingDependency(false);
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  // Android hardware back navigation and focus auto-refresh
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Refresh on focus to prevent stale milestone or status data
      loadData(!!scheme);

      return () => subscription.remove();
    }, [navigation, schemeId])
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderMilestoneHistoryItem = (milestone, idx, totalMilestones, netBags) => {
    const meta = getMilestoneStatusMeta(milestone.milestone_status);
    const localizedStatus = t(meta.key) || meta.fallback;

    const progressPct = Math.min(
      100,
      Math.max(
        0,
        milestone.progress_percentage !== undefined
          ? Number(milestone.progress_percentage)
          : milestone.min_bags > 0
          ? Math.round((netBags / milestone.min_bags) * 100)
          : 100
      )
    );

    const isFulfilled = milestone.milestone_status === 'Fulfilled';
    const isApproved = milestone.milestone_status === 'Approved';
    const isEligible = milestone.milestone_status === 'Eligible';
    const isPendingApproval = milestone.milestone_status === 'Pending Approval';
    const isReviewRequired = milestone.milestone_status === 'Review Required';
    const isReversed = milestone.milestone_status === 'Reversed';
    const isAchieved = milestone.is_achieved || isFulfilled || isApproved || isEligible;

    return (
      <View key={milestone.slab_id || idx} style={styles.milestoneHistoryCard}>
        {/* Step Indicator and Title */}
        <View style={styles.milestoneHeaderRow}>
          <View style={styles.milestoneBadgeDotContainer}>
            <View
              style={[
                styles.milestoneNumberDot,
                isAchieved ? styles.dotAchieved : styles.dotPending,
                isFulfilled && styles.dotFulfilled,
                isReviewRequired && styles.dotReview,
                isReversed && styles.dotReversed,
              ]}
            >
              {isFulfilled ? (
                <CheckCircle2 size={14} color={theme.colors.white} />
              ) : isReviewRequired ? (
                <AlertTriangle size={14} color={theme.colors.white} />
              ) : isReversed ? (
                <RotateCcw size={14} color={theme.colors.white} />
              ) : isAchieved ? (
                <Award size={14} color={theme.colors.white} />
              ) : (
                <Text style={styles.milestoneNumberText}>{idx + 1}</Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.milestoneSlabName}>
                {milestone.slab_name || `${t('rewards.slab')} ${idx + 1}`}
              </Text>
              <Text style={styles.milestoneThresholdText}>
                {milestone.min_bags} {t('rewards.bags')}
                {milestone.max_bags ? ` – ${milestone.max_bags} ${t('rewards.bags')}` : '+'}
              </Text>
            </View>
          </View>

          <SLStatusBadge status={meta.badgeType} text={localizedStatus} />
        </View>

        {/* Reward Description */}
        {!!milestone.reward_description && (
          <View style={styles.rewardDetailBox}>
            <Gift size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardDetailTitle}>{t('rewards.rewardEarned')}</Text>
              <Text style={styles.rewardDetailDesc}>{milestone.reward_description}</Text>
              {!!milestone.reward_type && (
                <Text style={styles.rewardTypeTag}>{milestone.reward_type}</Text>
              )}
            </View>
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.milestoneProgressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct}%` },
                isAchieved && styles.progressFillAchieved,
                isReviewRequired && styles.progressFillReview,
              ]}
            />
          </View>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressMetaLabel}>
              {isAchieved
                ? (t('rewards.status.eligible') || 'Achieved')
                : `${milestone.bags_needed ?? Math.max(0, milestone.min_bags - netBags)} ${t('rewards.bagsNeeded')}`}
            </Text>
            <Text style={styles.progressMetaPct}>{progressPct}%</Text>
          </View>
        </View>

        {/* Specific Status Callouts */}
        {isReviewRequired && (
          <View style={styles.statusCalloutWarning}>
            <AlertTriangle size={16} color="#B45309" style={{ marginRight: 6 }} />
            <Text style={styles.statusCalloutTextWarning}>
              {language === 'hi'
                ? 'स्वीकृत रिवॉर्ड के बाद माल वापसी के कारण बैग में कमी हुई है। समीक्षा आवश्यक है।'
                : 'Recent dispatch return reduced qualifying bags below threshold. Review required by management.'}
            </Text>
          </View>
        )}

        {isReversed && (
          <View style={styles.statusCalloutAlert}>
            <CircleAlert size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
            <Text style={styles.statusCalloutTextAlert}>
              {language === 'hi'
                ? 'यह माइलस्टोन दावा निरस्त कर दिया गया है।'
                : 'This milestone claim has been reversed or revoked.'}
            </Text>
          </View>
        )}

        {/* Source Timestamps (displayed ONLY when present in canonical data) */}
        {(milestone.earned_at || milestone.approved_at || milestone.fulfilled_at) && (
          <View style={styles.timestampContainer}>
            {!!milestone.earned_at && (
              <View style={styles.timestampRow}>
                <Clock size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.timestampText}>
                  {t('rewards.earnedOn')}: {formatDate(milestone.earned_at)}
                </Text>
              </View>
            )}
            {!!milestone.approved_at && (
              <View style={styles.timestampRow}>
                <CheckCircle2 size={12} color={theme.colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.timestampText}>
                  {t('rewards.approvedOn')}: {formatDate(milestone.approved_at)}
                </Text>
              </View>
            )}
            {!!milestone.fulfilled_at && (
              <View style={styles.timestampRow}>
                <Gift size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.timestampText}>
                  {t('rewards.fulfilledOn')}: {formatDate(milestone.fulfilled_at)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderActivityList = () => {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Package size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{t('rewards.qualifyingActivity')}</Text>
        </View>
        <Text style={styles.sectionSubtitle}>{t('rewards.activityNotice')}</Text>

        {activityMissingDependency && (
          <View style={styles.dependencyNoticeBox}>
            <Info size={16} color="#4B5563" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.dependencyNoticeText}>
              {t('rewards.activityPending')}
            </Text>
          </View>
        )}

        {activityRecords.length === 0 ? (
          <View style={styles.emptyActivityBox}>
            <Text style={styles.emptyActivityText}>{t('rewards.noActivity')}</Text>
          </View>
        ) : (
          <View style={styles.activityListCard}>
            {activityRecords.map((item, idx) => (
              <View
                key={item.dispatch_id || idx}
                style={[
                  styles.activityItemRow,
                  idx < activityRecords.length - 1 && styles.activityItemBorder,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityDate}>{formatDate(item.dispatch_date)}</Text>
                  {!!item.order_number && (
                    <Text style={styles.activityOrderRef}>
                      {t('rewards.orderRef')}: {item.order_number}
                    </Text>
                  )}
                  {!!item.notes && (
                    <Text style={styles.activityNotesText}>{item.notes}</Text>
                  )}
                </View>

                <View style={styles.activityMetricsCol}>
                  <View style={styles.bagMetricBadge}>
                    <Text style={styles.dispatchedBagsText}>
                      +{item.dispatched_bags} {t('rewards.bags')}
                    </Text>
                  </View>
                  {Number(item.returned_bags) > 0 && (
                    <Text style={styles.returnedBagsText}>
                      -{item.returned_bags} {t('rewards.returned')}
                    </Text>
                  )}
                  <Text style={styles.netBagsText}>
                    = {item.net_qualifying_bags} {t('rewards.netBags')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SLHeader
          title={t('rewards.detailsTitle') || 'Scheme Details'}
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorInfo && !scheme) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SLHeader
          title={t('rewards.detailsTitle') || 'Scheme Details'}
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <CircleAlert size={56} color={theme.colors.error} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>{t('rewards.errorTitle')}</Text>
          <Text style={styles.errorMessage}>
            {errorInfo.errorCode === REWARD_ERROR_CODES.UNAUTHENTICATED
              ? (t('rewards.unauthenticated') || errorInfo.message)
              : errorInfo.errorCode === REWARD_ERROR_CODES.RPC_NOT_DEPLOYED
              ? (t('rewards.unavailable') || errorInfo.message)
              : (errorInfo.message || t('rewards.schemeNotFound'))}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(false)}>
            <RefreshCw size={16} color={theme.colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const milestones = scheme?.milestones || [];
  const netBags = Number(scheme?.current_net_bags || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader
        title={scheme?.scheme_name || t('rewards.detailsTitle') || 'Scheme Details'}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {isDevPreview && (
        <View style={styles.previewBanner}>
          <Info size={16} color="#92400E" style={{ marginRight: 8 }} />
          <Text style={styles.previewBannerText}>
            {t('rewards.devFixtureNotice')}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        {/* Scheme Overview Card */}
        <SLCard style={styles.overviewCard} variant="default">
          <View style={styles.overviewHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.schemeNameTitle}>{scheme?.scheme_name}</Text>
              <View style={styles.datePeriodRow}>
                <Calendar size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.datePeriodText}>
                  {formatDate(scheme?.start_date)} – {formatDate(scheme?.end_date)}
                </Text>
              </View>
            </View>

            {scheme?.days_remaining !== undefined && scheme?.days_remaining !== null && (
              <View style={styles.daysBadge}>
                <Clock size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.daysBadgeText}>
                  {scheme.days_remaining} {t('rewards.daysRemaining')}
                </Text>
              </View>
            )}
          </View>

          {/* Scheme Description / Rules */}
          {!!scheme?.description && (
            <View style={styles.descBox}>
              <Text style={styles.descTitle}>{t('rewards.qualificationRules')}</Text>
              <Text style={styles.descText}>{scheme.description}</Text>
            </View>
          )}

          {/* KPI Summary Banner */}
          <View style={styles.kpiSummaryRow}>
            <View style={styles.kpiSummaryBox}>
              <Text style={styles.kpiSummaryLabel}>{t('rewards.currentNetBags')}</Text>
              <Text style={styles.kpiSummaryValue}>
                {netBags} <Text style={styles.kpiSummaryUnit}>{t('rewards.bags')}</Text>
              </Text>
            </View>

            {scheme?.next_slab_name ? (
              <View style={styles.kpiSummaryBoxRight}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TrendingUp size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.kpiSummaryLabel}>{t('rewards.nextMilestone')}</Text>
                </View>
                <Text style={styles.kpiNextName} numberOfLines={1}>
                  {scheme.next_slab_name}
                </Text>
                <Text style={styles.kpiNextNeeded}>
                  {scheme.bags_needed_for_next} {t('rewards.bagsNeeded')}
                </Text>
              </View>
            ) : (
              <View style={styles.kpiSummaryBoxRight}>
                <Text style={styles.kpiSummaryLabel}>{t('rewards.nextMilestone')}</Text>
                <Text style={styles.kpiAllAchieved}>{t('rewards.allMilestonesAchieved')}</Text>
              </View>
            )}
          </View>
        </SLCard>

        {/* Milestone History Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Award size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>{t('rewards.milestoneHistory')}</Text>
          </View>

          {milestones.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('rewards.noMilestones')}</Text>
            </View>
          ) : (
            milestones.map((m, idx) =>
              renderMilestoneHistoryItem(m, idx, milestones.length, netBags)
            )
          )}
        </View>

        {/* Qualifying Activity History Section */}
        {renderActivityList()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },

  // Preview Banner
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  previewBannerText: {
    ...theme.typography.caption,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },

  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.sm,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  schemeNameTitle: {
    ...theme.typography.screenTitle,
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  datePeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePeriodText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginLeft: 8,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  descBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: theme.radius.medium,
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  descTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  descText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  kpiSummaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F0',
    borderRadius: theme.radius.medium,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  kpiSummaryBox: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#FED7AA',
    paddingRight: theme.spacing.sm,
  },
  kpiSummaryBoxRight: {
    flex: 1.2,
    paddingLeft: theme.spacing.sm,
    justifyContent: 'center',
  },
  kpiSummaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  kpiSummaryValue: {
    ...theme.typography.cardTitle,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  kpiSummaryUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  kpiNextName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  kpiNextNeeded: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  kpiAllAchieved: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '700',
  },

  // Sections
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  // Milestone History Card
  milestoneHistoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.sm,
  },
  milestoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  milestoneBadgeDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  milestoneNumberDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotPending: {
    backgroundColor: theme.colors.border,
  },
  dotAchieved: {
    backgroundColor: theme.colors.primary,
  },
  dotFulfilled: {
    backgroundColor: theme.colors.success,
  },
  dotReview: {
    backgroundColor: '#F59E0B',
  },
  dotReversed: {
    backgroundColor: theme.colors.error,
  },
  milestoneNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  milestoneSlabName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  milestoneThresholdText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  rewardDetailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8F0',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.medium,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  rewardDetailTitle: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  rewardDetailDesc: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  rewardTypeTag: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  milestoneProgressSection: {
    marginTop: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressFillAchieved: {
    backgroundColor: theme.colors.success,
  },
  progressFillReview: {
    backgroundColor: '#F59E0B',
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressMetaLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  progressMetaPct: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },

  // Callouts
  statusCalloutWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  statusCalloutTextWarning: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  statusCalloutAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  statusCalloutTextAlert: {
    fontSize: 11,
    color: '#991B1B',
    flex: 1,
    lineHeight: 16,
  },

  // Timestamps
  timestampContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timestampText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },

  // Qualifying Activity
  dependencyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.medium,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dependencyNoticeText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    flex: 1,
  },
  activityListCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.elevation.sm,
  },
  activityItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityDate: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  activityOrderRef: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activityNotesText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    fontStyle: 'italic',
  },
  activityMetricsCol: {
    alignItems: 'flex-end',
  },
  bagMetricBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  dispatchedBagsText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.success,
  },
  returnedBagsText: {
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: '600',
  },
  netBagsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyActivityBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyActivityText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  emptyBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.medium,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
  },
  errorTitle: {
    ...theme.typography.screenTitle,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  errorMessage: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.button,
  },
  retryBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
