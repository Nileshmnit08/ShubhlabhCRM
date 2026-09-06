import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

export default function AddRequirementScreen({ route, navigation }) {
  const { partyId, partyName } = route.params;
  const { userProfile } = useAuth();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Bags');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const handleSubmit = async () => {
    if (!productType.trim() || !quantity.trim()) {
      Alert.alert(t('error', 'Error'), t('msg_fill_required', 'Please fill in all required fields.'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('requirements')
        .insert([{
          party_id: partyId,
          product_type: productType,
          required_quantity: Number(quantity),
          unit: unit,
          delivery_location: deliveryLocation,
          expected_delivery_date: expectedDate || null,
          status: 'Open',
          created_by: userProfile.id
        }]);

      if (error) throw error;

      Alert.alert(t('success', 'Success'), t('msg_req_added', 'Requirement added successfully.'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert(t('error', 'Error'), t('msg_req_fail', 'Failed to add requirement.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('add_requirement', 'Add Requirement')}</Text>
        <Text style={styles.subtitle}>{partyName}</Text>

        <Input
          label={`${t('product_type', 'Product Type')} *`}
          placeholder={t('placeholder_product', 'e.g., Cement, Steel')}
          value={productType}
          onChangeText={setProductType}
        />

        <View style={styles.row}>
          <Input
            label={`${t('quantity', 'Quantity')} *`}
            placeholder="0"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            containerStyle={{ flex: 1, marginRight: theme.spacing.sm }}
          />
          <Input
            label={t('unit', 'Unit')}
            value={unit}
            onChangeText={setUnit}
            containerStyle={{ flex: 1, marginLeft: theme.spacing.sm }}
          />
        </View>

        <Input
          label={t('delivery_location', 'Delivery Location')}
          placeholder={t('placeholder_location', 'Enter city or address')}
          value={deliveryLocation}
          onChangeText={setDeliveryLocation}
        />

        <Input
          label={t('expected_date', 'Expected Delivery Date')}
          placeholder="YYYY-MM-DD"
          value={expectedDate}
          onChangeText={setExpectedDate}
        />

        <Button 
          title={t('save_requirement', 'Save Requirement')} 
          onPress={handleSubmit} 
          loading={loading}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  card: { padding: theme.spacing.lg },
  title: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtitle: { fontSize: theme.typography.sizes.md, color: theme.colors.primary, marginBottom: theme.spacing.lg, fontWeight: theme.typography.weights.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
