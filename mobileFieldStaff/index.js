import { registerRootComponent } from 'expo';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';

// Register background handler
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('[FCM Background] Message handled in the background!', remoteMessage);
  // The actual Wake-up / Call Notification logic will be handled by Notifee / Call UI
  // in the next sprint. For now, this ensures the message is received and acknowledged.
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
