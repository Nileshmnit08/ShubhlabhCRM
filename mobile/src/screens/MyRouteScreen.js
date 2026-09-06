import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Switch } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { Phone, Calendar, AlertCircle, MapPin, Navigation } from 'lucide-react-native';
import { startBackgroundLocation, stopBackgroundLocation } from '../services/BackgroundLocationService';
import { captureForegroundLocation } from '../services/LocationService';

export default function MyRouteScreen({ navigation }) {
  const { userProfile } = useAuth();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const fetchPriorities = async () => {
    if (!userProfile) return;
    
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const ownerId = userProfile.id;

      // Fetch pending follow-ups
      const { data: followUpsData } = await supabase
        .from('follow_ups')
        .select(`*, crm_parties(display_name, assigned_owner_id)`)
        .eq('status', 'Pending');
      
      const allAccessibleFu = (followUpsData || []).filter(
        f => f.crm_parties !== null && (f.assigned_to === ownerId || f.crm_parties.assigned_owner_id === ownerId)
      );

      // We focus on urgent ones (Overdue or Today)
      const urgentFu = allAccessibleFu.filter(t => t.follow_up_date <= todayStr || ['High', 'Urgent', 'Critical'].includes(t.priority));
      
      const unifiedList = urgentFu.map(t => ({
        ...t,
        _isOverdue: t.follow_up_date < todayStr,
        _isToday: t.follow_up_date === todayStr,
      }));

      // Sort: Overdue first, then today
      unifiedList.sort((a, b) => {
        if (a._isOverdue && !b._isOverdue) return -1;
        if (!a._isOverdue && b._isOverdue) return 1;
        if (a._isToday && !b._isToday) return -1;
        if (!a._isToday && b._isToday) return 1;
        return a.follow_up_date.localeCompare(b.follow_up_date);
      });

      setPriorities(unifiedList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, [userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPriorities();
  };

  const handleToggleTracking = async (value) => {
    if (value) {
      const success = await startBackgroundLocation();
      if (success) {
        setIsTracking(true);
      } else {
        alert("Permission denied. Could not start background tracking.");
        setIsTracking(false);
      }
    } else {
      await stopBackgroundLocation();
      setIsTracking(false);
    }
  };

  const handleCheckIn = async () => {
    alert("Capturing location...");
    const result = await captureForegroundLocation();
    if (result.success) {
      alert("Location check-in successful!");
    } else {
      alert("Check-in failed: " + result.error);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName} numberOfLines={1}>{item.crm_parties?.display_name}</Text>
          {item._isOverdue && <View style={[styles.badge, styles.badgeOverdue]}><Text style={styles.badgeText}>OVERDUE</Text></View>}
          {item._isToday && !item._isOverdue && <View style={[styles.badge, styles.badgeToday]}><Text style={styles.badgeText}>TODAY</Text></View>}
        </View>
        <Text style={styles.details}>{item.reason || item.follow_up_type}</Text>
        <Text style={styles.dateText}>
          <Calendar size={12} color="#94a3b8" /> {new Date(item.follow_up_date).toLocaleDateString()}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('LogFollowUp', { 
              followUpId: item.id, 
              partyId: item.party_id, 
              partyName: item.crm_parties?.display_name,
              currentReason: item.reason || item.follow_up_type
            })}
          >
            <Phone size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Log Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.trackingHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MapPin color={isTracking ? "#10b981" : "#64748b"} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.trackingText}>{isTracking ? "Shift Active (Tracking)" : "Shift Inactive"}</Text>
        </View>
        <Switch
          value={isTracking}
          onValueChange={handleToggleTracking}
          trackColor={{ false: '#334155', true: '#059669' }}
          thumbColor={isTracking ? '#10b981' : '#94a3b8'}
        />
      </View>
      <View style={styles.checkInRow}>
        <TouchableOpacity style={[styles.checkInButton, { flex: 1, marginRight: 8 }]} onPress={handleCheckIn}>
          <Navigation size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.checkInText}>Location Check-In</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.checkInButton, { flex: 1, backgroundColor: '#6366f1', marginRight: 8 }]} 
          onPress={() => navigation.navigate('CallHistory')}
        >
          <Phone size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.checkInText}>Call Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.checkInButton, { backgroundColor: '#334155', paddingHorizontal: 16 }]} 
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.checkInText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 20 }} />
      ) : priorities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle color="#64748b" size={48} />
          <Text style={styles.emptyText}>You're all caught up!</Text>
          <Text style={styles.emptySubtext}>No urgent tasks assigned for today.</Text>
        </View>
      ) : (
        <FlatList
          data={priorities}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  trackingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155', elevation: 2 },
  trackingText: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  checkInRow: { backgroundColor: '#1e293b', padding: 16, alignItems: 'center' },
  checkInButton: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '100%', justifyContent: 'center' },
  checkInText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#94a3b8', marginTop: 8 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeOverdue: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', borderWidth: 1 },
  badgeToday: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#f8fafc' },
  details: { color: '#cbd5e1', fontSize: 14, marginBottom: 8 },
  dateText: { color: '#94a3b8', fontSize: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
});
