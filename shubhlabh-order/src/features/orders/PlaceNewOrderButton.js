import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import SLButton from '../../shared/components/SLButton';
import { useTranslation } from '../../shared/localization/i18n';
import { useOrderNavigation } from '../../navigation/useOrderNavigation';

/**
 * SL-ORDER-NEW-ORDER-CONSISTENCY-01 — the standard "Place New Order" button.
 *
 * Used wherever a plain button starts a fresh order (Home empty state, My Orders empty state…):
 * same label (home.placeNewOrder), same 48dp touch target, same loading/disabled behaviour, same
 * shared action. The large Home call-to-action card and quick-action tile keep their own designs
 * but call the same `startNewOrder()` action.
 */
export default function PlaceNewOrderButton({ style }) {
  const { t } = useTranslation();
  const { startNewOrder } = useOrderNavigation();
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const onPress = useCallback(async () => {
    setBusy(true);
    try {
      await startNewOrder();
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [startNewOrder]);

  return (
    <SLButton
      title={t('home.placeNewOrder')}
      onPress={onPress}
      loading={busy}
      style={[styles.button, style]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: 'auto',
    minWidth: 200,
    height: 48,
    paddingHorizontal: 24,
  },
});
