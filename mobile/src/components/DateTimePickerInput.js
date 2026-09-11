import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { theme } from '../theme';

export default function DateTimePickerInput({ 
  label, 
  value, 
  onChange, 
  mode = 'date', 
  error, 
  containerStyle 
}) {
  const [show, setShow] = useState(false);

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      // In iOS, picker stays open inline, so we just update value.
      // onChange should receive the raw Date object, or a formatted string depending on use case.
      // We will pass the raw Date object and let parent format it.
      onChange(selectedDate);
    }
  };

  const getDisplayText = () => {
    if (!value) return mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM';
      if (mode === 'date') {
        return d.toISOString().split('T')[0];
      } else {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      return mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM';
    }
  };

  // Prepare a safe Date object for the picker
  const safeDate = () => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={[styles.inputBox, error && styles.inputError]} 
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {getDisplayText()}
        </Text>
        {mode === 'date' ? (
          <Calendar size={18} color={theme.colors.onSurfaceVariant} />
        ) : (
          <Clock size={18} color={theme.colors.onSurfaceVariant} />
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {show && (
        <DateTimePicker
          value={safeDate()}
          mode={mode}
          display="default"
          onChange={handleChange}
        />
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
  inputBox: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: theme.borders.radius.md,
    height: 48,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  inputText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
  },
  placeholderText: {
    color: theme.colors.onSurfaceVariant,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.error,
    fontSize: theme.typography.sizes.labelMd,
    marginTop: theme.spacing.xs,
  },
});
