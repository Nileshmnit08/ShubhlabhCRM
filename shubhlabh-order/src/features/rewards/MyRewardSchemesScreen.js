import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Award,
  Calendar,
  Gift,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Info,
} from 'lucide-react-native';

import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { SLCard } from '../../shared/components/SLCard';
import { SLStatusBadge } from '../../shared/components/SLStatusBadge';
import { useTranslation } from '../../shared/localization/i18n';
import {
  fetchMyRewardSchemes,
  getDevLayoutFixtures,
  getMilestoneStatusMeta,
  REWARD_ERROR_CODES,
} from './rewardService';

export default function MyRewardSchemesScreen({ navigation }) {
  const { t, language } = useTranslation();

  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE', 'UPCOMING', 'COMPLETED'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [schemeData, setSchemeData] = useState({ active: [], upcoming: [], completed: [] });
  const [isDevPreview, setIsDevPreview] = useState(false);

  const loadSchemes = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorInfo(null);

    const result = await fetchMyRewardSchemes();

    if (result.success && result.data) {
      setSchemeData(result.data);
      setIsDevPreview(false);
    } else {
      // Backend returned error (e.g. RPC not deployed or network error)
      setErrorInfo(result);
      if (result.errorCode === REWARD_ERROR_CODES.RPC_NOT_DEPLOYED) {
        // Fallback to dev preview automatically so user can inspect UI layout
        // while clearly seeing the banner notice
        const fixtures = getDevLayoutFixtures();
        setSchemeData(fixtures);
        setIsDevPreview(true);
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

      // Refresh on focus to ensure leaving and reopening screens does not display stale data
      loadSchemes(schemeData.active.length > 0 || schemeData.upcoming.length > 0 || schemeData.completed.length > 0);

      return () => subscription.remove();
    }, [navigation])
  );

  const handleTogglePreview = () => {
    if (isDevPreview) {
      // Try reloading live service
      setIsDevPreview(false);
      loadSchemes();
    } else {
      const fixtures = getDevLayoutFixtures();
      setSchemeData(fixtures);
      setIsDevPreview(true);
      setErrorInfo(null);
    }
  };

  const getDisplayedList = () => {
    switch (activeTab) {
      case 'UPCOMING':
        return schemeData.upcoming || [];
      case 'COMPLETED':
        return schemeData.completed || [];
      case 'ACTIVE':
      default:
        return schemeData.active || [];
    }
  };

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

  // Render individual milestone slab row in ladder
  const renderMilestoneItem = (milestone, idx, totalMilestones, schemeBags) => {
    const meta = getMilestoneStatusMeta(milestone.milestone_status);
    const localizedStatus = t(meta.key) || meta.fallback;

    const progressPct = Math.min(
      100,
      Math.max(
        0,
        milestone.progress_percentage !== undefined
          ? Number(milestone.progress_percentage)
          : milestone.min_bags > 0
          ? Math.round((schemeBags / milestone.min_bags) * 100)
          : 100
      )
    );

    const isFulfilled = milestone.milestone_status === 'Fulfilled';
    const isApproved = milestone.milestone_status === 'Approved';
    const isEligible = milestone.milestone_status === 'Eligible';
    const isAchieved = milestone.is_achieved || isFulfilled || isApproved || isEligible;

    return (
      <View key={milestone.slab_id || idx} style={styles.milestoneRow}>
        {/* Step indicator on the left */}
        <View style={styles.stepColumn}>
          <View
            style={[
              styles.stepDot,
              isAchieved ? styles.stepDotAchieved : styles.stepDotPending,
              isFulfilled && styles.stepDotFulfilled,
            ]}
          >
            {isFulfilled ? (
              <CheckCircle2 size={14} color={theme.colors.white} />
            ) : isAchieved ? (
              <Award size={14} color={theme.colors.white} />
            ) : (
              <Text style={styles.stepNumber}>{idx + 1}</Text>
            )}
          </View>
          {idx < totalMilestones - 1 && (
            <View
              style={[
                styles.stepLine,
                isAchieved ? styles.stepLineAchieved : styles.stepLinePending,
              ]}
            />
          )}
        </View>

        {/* Milestone card content */}
        <View style={styles.milestoneContent}>
          <View style={styles.milestoneHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.slabName}>{milestone.slab_name || `${t('rewards.slab')} ${idx + 1}`}</Text>
              <Text style={styles.slabThreshold}>
                {milestone.min_bags} {t('rewards.bags')}
                {milestone.max_bags ? ` – ${milestone.max_bags} ${t('rewards.bags')}` : '+'}
              </Text>
            </View>
            <SLStatusBadge status={meta.badgeType} text={localizedStatus} />
          </View>

          {/* Reward details */}
          {!!milestone.reward_description && (
            <View style={styles.rewardBox}>
              <Gift size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.rewardText} numberOfLines={2}>
                {milestone.reward_description}
              </Text>
            </View>
          )}

          {/* Progress bar towards this milestone */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPct}%` },
                  isAchieved && styles.progressBarFillAchieved,
                ]}
              />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {isAchieved
                  ? (t('rewards.status.eligible') || 'Achieved')
                  : `${milestone.bags_needed ?? Math.max(0, milestone.min_bags - schemeBags)} ${t('rewards.bagsNeeded')}`}
              </Text>
              <Text style={styles.progressPercent}>{progressPct}%</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render a full Scheme card
  const renderSchemeCard = ({ item }) => {
    const milestones = item.milestones || [];
    const hasMilestones = Array.isArray(milestones) && milestones.length > 0;
    const netBags = Number(item.current_net_bags || 0);

    return (
      <SLCard style={styles.schemeCard} variant="default">
        {/* Scheme Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.schemeTitle}>{item.scheme_name}</Text>
            <View style={styles.dateRow}>
              <Calendar size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.dateText}>
                {formatDate(item.start_date)} – {formatDate(item.end_date)}
              </Text>
            </View>
          </View>

          {item.days_remaining !== undefined && item.days_remaining !== null && (
            <View style={styles.daysBadge}>
              <Clock size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.daysText}>
                {item.days_remaining} {t('rewards.daysRemaining')}
              </Text>
            </View>
          )}
        </View>

        {/* Scheme Description if configured */}
        {!!item.description && (
          <Text style={styles.schemeDesc} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        {/* Performance KPI banner */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>{t('rewards.currentNetBags')}</Text>
            <Text style={styles.kpiValue}>
              {netBags} <Text style={styles.kpiUnit}>{t('rewards.bags')}</Text>
            </Text>
          </View>

          {item.next_slab_name ? (
            <View style={styles.kpiTargetBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TrendingUp size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.kpiTargetLabel}>{t('rewards.nextMilestone')}</Text>
              </View>
              <Text style={styles.kpiTargetValue} numberOfLines={1}>
                {item.next_slab_name}
              </Text>
              <Text style={styles.kpiTargetNeeded}>
                {item.bags_needed_for_next} {t('rewards.bagsNeeded')}
              </Text>
            </View>
          ) : (
            <View style={styles.kpiTargetBox}>
              <Text style={styles.kpiTargetLabel}>{t('rewards.nextMilestone')}</Text>
              <Text style={styles.kpiAllDone}>{t('rewards.allMilestonesAchieved')}</Text>
            </View>
          )}
        </View>

        {/* Milestone Ladder */}
        {hasMilestones && (
          <View style={styles.ladderContainer}>
            <Text style={styles.ladderTitle}>{t('rewards.milestoneLadder')}</Text>
            {milestones.map((m, idx) =>
              renderMilestoneItem(m, idx, milestones.length, netBags)
            )}
          </View>
        )}

        {/* Card Footer CTA */}
        <TouchableOpacity
          style={styles.cardFooterBtn}
          onPress={() =>
            navigation.navigate('RewardDetail', {
              scheme: item,
              schemeId: item.scheme_id,
              isDevPreview,
            })
          }
          activeOpacity={0.7}
        >
          <Text style={styles.cardFooterText}>
            {t('rewards.viewDetails') || 'View Details & History'}
          </Text>
          <ChevronRight size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </SLCard>
    );
  };

  const displayedList = getDisplayedList();

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader
        title={t('rewards.title') || 'My Reward Schemes'}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {/* Dev preview notification banner when RPC not deployed */}
      {isDevPreview && (
        <View style={styles.previewBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Info size={18} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.previewBannerText}>
              {t('rewards.devFixtureNotice')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleTogglePreview} style={styles.previewReloadBtn}>
            <RefreshCw size={14} color="#B45309" style={{ marginRight: 4 }} />
            <Text style={styles.previewReloadText}>Retry Live</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            {t('rewards.active')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'UPCOMING' && styles.tabButtonActive]}
          onPress={() => setActiveTab('UPCOMING')}
        >
          <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.tabTextActive]}>
            {t('rewards.upcoming')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'COMPLETED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
            {t('rewards.completed')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content states */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {t('common.loading') || 'Loading reward schemes...'}
          </Text>
        </View>
      ) : errorInfo && !isDevPreview ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={56} color={theme.colors.error} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>{t('rewards.errorTitle')}</Text>
          <Text style={styles.errorMessage}>{errorInfo.message}</Text>

          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => loadSchemes(false)}>
              <RefreshCw size={18} color={theme.colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>{t('common.retry') || 'Retry'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleTogglePreview}>
              <Text style={styles.secondaryBtnText}>{t('rewards.viewPreview')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item) => item.scheme_id}
          renderItem={renderSchemeCard}
          contentContainerStyle={styles.listContent}
          onRefresh={() => loadSchemes(true)}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Award size={64} color={theme.colors.textMuted} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE'
                  ? t('rewards.emptyActive')
                  : activeTab === 'UPCOMING'
                  ? t('rewards.emptyUpcoming')
                  : t('rewards.emptyCompleted')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? t('rewards.emptyActiveSub')
                  : activeTab === 'UPCOMING'
                  ? t('rewards.emptyUpcomingSub')
                  : t('rewards.emptyCompletedSub')}
              </Text>
            </View>
          }
        />
      )}
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

  // Preview Notice Banner
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  previewReloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FDE68A',
    marginLeft: 8,
  },
  previewReloadText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },

  // Scheme Card
  schemeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  schemeTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
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
  daysText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  schemeDesc: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },

  // KPI container
  kpiContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: theme.radius.medium,
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  kpiBox: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#DEE2E6',
    paddingRight: theme.spacing.sm,
  },
  kpiLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  kpiValue: {
    ...theme.typography.cardTitle,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  kpiUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  kpiTargetBox: {
    flex: 1.2,
    paddingLeft: theme.spacing.sm,
    justifyContent: 'center',
  },
  kpiTargetLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  kpiTargetValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  kpiTargetNeeded: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  kpiAllDone: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '700',
  },

  // Milestone Ladder
  ladderContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ladderTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  milestoneRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  stepColumn: {
    alignItems: 'center',
    width: 28,
    marginRight: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotPending: {
    backgroundColor: theme.colors.border,
  },
  stepDotAchieved: {
    backgroundColor: theme.colors.primary,
  },
  stepDotFulfilled: {
    backgroundColor: theme.colors.success,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepLinePending: {
    backgroundColor: theme.colors.border,
  },
  stepLineAchieved: {
    backgroundColor: theme.colors.primary,
  },
  milestoneContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  slabName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  slabThreshold: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE8D6',
    marginVertical: 6,
  },
  rewardText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  progressSection: {
    marginTop: 4,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressBarFillAchieved: {
    backgroundColor: theme.colors.success,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    textAlign: 'center',
  },
  errorMessage: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.button,
    marginRight: 12,
  },
  primaryBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryBtnText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  cardFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cardFooterText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
