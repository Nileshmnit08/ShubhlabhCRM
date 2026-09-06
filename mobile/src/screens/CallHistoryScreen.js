import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, PermissionsAndroid, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import CallLogs from 'react-native-call-log';
import { supabase } from '../lib/supabase';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PlusCircle } from 'lucide-react-native';

export default function CallHistoryScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    fetchCallLogs();
  }, []);

  const fetchCallLogs = async () => {
    setLoading(true);
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Permission',
          message: 'Shubh Labh CRM needs access to your call log to quickly log activities.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionGranted(true);
        const deviceLogs = await CallLogs.load(50);
        
        // Fetch known CRM parties to match numbers
        const { data: parties, error } = await supabase.from('crm_parties').select('id, display_name, mobile');
        if (error) {
          console.error('Failed to fetch CRM parties', error);
        }

        const enrichedLogs = deviceLogs.map(log => {
          // Naive matching: strip all non-digits from both sides and match the last 10 digits
          const cleanLogPhone = log.phoneNumber ? log.phoneNumber.replace(/[^0-9]/g, '').slice(-10) : '';
          
          let knownParty = null;
          if (parties && cleanLogPhone.length >= 10) {
            knownParty = parties.find(p => {
              if (!p.mobile) return false;
              const cleanPartyPhone = p.mobile.replace(/[^0-9]/g, '').slice(-10);
              return cleanPartyPhone === cleanLogPhone;
            });
          }
          
          return {
            ...log,
            crmParty: knownParty || null
          };
        });

        setLogs(enrichedLogs);
      } else {
        setPermissionGranted(false);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not read call logs.');
    } finally {
      setLoading(false);
    }
  };

  const getCallIcon = (type) => {
    switch (type) {
      case 'INCOMING': return <PhoneIncoming size={16} color="#10b981" />;
      case 'OUTGOING': return <PhoneOutgoing size={16} color="#3b82f6" />;
      case 'MISSED': return <PhoneMissed size={16} color="#ef4444" />;
      default: return <Phone size={16} color="#94a3b8" />;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const renderItem = ({ item }) => {
    const isKnown = !!item.crmParty;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            {getCallIcon(item.type)}
            <Text style={[styles.contactName, { marginLeft: 8 }]}>
              {isKnown ? item.crmParty.display_name : (item.name || item.phoneNumber)}
            </Text>
          </View>
          {isKnown ? (
            <View style={styles.badgeKnown}><Text style={styles.badgeKnownText}>KNOWN CRM</Text></View>
          ) : (
            <View style={styles.badgeUnknown}><Text style={styles.badgeUnknownText}>UNKNOWN</Text></View>
          )}
        </View>

        <Text style={styles.details}>
          Number: {item.phoneNumber}  •  Duration: {formatDuration(item.duration)}
        </Text>
        <Text style={styles.dateText}>
          {new Date(parseInt(item.timestamp)).toLocaleString()}
        </Text>

        {isKnown && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddActivity', { 
                partyId: item.crmParty.id, 
                partyName: item.crmParty.display_name 
              })}
            >
              <PlusCircle size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Log Call as Activity</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 20 }} />
      ) : !permissionGranted ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Permission Denied</Text>
          <Text style={styles.emptySubtext}>We need permission to display your call history.</Text>
          <TouchableOpacity style={[styles.actionButton, { marginTop: 16 }]} onPress={fetchCallLogs}>
            <Text style={styles.actionButtonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recent calls found.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => item.timestamp?.toString() + index}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
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
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  badgeKnown: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderColor: '#10b981', borderWidth: 1 },
  badgeKnownText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  badgeUnknown: { backgroundColor: 'rgba(100, 116, 139, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderColor: '#64748b', borderWidth: 1 },
  badgeUnknownText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  details: { color: '#cbd5e1', fontSize: 14, marginBottom: 8 },
  dateText: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12 },
  actionButton: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
});
