import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';

export const uploadAudio = async (uri, userId) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { success: false, error: 'File does not exist' };
    }

    const fileExt = uri.split('.').pop() || 'm4a';
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `voice-notes/${fileName}`;

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: `audio/${fileExt === 'm4a' ? 'x-m4a' : 'mp4'}`,
    });

    const { data, error } = await supabase.storage
      .from('crm-audio')
      .upload(filePath, formData, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('crm-audio')
      .getPublicUrl(filePath);

    // If bucket is private, we store the relative path and fetch via createSignedUrl later.
    // Given MC-15 strictly says "Audio private", we should store the secure filePath.
    
    // MC-17: Privacy Hardening - Purge the local audio file now that it's safely in the cloud
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      console.log('Local audio file securely purged.');
    } catch (delErr) {
      console.warn('Failed to purge local audio file:', delErr);
    }

    return { success: true, filePath: filePath, publicUrl: publicUrlData.publicUrl };
  } catch (err) {
    console.error('Media upload failed:', err);
    return { success: false, error: err.message };
  }
};
