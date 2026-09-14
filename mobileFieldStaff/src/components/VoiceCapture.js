import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, touchTargets, rounded } from '../theme/tokens';

export function VoiceCaptureUI({ state = 'READY', onStart, onStop }) {
  // States: READY, LISTENING, PROCESSING, REVIEW, SAVED, ERROR
  
  const isListening = state === 'LISTENING';
  const isProcessing = state === 'PROCESSING';

  const getIcon = () => {
    switch (state) {
      case 'LISTENING': return 'mic';
      case 'PROCESSING': return null;
      case 'SAVED': return 'check';
      case 'ERROR': return 'error-outline';
      default: return 'mic-none';
    }
  };

  const getMessage = () => {
    switch (state) {
      case 'LISTENING': return 'Listening...';
      case 'PROCESSING': return 'Processing...';
      case 'SAVED': return 'Saved';
      case 'ERROR': return 'Error recording';
      default: return 'Tap to speak';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, isListening && styles.listeningActive, state === 'ERROR' && styles.errorActive]}
        onPress={isListening ? onStop : onStart}
      >
        {isProcessing ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <MaterialIcons name={getIcon()} size={28} color={isListening ? colors.error : colors.primary} />
        )}
      </TouchableOpacity>
      <Text style={styles.statusText}>{getMessage()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5', // Soft emerald wash
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  listeningActive: {
    backgroundColor: '#FEF2F2',
  },
  errorActive: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  }
});
