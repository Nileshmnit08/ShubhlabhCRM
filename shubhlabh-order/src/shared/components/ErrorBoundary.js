import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordError } from '../../core/startup/crashLog';

/**
 * SL-ANDROID-UNIVERSAL-COMPATIBILITY-01 — last-resort screen for a JavaScript error while RENDERING.
 * Without it, an unexpected render error in a release build closes the app instantly (no message, no login screen).
 * It does not hide native crashes; it only turns a render error into a readable screen with a Try again button, and
 * records the error locally (see crashLog.js). Deliberately uses only core React Native components and no app
 * providers, so it still works when a provider is the thing that failed.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info && info.componentStack);
    recordError(AsyncStorage, error, { fatal: false, source: 'render', componentStack: String((info && info.componentStack) || '').slice(0, 1500) });
  }

  handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.title2}>कुछ गड़बड़ हो गई</Text>
        <Text style={styles.body}>
          The app hit an unexpected problem. Your orders are safe. Please try again; if it keeps happening, contact Shubh Labh support.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry} accessibilityRole="button">
          <Text style={styles.buttonText}>Try again / फिर कोशिश करें</Text>
        </TouchableOpacity>
        <ScrollView style={styles.details}>
          <Text style={styles.detailsText}>{String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error).slice(0, 300)}</Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF8', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#202124', textAlign: 'center' },
  title2: { fontSize: 18, fontWeight: '700', color: '#5F6368', textAlign: 'center', marginTop: 2 },
  body: { fontSize: 15, lineHeight: 22, color: '#5F6368', textAlign: 'center', marginTop: 14, marginBottom: 22 },
  button: { backgroundColor: '#F28C28', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, minHeight: 48, justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  details: { maxHeight: 80, marginTop: 18 },
  detailsText: { fontSize: 11, color: '#9AA0A6', textAlign: 'center' },
});
