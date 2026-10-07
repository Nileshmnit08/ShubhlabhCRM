import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { theme } from '../../shared/theme';

import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import SLHeader from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { Users, Phone, MessageCircle } from 'lucide-react-native';

export default function MySalespersonScreen({ navigation }) {
  const { t } = useTranslation();
  const { customerProfile } = useAuth();
  const [salesperson, setSalesperson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesperson = async () => {
      if (!customerProfile?.id) {
        setLoading(false);
        return;
      }
      try {
        // CORRECT APPROACH:
        // Use FK join from crm_parties to get the assigned staff.
        // Direct query on app_users fails because RLS only lets Buyers read their own row.
        // The FK join (rep:assigned_owner_id) is evaluated server-side and does not
        // require the Buyer to have SELECT on app_users for other rows.
        const { data, error } = await supabase
          .from('crm_parties')
          .select('assigned_owner_id, rep:assigned_owner_id(display_name, role, mobile)')
          .eq('id', customerProfile.id)
          .single();

        if (error) {
          console.warn('MySalesperson: crm_parties query error:', error);
          setLoading(false);
          return;
        }

        if (data?.rep) {
          setSalesperson(data.rep);
        } else {
          // No assignment — genuinely no salesperson
          setSalesperson(null);
        }
      } catch (err) {
        console.warn('MySalesperson: failed to fetch salesperson:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesperson();
  }, [customerProfile]);

  const handleCall = (mobile) => {
    if (!mobile) return;
    const tel = `tel:${mobile}`;
    Linking.canOpenURL(tel).then(supported => {
      if (supported) Linking.openURL(tel);
      else Alert.alert('Error', 'Cannot place call from this device.');
    });
  };

  const handleWhatsApp = (mobile) => {
    if (!mobile) return;
    const digits = mobile.replace(/\D/g, '');
    const url = `https://wa.me/91${digits}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp not available.'));
  };

  const isHindi = t('profile.language') !== 'Language';

  return (
    <View style={styles.container}>
      <SLHeader
        title={t('profile.mySalesperson')}
        showBack={true}
        navigation={navigation}
      />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : salesperson ? (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Users color={theme.colors.primary} size={32} />
            </View>
            <Text style={styles.name}>{salesperson.display_name}</Text>
            {salesperson.role && (
              <Text style={styles.role}>{salesperson.role}</Text>
            )}
            {salesperson.mobile && (
              <Text style={styles.mobile}>{salesperson.mobile}</Text>
            )}

            {salesperson.mobile && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() => handleCall(salesperson.mobile)}
                >
                  <Phone size={18} color={theme.colors.white} />
                  <Text style={styles.actionBtnText}>
                    {t('profile.salespersonCall')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.waBtn]}
                  onPress={() => handleWhatsApp(salesperson.mobile)}
                >
                  <MessageCircle size={18} color={theme.colors.white} />
                  <Text style={styles.actionBtnText}>
                    {t('profile.salespersonWhatsApp')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Users color={theme.colors.border} size={64} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>
              {t('profile.noSalesperson')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, textAlign: 'center' },
  role: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
  mobile: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 1,
  },
  callBtn: { backgroundColor: theme.colors.primary },
  waBtn: { backgroundColor: '#25D366' },
  actionBtnText: { color: theme.colors.white, fontWeight: 'bold', fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' },
});
