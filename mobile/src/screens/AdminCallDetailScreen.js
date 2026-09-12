import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { Phone, Clock, FileText, User } from 'lucide-react-native';

export default function AdminCallDetailScreen({ route }) {
  const { callId } = route.params;
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCall() {
      try {
        const { data, error } = await supabase
          .from('interactions')
          .select(`
            *,
            crm_parties:party_id (display_name, mobile, city)
          `)
          .eq('id', callId)
          .single();

        if (error) throw error;

        // Fetch staff name locally if user_id exists
        if (data.user_id) {
           const { data: staffData } = await supabase
             .from('app_users')
             .select('display_name, role')
             .eq('id', data.user_id)
             .single();
           if (staffData) {
              data.app_users = staffData;
           }
        }
        
        setCall(data);
      } catch (err) {
        console.error('[AdminCallDetail]', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCall();
  }, [callId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Call Detail" showBack />
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{marginTop: 40}} />
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Call Detail" showBack />
        <Text style={styles.empty}>Call not found.</Text>
      </View>
    );
  }

  const timeStr = new Date(call.created_at).toLocaleString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const staffObj = Array.isArray(call.app_users) ? call.app_users[0] : call.app_users;
  const firmObj = Array.isArray(call.crm_parties) ? call.crm_parties[0] : call.crm_parties;

  const repName = staffObj?.display_name || 'System / Unassigned';
  const repRole = staffObj?.role || 'Unknown';
  
  const firmName = firmObj?.display_name || 'Unknown Customer';
  const firmPhone = firmObj?.mobile || 'No phone provided';
  const firmCity = firmObj?.city || 'Unknown location';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Call Detail" showBack />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.iconBox}>
            <Phone size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>{firmName}</Text>
          <Text style={styles.subTitle}>{firmCity} • {firmPhone}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Information</Text>
          <View style={styles.row}>
            <Clock size={16} color={theme.colors.onSurfaceVariant} style={styles.rowIcon}/>
            <View>
              <Text style={styles.label}>Date & Time</Text>
              <Text style={styles.value}>{timeStr}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <User size={16} color={theme.colors.onSurfaceVariant} style={styles.rowIcon}/>
            <View>
              <Text style={styles.label}>Logged By</Text>
              <Text style={styles.value}>{repName}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.rowIcon, {width:16}]}/>
            <View>
              <Text style={styles.label}>Outcome</Text>
              <Text style={styles.value}>{call.outcome || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.rowIcon, {width:16}]}/>
            <View>
              <Text style={styles.label}>Direction</Text>
              <Text style={styles.value}>{call.direction || 'Outbound'}</Text>
            </View>
          </View>
        </View>

        {call.note ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{call.note}</Text>
            </View>
          </View>
        ) : null}

        {/* Audio Review Placeholder per prompt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording / Transcription</Text>
          <View style={styles.blockedBox}>
            <Text style={styles.blockedText}>BLOCKED: Audio vault and transcription services are currently unavailable in this environment.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  iconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface, textAlign: 'center' },
  subTitle: { fontSize: 14, color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
  
  section: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rowIcon: { marginRight: 12 },
  label: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 2 },
  value: { fontSize: 15, color: theme.colors.onSurface, fontWeight: '500' },
  
  noteBox: { backgroundColor: theme.colors.surfaceContainerLowest, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  noteText: { fontSize: 14, color: theme.colors.onSurface, lineHeight: 22 },

  blockedBox: { backgroundColor: theme.colors.surfaceContainerLow, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  blockedText: { fontSize: 13, color: theme.colors.onSurfaceVariant, fontStyle: 'italic', textAlign: 'center' },

  empty: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40, fontSize: 16 },
});
