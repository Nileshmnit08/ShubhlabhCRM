// Device storage backend for LocalPersistence (React Native only).
// Same library and version Field Assist uses on these devices.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocalStore } from './LocalPersistence';

export const deviceStore = createLocalStore(AsyncStorage);
