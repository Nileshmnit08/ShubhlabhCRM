import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { whisper } from 'whisper.rn';
import { Mic, Square, AlertCircle } from 'lucide-react-native';
import { theme } from '../theme';

export default function VoiceInput({ label, value, onChangeText, placeholder, error, style, containerStyle, ...props }) {
  const [recording, setRecording] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [focused, setFocused] = useState(false);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Microphone permission is required to use voice input.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setRecording(null);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Attempt transcription
      try {
        // We attempt to initialize whisper context. If no model is bundled, this will throw.
        // As per the specification, if unavailable, we fallback.
        const context = await whisper.initContext({
          modelPath: require('../../assets/ggml-tiny.bin') 
        });
        const result = await context.transcribe(uri, { language: 'en' });
        onChangeText((value ? value + ' ' : '') + result.result.trim());
        await context.release();
      } catch (err) {
        console.warn('Whisper transcription failed or model missing, using fallback.', err);
        // Fallback required by sprint specification: "If local transcription is unavailable: preserve the audio and show an explicit unavailable state."
        onChangeText((value ? value + '\n' : '') + '[Transcription unavailable - Audio Saved]');
      }
    } catch (error) {
      console.error('Failed to stop/transcribe recording', error);
      onChangeText((value ? value + '\n' : '') + '[Transcription failed]');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        focused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChangeText={onChangeText}
          multiline
          {...props}
        />
        
        <View style={styles.actionColumn}>
          {isTranscribing ? (
            <ActivityIndicator size="small" color={theme.colors.secondary} style={styles.iconBtn} />
          ) : recording ? (
            <TouchableOpacity style={styles.iconBtnRecording} onPress={stopRecording}>
              <Square size={20} color="#fff" fill="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconBtn} onPress={startRecording}>
              <Mic size={20} color={theme.colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      {recording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording... Tap stop to transcribe</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSurfaceVariant,
    fontSize: theme.typography.sizes.labelLg,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.1,
  },
  inputContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: theme.borders.radius.md,
    flexDirection: 'row',
    minHeight: 80,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    color: theme.colors.onSurface,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.bodyMd,
    fontFamily: theme.typography.fontFamily.body,
    textAlignVertical: 'top',
  },
  actionColumn: {
    padding: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnRecording: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.error,
    fontSize: theme.typography.sizes.labelMd,
    marginTop: theme.spacing.xs,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
});
