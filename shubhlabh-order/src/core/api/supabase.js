import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';
import { createResilientStorage } from './resilientStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';

// Reads/writes of the saved login go through a guard: a Keystore problem on a particular phone (e.g. data restored
// from a backup, a vendor quirk, a hung call) must lead to the login screen, not to a dead app. See resilientStorage.js.
const ExpoSecureStoreAdapter = createResilientStorage({
  backend: {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  },
  onError: ({ op, key, message }) => console.warn(`[SecureStore] ${op}(${key}) failed: ${message}`),
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
