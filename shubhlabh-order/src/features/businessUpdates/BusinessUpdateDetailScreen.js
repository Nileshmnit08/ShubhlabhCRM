import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../core/api/supabase';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useAuth } from '../auth/AuthContext';

export default function BusinessUpdateDetailScreen({ route, navigation }) {
  const { updateId } = route.params;
  const [update, setUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchDetail();
  }, [updateId]);

  const fetchDetail = async () => {
    try {
      const { data, error } = await supabase.from('business_updates')
        .select('*')
        .eq('id', updateId)
        .single();
      
      if (error) throw error;
      setUpdate(data);

      // Mark as read
      markAsRead(updateId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      if (!userProfile?.crm_party_id) return;
      
      // Check if recipient record exists for this buyer
      const { data: existing } = await supabase.from('business_update_recipients')
        .select('id, read_at')
        .eq('update_id', id)
        .eq('customer_id', userProfile.crm_party_id)
        .single();
        
      if (existing) {
        if (!existing.read_at) {
          await supabase.from('business_update_recipients')
            .update({ read_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } else {
        // Create tracking record if it was an "ALL" audience update
        await supabase.from('business_update_recipients')
          .insert({
            update_id: id,
            customer_id: userProfile.crm_party_id,
            read_at: new Date().toISOString(),
            delivered_at: new Date().toISOString()
          });
      }
    } catch (e) {
      console.error('Error marking as read', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SLHeader title="Update Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!update) return null;

  const dateStr = new Date(update.published_at).toLocaleDateString();
  const timeStr = new Date(update.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const displayType = update.type.replace(/_/g, ' ');

  return (
    <SafeAreaView style={styles.container}>
      <SLHeader title="Update Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.typeText}>{displayType}</Text>
          <Text style={styles.titleText}>{update.title}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{update.message}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBox: { marginBottom: theme.spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: theme.spacing.md },
  typeText: { ...theme.typography.h3, color: theme.colors.primary, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  titleText: { ...theme.typography.h1, marginBottom: theme.spacing.sm },
  dateText: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary, marginBottom: 2 },
  timeText: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  messageBox: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  messageText: { ...theme.typography.bodyLarge, lineHeight: 24 }
});
