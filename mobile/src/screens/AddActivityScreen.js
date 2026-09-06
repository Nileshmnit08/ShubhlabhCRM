import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
export default function AddActivityScreen({ route, navigation }) {
  const { partyId, partyName } = route.params;
  const { userProfile } = useAuth();
  
  const [interactionType, setInteractionType] = useState('Call');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const types = ['Call', 'WhatsApp', 'Meeting', 'Note'];

  const handleSubmit = async () => {
    if (!notes.trim()) {
      Alert.alert('Error', 'Please enter some notes.');
      return;
    }

    setLoading(true);
    try {
      const { error: intErr } = await supabase
        .from('interactions')
        .insert([{
          party_id: partyId,
          user_id: userProfile.id,
          interaction_type: interactionType,
          direction: 'Outbound',
          notes: notes,
          outcome: 'Completed'
        }]);

      if (intErr) throw intErr;

      Alert.alert('Success', 'Activity logged successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to log activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Log New Activity</Text>
        <Text style={styles.subtitle}>{partyName}</Text>

        <View style={styles.typeSelector}>
          {types.map(t => (
            <TouchableOpacity 
              key={t} 
              style={[styles.typeButton, interactionType === t && styles.typeButtonActive]}
              onPress={() => setInteractionType(t)}
            >
              <Text style={[styles.typeText, interactionType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder={`Enter details about the ${interactionType.toLowerCase()}...`}
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
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Activity</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#3b82f6', marginBottom: 20, fontWeight: 'bold' },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  typeButtonActive: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6' },
  typeText: { color: '#94a3b8', fontSize: 14 },
  typeTextActive: { color: '#60a5fa', fontWeight: 'bold' },
  inputContainer: { marginBottom: 20 },
  label: { color: '#cbd5e1', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  textArea: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, color: '#f8fafc', padding: 12, fontSize: 16, minHeight: 120 },
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
