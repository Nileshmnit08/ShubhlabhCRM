import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { BottomSheetFoundation, Button, VoiceCaptureUI } from '../components';

export function VisitOutcomeSheet({ visible, onClose, onSave }) {
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [voiceState, setVoiceState] = useState('READY');

  const outcomes = [
    { id: 'deal', label: 'Deal Closed', icon: 'check-circle' },
    { id: 'payment', label: 'Promise to Pay', icon: 'payments' },
    { id: 'demo', label: 'Demo Given', icon: 'inventory-2' },
    { id: 'followup', label: 'Follow-up Set', icon: 'calendar-clock' }
  ];

  const toggleOutcome = (id) => {
    if (selectedOutcomes.includes(id)) {
      setSelectedOutcomes(selectedOutcomes.filter(o => o !== id));
    } else {
      setSelectedOutcomes([...selectedOutcomes, id]);
    }
  };

  return (
    <BottomSheetFoundation visible={visible} onClose={onClose} height="75%">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={typography.headlineSm}>Visit Summary & Outcome</Text>
          <Text style={styles.subtitle}>Shree Ganesh Fertilisers</Text>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Primary Outcome / मुख्य नतीजा</Text>
          <Text style={styles.hintText}>1-Tap Select</Text>
          
          <View style={styles.outcomeGrid}>
            {outcomes.map(o => {
              const isActive = selectedOutcomes.includes(o.id);
              return (
                <TouchableOpacity 
                  key={o.id} 
                  style={[styles.outcomeBtn, isActive && styles.outcomeBtnActive]}
                  onPress={() => toggleOutcome(o.id)}
                >
                  <MaterialIcons name={o.icon} size={20} color={isActive ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.outcomeText, isActive && styles.outcomeTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.voiceSection}>
            <Text style={styles.sectionTitle}>Voice Notes</Text>
            <VoiceCaptureUI 
              state={voiceState}
              onStart={() => setVoiceState('LISTENING')}
              onStop={() => {
                setVoiceState('PROCESSING');
                setTimeout(() => setVoiceState('SAVED'), 1000);
              }}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Complete & Sync" onPress={() => {
            onSave(selectedOutcomes);
            onClose();
          }} />
        </View>
      </View>
    </BottomSheetFoundation>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 16 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  content: { flex: 1 },
  sectionTitle: { ...typography.labelLg, color: colors.onSurface },
  hintText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 12 },
  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  outcomeBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.surfaceContainerHighest, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    borderRadius: rounded.md, 
    gap: 8,
    width: '47%'
  },
  outcomeBtnActive: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: colors.primary
  },
  outcomeText: { ...typography.labelMd, color: colors.onSurfaceVariant },
  outcomeTextActive: { color: colors.primary, fontWeight: 'bold' },
  voiceSection: { marginTop: 16, marginBottom: 24 },
  footer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }
});
