import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

export default function AddFollowUpScreen({ route, navigation }) {
  const { partyId, partyName } = route.params;
  const { userProfile } = useAuth();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('General Follow-up');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('Medium');

  const handleSubmit = async () => {
    if (!reason.trim() || !followUpDate.trim()) {
      Alert.alert(t('error', 'Error'), t('msg_fill_required', 'Please fill in all required fields.'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('follow_ups')
        .insert([{
          party_id: partyId,
          reason: reason,
          follow_up_date: followUpDate,
          notes: notes || null,
          status: 'Pending',
          priority: priority,
          created_by: userProfile.id
        }]);

      if (error) throw error;

      Alert.alert(t('success', 'Success'), t('msg_fu_added', 'Follow-up scheduled successfully.'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert(t('error', 'Error'), t('msg_fu_fail', 'Failed to schedule follow-up.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('schedule_followup', 'Schedule Follow-up')}</Text>
        <Text style={styles.subtitle}>{partyName}</Text>

        <Input
          label={`${t('followup_reason', 'Reason')} *`}
          placeholder={t('placeholder_reason', 'e.g., Payment collection')}
          value={reason}
          onChangeText={setReason}
        />

        <Input
          label={`${t('followup_date', 'Follow-up Date')} *`}
          placeholder="YYYY-MM-DD"
          value={followUpDate}
          onChangeText={setFollowUpDate}
        />

        <Input
          label={t('priority', 'Priority')}
          placeholder="Low, Medium, High"
          value={priority}
          onChangeText={setPriority}
        />

        <Input
          label={t('notes', 'Additional Notes')}
          placeholder={t('placeholder_notes', 'Enter any context...')}
          value={notes}
          onChangeText={setNotes}
          multiline
          containerStyle={{ minHeight: 80 }}
        />

        <Button 
          title={t('save_followup', 'Save Follow-up')} 
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
});
