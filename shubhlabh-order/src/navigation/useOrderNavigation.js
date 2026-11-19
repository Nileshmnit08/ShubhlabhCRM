import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOrderDraft } from '../features/orders/OrderListContext';
import { useTranslation } from '../shared/localization/i18n';
import { requestOrderStart, ORDER_KINDS } from './orderNavigation';

/**
 * SL-ORDER-NEW-ORDER-CONSISTENCY-01 — every order-starting button uses this hook:
 *
 *   const { startNewOrder, reorder, editOrder } = useOrderNavigation();
 *
 *   startNewOrder()   "Place New Order": a fresh order session (empty cart)
 *   reorder(order)    "Reorder" / "Repeat Order": a new order pre-filled from a previous one
 *   editOrder(order)  "Edit Order": the existing order loaded for changes
 *
 * All three open the SAME existing screen (NewOrderTab → NewOrderMain), from any tab or from the
 * Help button, ignore repeated taps, never stack a second New Order flow, and — when the customer
 * has an unfinished order still open — ask before replacing it instead of clearing the cart.
 */
export function useOrderNavigation() {
  const navigation = useNavigation();
  const { hasDraft, hasSavedDraft } = useOrderDraft();
  const { t } = useTranslation();

  const askDraft = useCallback(() => new Promise((resolve) => {
    Alert.alert(
      t('newOrder.draftTitle'),
      t('newOrder.draftMessage'),
      [
        { text: t('newOrder.draftContinue'), onPress: () => resolve('continue') },
        { text: t('newOrder.draftStartNew'), style: 'destructive', onPress: () => resolve('new') },
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve('cancel') },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    );
  }), [t]);

  const start = useCallback(
    (request) => requestOrderStart(navigation, request, { hasDraft: hasDraft(), hasSavedDraft: hasSavedDraft(), askDraft }),
    [navigation, hasDraft, hasSavedDraft, askDraft],
  );

  return useMemo(() => ({
    startNewOrder: () => start({ kind: ORDER_KINDS.NEW }),
    reorder: (order) => start({ kind: ORDER_KINDS.REORDER, order }),
    editOrder: (order) => start({ kind: ORDER_KINDS.EDIT, order }),
  }), [start]);
}

export default useOrderNavigation;
