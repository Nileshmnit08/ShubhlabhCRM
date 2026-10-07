import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import SLButton from '../../shared/components/SLButton';
import SLCard from '../../shared/components/SLCard';
import { supabase } from '../../core/api/supabase';

export default function SettingsScreen({ navigation }) {
  const { session, customerProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const userMetadata = session?.user?.user_metadata || {};

  const handleRestartOnboarding = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: false }
      });
      if (error) throw error;
      // It will automatically navigate back to onboarding since AuthContext listens to auth changes
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SLHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        
        <SLCard style={styles.card}>
          <Text style={styles.cardTitle}>Shop Information</Text>
          <Text style={styles.text}>Shop: {customerProfile?.display_name || 'N/A'}</Text>
          <Text style={styles.text}>Location: {userMetadata?.shopLocation?.address || 'N/A'}</Text>
          <Text style={styles.text}>Delivery: {userMetadata?.deliveryAddress?.address || 'N/A'}</Text>
          <Text style={styles.text}>Photo: {userMetadata?.shopPhoto ? 'Uploaded' : 'Not Uploaded'}</Text>
          
          <SLButton 
            title="Complete / Edit Profile" 
            onPress={handleRestartOnboarding} 
            disabled={isSaving}
            style={{ marginTop: 16 }} 
          />
        </SLCard>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  card: { padding: theme.spacing.md, marginBottom: theme.spacing.md },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  text: { fontSize: 16, marginBottom: 8, color: '#4B5563' }
});
