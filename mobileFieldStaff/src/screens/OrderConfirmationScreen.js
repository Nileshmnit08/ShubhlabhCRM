import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { OrderSummaryView } from '../components';

export function OrderConfirmationScreen({ navigation, route }) {
  const { order, customerName, customerMobile } = route.params;

  let totalWeightKg = 0;
  let canCalculateWeight = true;

  if (order.requirement_items && order.requirement_items.length > 0) {
    order.requirement_items.forEach(item => {
      if (item.unit === 'Bags' && item.weight && item.quantity) {
        totalWeightKg += item.quantity * item.weight;
      } else if (item.unit === 'MT' && item.quantity) {
        totalWeightKg += item.quantity * 1000;
      } else {
        canCalculateWeight = false;
      }
    });
  } else {
    canCalculateWeight = false;
  }

  const orderIdShort = order.id ? order.id.substring(0, 8).toUpperCase() : 'N/A';
  const orderDate = new Date().toLocaleDateString();
  const orderTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleWhatsAppShare = async () => {
    if (!customerMobile) {
      Alert.alert('No Mobile Number', 'Customer does not have a registered mobile number for WhatsApp.');
      return;
    }

    let message = `*Shubh Labh Order Confirmation*\n\n`;
    message += `*Customer:* ${customerName}\n`;
    message += `*Order Number:* ${orderIdShort}\n`;
    message += `*Date:* ${orderDate} ${orderTime}\n\n`;
    message += `*Products:*\n`;

    order.requirement_items.forEach(item => {
      message += `\n*${item.category || 'Product'}*\n`;
      message += `${item.product_name}\n`;
      if (item.unit === 'Bags' && item.weight) {
        message += `${item.weight} kg × ${item.quantity} Bags\n`;
        message += `Total: ${(item.weight * item.quantity).toLocaleString()} kg\n`;
      } else {
        message += `${item.quantity} ${item.unit}\n`;
      }
    });

    if (canCalculateWeight && totalWeightKg > 0) {
      message += `\n*TOTAL ORDER WEIGHT*\n${totalWeightKg.toLocaleString()} kg\n`;
    }

    const url = `whatsapp://send?phone=${customerMobile.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Not Installed', 'WhatsApp does not appear to be installed on this device.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to open WhatsApp. The order has been saved.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="close" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerPageTitle}>Order Confirmation</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.successCard}>
          <MaterialIcons name="check-circle" size={64} color="#0d5c3a" style={{ marginBottom: 16 }} />
          <Text style={styles.successTitle}>Order Saved Successfully!</Text>
          <Text style={styles.successSub}>Your order has been queued for sync.</Text>
        </View>

        <OrderSummaryView 
          orderIdShort={orderIdShort}
          orderDate={orderDate}
          orderTime={orderTime}
          customerName={customerName}
          requirementItems={order.requirement_items}
          totalWeightKg={totalWeightKg}
          canCalculateWeight={canCalculateWeight}
        />

        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsAppShare}>
          <Text style={styles.whatsappBtnText}>Share with Customer on WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.homeBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, backgroundColor: 'rgba(248, 249, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'col' },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  container: { padding: 16, paddingBottom: 40 },
  successCard: { alignItems: 'center', backgroundColor: '#a9f3c5', padding: 24, borderRadius: 16, marginBottom: 16, elevation: 2 },
  successTitle: { ...typography.headlineSm, fontWeight: 'bold', color: '#005232', marginBottom: 4 },
  successSub: { ...typography.bodyMd, color: '#005232' },
  whatsappBtn: { backgroundColor: '#25D366', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, elevation: 2 },
  whatsappBtnText: { ...typography.labelLg, color: '#ffffff', fontWeight: 'bold' },
  homeBtn: { backgroundColor: '#e5eeff', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cce0ff' },
  homeBtnText: { ...typography.labelLg, color: colors.primary, fontWeight: 'bold' },
});
