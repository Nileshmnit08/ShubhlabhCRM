import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components';


export function MyActivityScreen({ navigation }) {
  const formatTime = (d) => {
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
  };

  const formatDate = (d) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  };

  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { session } = useAuth();

  useEffect(() => {
    fetchActivities();
  }, [session?.user?.id]);

  const fetchActivities = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    try {
      const [visitsRes, reqsRes, followupsRes] = await Promise.all([
        supabase.from('crm_visits').select('id, created_at, status, crm_parties(display_name)').eq('staff_id', session.user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('requirements').select('id, created_at, updated_at, demand_ref, status, crm_parties(display_name)').eq('assigned_to', session.user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('follow_ups').select('id, created_at, status, crm_parties(display_name)').eq('assigned_to', session.user.id).eq('status', 'Completed').order('updated_at', { ascending: false }).limit(20)
      ]);

      let combined = [];

      if (visitsRes.data) {
        combined = [...combined, ...visitsRes.data.map(v => ({
          type: 'visit',
          id: v.id,
          date: new Date(v.created_at),
          title: `Visit ${v.status === 'Completed' ? 'completed' : 'created'}`,
          subtitle: v.crm_parties?.display_name || 'Customer',
          icon: 'location-on',
          iconColor: colors.primary
        }))];
      }

      if (reqsRes.data) {
        combined = [...combined, ...reqsRes.data.map(r => ({
          type: 'order',
          id: r.id,
          date: new Date(r.created_at),
          title: `Order #${r.demand_ref || r.id.substring(0,8).toUpperCase()} created`,
          subtitle: r.crm_parties?.display_name || 'Customer',
          icon: 'shopping-cart',
          iconColor: '#904d00'
        }))];
        // Note: we can also add 'updated' events if updated_at != created_at, but we'll stick to creation for simplicity unless we have a history table.
      }

      if (followupsRes.data) {
        combined = [...combined, ...followupsRes.data.map(f => ({
          type: 'followup',
          id: f.id,
          date: new Date(f.created_at),
          title: `Follow-up completed`,
          subtitle: f.crm_parties?.display_name || 'Customer',
          icon: 'check-circle',
          iconColor: '#1b5e20'
        }))];
      }

      combined.sort((a, b) => b.date - a.date);
      setActivities(combined);
      await AsyncStorage.setItem('@my_activity_cache', JSON.stringify(combined));

    } catch (err) {
      const cached = await AsyncStorage.getItem('@my_activity_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.forEach(p => p.date = new Date(p.date));
        setActivities(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Activity</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {isLoading ? (
           <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
        ) : activities.length > 0 ? (
          <View style={styles.timeline}>
            {activities.map((activity, index) => (
              <View key={`${activity.type}-${activity.id}-${index}`} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timeText}>{formatTime(activity.date)}</Text>
                  <Text style={styles.dateText}>{formatDate(activity.date)}</Text>
                </View>
                
                <View style={styles.timelineCenter}>
                  <View style={[styles.iconBox, {backgroundColor: activity.iconColor + '20'}]}>
                    <MaterialIcons name={activity.icon} size={16} color={activity.iconColor} />
                  </View>
                  {index !== activities.length - 1 && <View style={styles.timelineLine} />}
                </View>
                
                <View style={styles.timelineRight}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activitySubtitle}>— {activity.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState 
            title="No Activity" 
            message="No recent activity found on your account." 
            icon="history" 
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#ffffff', elevation: 2 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: 'bold', marginLeft: 8 },
  container: { padding: 16, paddingBottom: 100 },
  timeline: { marginTop: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 24 },
  timelineLeft: { width: 60, alignItems: 'flex-end', paddingTop: 2 },
  timeText: { ...typography.labelMd, color: colors.onSurface, fontWeight: 'bold' },
  dateText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 10 },
  timelineCenter: { width: 40, alignItems: 'center', paddingHorizontal: 8 },
  iconBox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.outlineVariant, marginTop: -4, marginBottom: -28, zIndex: 1 },
  timelineRight: { flex: 1, paddingTop: 2, paddingLeft: 8 },
  activityTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: 'bold', marginBottom: 2 },
  activitySubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant }
});
