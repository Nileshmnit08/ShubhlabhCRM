import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

export default function UpdateDispatchScreen({ route, navigation }) {
  const { dispatchId } = route.params;
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dispatchRecord, setDispatchRecord] = useState(null);
  const [status, setStatus] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [lrBilty, setLrBilty] = useState('');

  useEffect(() => {
    fetchDispatch();
  }, [dispatchId]);

  const fetchDispatch = async () => {
    try {
      const { data, error } = await supabase
        .from('requirement_dispatches')
        .select('*')
        .eq('id', dispatchId)
        .single();

      if (error) throw error;
      
      setDispatchRecord(data);
      setStatus(data.status || '');
      setTruckNumber(data.truck_number || '');
      setDriverMobile(data.driver_mobile || '');
      setLrBilty(data.lr_bilty_number || '');
    } catch (err) {
      console.error(err);
      Alert.alert(t('error', 'Error'), t('msg_load_dispatch_fail', 'Failed to load dispatch details.'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('requirement_dispatches')
        .update({
          status: status,
          truck_number: truckNumber,
          driver_mobile: driverMobile,
          lr_bilty_number: lrBilty
        })
        .eq('id', dispatchId);

      if (error) throw error;

      Alert.alert(t('success', 'Success'), t('msg_dispatch_updated', 'Dispatch updated successfully.'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert(t('error', 'Error'), t('msg_update_dispatch_fail', 'Failed to update dispatch.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('update_dispatch', 'Update Dispatch')}</Text>
        <Text style={styles.subtitle}>{t('dispatch_date', 'Date')}: {new Date(dispatchRecord?.dispatch_date).toLocaleDateString()}</Text>

        <Input
          label={t('status', 'Status')}
          placeholder={t('placeholder_status', 'e.g., Dispatched, Delivered, Delayed')}
          value={status}
          onChangeText={setStatus}
        />

        <Input
          label={t('truck_number', 'Truck Number')}
          placeholder={t('placeholder_truck', 'Enter vehicle number')}
          value={truckNumber}
          onChangeText={setTruckNumber}
        />

        <Input
          label={t('driver_mobile', 'Driver Mobile')}
          placeholder={t('placeholder_driver_mobile', 'Enter phone number')}
          value={driverMobile}
          onChangeText={setDriverMobile}
          keyboardType="phone-pad"
        />

        <Input
          label={t('lr_bilty_number', 'LR / Bilty Number')}
          placeholder={t('placeholder_lr', 'Enter tracking number')}
          value={lrBilty}
          onChangeText={setLrBilty}
        />

        <Button 
          title={t('save_changes', 'Save Changes')} 
          onPress={handleUpdate} 
          loading={saving}
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
  subtitle: { fontSize: theme.typography.sizes.md, color: theme.colors.textMuted, marginBottom: theme.spacing.lg },
});
