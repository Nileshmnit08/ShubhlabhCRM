import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../../shared/theme';
import { useTranslation } from '../../shared/localization/i18n';
import { useAuth } from '../auth/AuthContext';
import { useOrderList } from './OrderListContext';
import { supabase } from '../../core/api/supabase';
import { CheckCircle } from 'lucide-react-native';
import SLHeader from '../../shared/components/SLHeader';
import { submitOrder, singleFlight, resolveDeliveryAddress, currentSavedAddress } from './orderSubmission';
import { validateDraftItems, describeProblem, newClientReferenceId } from './repeatOrder';

export default function OrderReviewScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { customerProfile, session } = useAuth();
  const { discardSavedDraft } = useOrderList();
  const { finalItems, existingOrder, clearCallback } = route.params;
  // Only an EDIT arrives with the existing order. A new or repeated order is always inserted as a NEW order.
  const submitMode = route.params.submitMode || (existingOrder ? 'edit' : 'create');
  const repeatInfo = route.params.repeatInfo || null;
  const isHindi = t('profile.language') !== 'Language';
  const [loading, setLoading] = useState(false);

  // One idempotency key per draft: a retry (double tap, lost response, partial failure) resumes the order
  // that was already created instead of creating a second one.
  const referenceRef = useRef(route.params.clientReferenceId || newClientReferenceId());

  const savedAddress = currentSavedAddress(session, customerProfile);
  const previousAddress = repeatInfo?.deliveryAddress || '';
  const canChooseAddress = !!previousAddress && previousAddress !== savedAddress;
  const [addressChoice, setAddressChoice] = useState(previousAddress ? 'previous' : 'saved');
  const address = resolveDeliveryAddress({ preferred: addressChoice === 'previous' ? previousAddress : '', session, customerProfile });
  const problems = useMemo(() => validateDraftItems(finalItems), [finalItems]);

  // The submit function is created once and reads the latest values from this ref.
  const latest = useRef({});
  latest.current = { address, customerProfile, session, isHindi, discardSavedDraft };

  const placeOnce = useRef(null);
  if (!placeOnce.current) {
    // singleFlight: a second tap while the first is running gets the first one's result — never a second request.
    placeOnce.current = singleFlight(async () => {
      const { address: addr, customerProfile: profile, session: sess, isHindi: hindi } = latest.current;
      setLoading(true);
      try {
        const result = await submitOrder({
          client: supabase,
          session: sess,
          customerProfile: profile,
          items: finalItems,
          mode: submitMode,
          existingOrder: submitMode === 'edit' ? existingOrder : null,
          clientReferenceId: referenceRef.current,
          address: addr,
          isHindi: hindi,
        });
        // The order is placed: the saved repeat draft must not come back after a restart.
        latest.current.discardSavedDraft();
        // Navigate to Success
        navigation.navigate('OrderSuccess', { orderData: result.orderData });

        // Use setTimeout to clear it after navigation, so the back stack doesn't visually break before transitioning
        setTimeout(() => {
          if (clearCallback) clearCallback();
        }, 500);
      } catch (error) {
        console.error('Place order error:', error);
        Alert.alert(
          t('common.error') || 'An error occurred',
          error?.message || 'Failed to place order.'
        );
      } finally {
        setLoading(false);
      }
    });
  }
  const handlePlaceOrder = () => placeOnce.current();

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader
        title={t('profile.language') === 'Language' ? 'Review Order' : 'ऑर्डर की समीक्षा'}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {submitMode === 'reorder' && (
          <View style={styles.repeatBanner}>
            <Text style={styles.repeatBannerTitle}>
              {t('repeat.bannerTitle')}{repeatInfo?.source?.order_no ? ` • ${t('repeat.basedOn')} #${repeatInfo.source.order_no}` : ''}
            </Text>
            <Text style={styles.repeatBannerText}>{t('repeat.deliveryTo')}: {address}</Text>
            {canChooseAddress && (
              <View style={styles.addressRow}>
                {[['previous', t('repeat.usePreviousAddress')], ['saved', t('repeat.useSavedAddress')]].map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.addressChip, addressChoice === key && styles.addressChipActive]}
                    onPress={() => setAddressChoice(key)}
                    disabled={loading}
                  >
                    <Text style={[styles.addressChipText, addressChoice === key && styles.addressChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        {problems.length > 0 && (
          <View style={styles.problemBox}>
            <Text style={styles.problemTitle}>{t('repeat.blockedTitle')}</Text>
            {problems.map((p) => (
              <Text key={p.index} style={styles.problemText}>{describeProblem(p.problems[0], p.product_name, isHindi)}</Text>
            ))}
          </View>
        )}
        <View style={styles.card}>
           {finalItems.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemTitle}>{item.product_name}</Text>
                  <Text style={styles.itemSub}>{item.quantity} {item.unit || 'Bags'} {item.weight ? `• ${item.weight} KG` : ''}</Text>
                  {item.gift && (
                    <Text style={styles.itemGift}>Gift: {item.gift === 'Others' ? item.other_gift : item.gift}</Text>
                  )}
                </View>
              </View>
           ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, (loading || problems.length > 0) && { opacity: 0.6 }]} onPress={handlePlaceOrder} disabled={loading || problems.length > 0}>
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <CheckCircle size={22} color={theme.colors.white} />
              <Text style={styles.saveBtnText}>{t('profile.language') === 'Language' ? 'Place Order' : 'ऑर्डर करें'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.textPrimary },
  backButton: { padding: 8, marginLeft: -8 },
  content: { padding: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary },
  itemSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  itemGift: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  footer: { padding: 16, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  saveBtn: { height: 56, backgroundColor: theme.colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.white, textTransform: 'uppercase' },
  repeatBanner: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  repeatBannerTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  repeatBannerText: { fontSize: 14, color: theme.colors.textPrimary, marginTop: 6, lineHeight: 20 },
  addressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  addressChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, justifyContent: 'center' },
  addressChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  addressChipText: { fontSize: 13, color: theme.colors.textPrimary },
  addressChipTextActive: { color: theme.colors.white, fontWeight: '700' },
  problemBox: { backgroundColor: '#FEE4E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F5B5AF' },
  problemTitle: { fontSize: 14, fontWeight: '700', color: '#B42318' },
  problemText: { fontSize: 13, color: '#B42318', marginTop: 6, lineHeight: 18 },
});
