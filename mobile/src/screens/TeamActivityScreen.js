import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Users } from 'lucide-react-native';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TeamActivityScreen() {
  const insets = useSafeAreaInsets();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, display_name, role, is_active')
          .neq('role', 'Admin')
          .order('display_name', { ascending: true });
        
        if (data) setStaff(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Activity</Text>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Users color={theme.colors.primary} size={20} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  <Text style={styles.role}>{item.role}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.is_active ? theme.colors.primaryContainer : theme.colors.surfaceVariant }]}>
                  <Text style={[styles.badgeText, { color: item.is_active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No field staff found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.onSurface, fontFamily: theme.typography.fontFamily.display },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 12 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface },
  role: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 20 },
});
