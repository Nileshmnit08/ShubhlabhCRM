import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App';
import { installGlobalErrorRecorder } from './src/core/startup/crashLog';

// Record any JavaScript error locally (for support diagnosis), then let React Native handle it exactly as before.
try {
  installGlobalErrorRecorder(global.ErrorUtils, AsyncStorage);
} catch (e) {
  // diagnostics must never stop the app from starting
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
