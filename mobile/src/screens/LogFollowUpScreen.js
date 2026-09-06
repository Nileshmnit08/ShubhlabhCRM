import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

export default function LogFollowUpScreen({ route, navigation }) {
  const { followUpId, partyId, partyName, currentReason } = route.params;
  const { userProfile } = useAuth();
  
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!notes.trim()) {
      Alert.alert('Error', 'Please enter interaction notes.');
      return;
    }

    setLoading(true);
    try {
      // 1. Mark existing follow up as Completed
      if (followUpId) {
        const { error: fuErr } = await supabase
          .from('follow_ups')
          .update({ status: 'Completed', notes: notes })
          .eq('id', followUpId);
        if (fuErr) throw fuErr;
      }

      // 2. Insert interaction
      const { error: intErr } = await supabase
        .from('interactions')
        .insert([{
          party_id: partyId,
          user_id: userProfile.id,
          interaction_type: 'Call',
          direction: 'Outbound',
          notes: notes,
          outcome: 'Completed'
        }]);
      if (intErr) throw intErr;

      Alert.alert('Success', 'Follow-up logged successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to log follow-up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Log Interaction</Text>
        <Text style={styles.subtitle}>Customer: {partyName}</Text>
        {currentReason ? <Text style={styles.reasonText}>Reason: {currentReason}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter discussion notes..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Follow-up</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  reasonText: { fontSize: 14, color: '#3b82f6', marginBottom: 20, fontStyle: 'italic' },
  inputContainer: { marginBottom: 20 },
  label: { color: '#cbd5e1', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  textArea: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#f8fafc',
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  button: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
