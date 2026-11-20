import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, UserCog } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../../shared/localization/i18n';
import { getProfileCompletion, editProfileSection, shouldShowCompletionCard, readDismissedAt, saveDismissedAt } from './profileCompletion.js';

/**
 * Small, optional reminder on the Dashboard (SL-ONBOARDING-SKIP-01). Informational only: not a popup, not a modal,
 * never blocks browsing or ordering. Hidden automatically once the profile is complete, and for 7 days after the
 * customer dismisses it. `onUpdate(section)` opens the existing Edit Profile screen.
 */
export default function ProfileCompletionCard({ onUpdate }) {
  const { t } = useTranslation();
  const { customerProfile, userProfile } = useAuth();
  const partyId = customerProfile?.id || null;
  const [dismissedAt, setDismissedAt] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!partyId) { setDismissedAt(null); setLoadedFor(null); return undefined; }
    readDismissedAt(AsyncStorage, partyId).then((v) => { if (alive) { setDismissedAt(v); setLoadedFor(partyId); } });
    return () => { alive = false; };
  }, [partyId]);

  const dismiss = useCallback(() => {
    const now = Date.now();
    setDismissedAt(now); // hide immediately; saving is best-effort
    saveDismissedAt(AsyncStorage, partyId, now);
  }, [partyId]);

  // wait for the dismissal state of THIS customer, so the card does not flash for someone who dismissed it
  if (loadedFor !== partyId) return null;
  if (!shouldShowCompletionCard({ customerProfile, userProfile, dismissedAt })) return null;

  const completion = getProfileCompletion(customerProfile, userProfile);
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.iconBox}><UserCog size={20} color={theme.colors.primary} /></View>
      <View style={styles.textBox}>
        <Text style={styles.message}>{t('profileCard.message')}</Text>
        <TouchableOpacity onPress={() => onUpdate(editProfileSection(completion))} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.cta}>
          <Text style={styles.ctaText}>{t('profileCard.cta')} →</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('profileCard.dismiss')} style={styles.close} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <X size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
    marginBottom: 16,
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  textBox: { flex: 1 },
  message: { fontSize: 13, lineHeight: 18, color: theme.colors.textPrimary, fontWeight: '600' },
  cta: { alignSelf: 'flex-start', marginTop: 4, minHeight: 24, justifyContent: 'center' },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#E8590C' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
