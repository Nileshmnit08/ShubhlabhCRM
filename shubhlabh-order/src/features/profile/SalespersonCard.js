import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { User, Phone, MessageCircle } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { supabase } from '../../core/api/supabase';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../../shared/localization/i18n';
import { fetchAssignedSalesperson, contactActions, telUrl, whatsappUrl } from './salespersonAssignment.js';

/**
 * Highlighted "My Salesperson" card for the Profile screen (SL-ORDER-PROFILE-UI-02).
 * Shows the salesperson assigned to THIS customer (looked up by the signed-in customer's own party id), or
 * "No salesperson assigned yet." Call / WhatsApp buttons appear only for a valid number; the number itself is
 * never printed here. Tapping the card opens the existing My Salesperson screen.
 */
export default function SalespersonCard({ onOpen }) {
  const { t } = useTranslation();
  const { customerProfile } = useAuth();
  const partyId = customerProfile?.id || null;
  const [state, setState] = useState({ status: 'loading', salesperson: null });
  const runRef = useRef(0);

  const load = useCallback(async () => {
    const run = runRef.current + 1;
    runRef.current = run;
    if (!partyId) { setState({ status: 'none', salesperson: null }); return; }
    setState((s) => ({ status: 'loading', salesperson: s.salesperson }));
    try {
      const { salesperson, error } = await fetchAssignedSalesperson(supabase, partyId, t('profile.salespersonDesignation'));
      if (runRef.current !== run) return; // a newer request (or another customer) replaced this one
      if (error) setState({ status: 'error', salesperson: null });
      else setState({ status: salesperson ? 'assigned' : 'none', salesperson });
    } catch (e) {
      if (runRef.current === run) setState({ status: 'error', salesperson: null });
    }
  }, [partyId, t]);

  useEffect(() => { load(); return () => { runRef.current += 1; }; }, [load]);

  const open = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert(t('common.error') || 'Error', 'This action is not available on this device.'));
  };

  const { salesperson } = state;
  const actions = contactActions(salesperson);

  let body;
  if (state.status === 'assigned') body = <Text style={styles.name} numberOfLines={1}>{salesperson.display_name}</Text>;
  else if (state.status === 'loading') body = <Text style={styles.muted}>{t('profile.salespersonCardLoading')}</Text>;
  else if (state.status === 'error') body = <Text style={styles.muted}>{t('profile.salespersonLoadError')}</Text>;
  else body = <Text style={styles.muted}>{t('profile.noSalesperson')}</Text>;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.main} onPress={state.status === 'error' ? load : onOpen} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('profile.mySalesperson')}>
        <View style={styles.iconBox}><User size={26} color={theme.colors.primary} /></View>
        <View style={styles.textBox}>
          <Text style={styles.title}>{t('profile.mySalesperson')}</Text>
          {body}
        </View>
      </TouchableOpacity>
      {state.status === 'assigned' && (actions.call || actions.whatsapp) ? (
        <View style={styles.actions}>
          {actions.call ? (
            <TouchableOpacity style={styles.round} onPress={() => open(telUrl(salesperson.mobile))} accessibilityRole="button" accessibilityLabel={t('profile.callSalesperson')}>
              <Phone size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null}
          {actions.whatsapp ? (
            <TouchableOpacity style={styles.round} onPress={() => open(whatsappUrl(salesperson.whatsapp || salesperson.mobile, salesperson.display_name))} accessibilityRole="button" accessibilityLabel={t('profile.whatsappSalesperson')}>
              <MessageCircle size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
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
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    minHeight: 72,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 72 },
  iconBox: { width: 40, alignItems: 'center', marginRight: 8 },
  textBox: { flex: 1, paddingRight: 8 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  name: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 2 },
  muted: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FFCC80',
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
