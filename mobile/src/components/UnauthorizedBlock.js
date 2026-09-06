import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export default function UnauthorizedBlock({ message = "You don't have permission to view this section." }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AlertTriangle color="#ef4444" size={48} />
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
