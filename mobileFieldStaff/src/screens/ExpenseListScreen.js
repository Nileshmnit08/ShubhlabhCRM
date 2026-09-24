import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';
import { EmptyState } from '../components';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export function ExpenseListScreen({ navigation }) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('field_expenses')
        .select('*')
        .eq('staff_id', session?.user?.id)
        .order('expense_date', { ascending: false });
        
      if (!error && data) {
        setExpenses(data);
      }
    } catch (e) {
      console.warn("Failed to fetch expenses", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [session])
  );

  const renderItem = ({ item }) => {
    let statusColor = colors.onSurfaceVariant;
    if (item.status === 'APPROVED') statusColor = '#2e7d32'; // green
    if (item.status === 'REJECTED') statusColor = '#d32f2f'; // red
    if (item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW') statusColor = '#ed6c02'; // orange

    return (
      <TouchableOpacity style={styles.card} onPress={() => {}}>
        <View style={styles.cardTop}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.amount}>₹{item.amount}</Text>
        </View>
        <Text style={styles.date}>{item.expense_date}</Text>
        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Expenses</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="No Expenses" message="You haven't recorded any expenses yet." icon="receipt" />
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AddExpense')}
      >
        <MaterialIcons name="add" size={24} color={colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: colors.surfaceContainerLowest, elevation: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: colors.surfaceContainerLowest, padding: 16, borderRadius: rounded.lg, marginBottom: 16, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  category: { ...typography.labelLg, fontWeight: 'bold', color: colors.onSurface },
  amount: { ...typography.titleMd, fontWeight: 'bold', color: colors.primary },
  date: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: 8 },
  description: { ...typography.bodyMd, color: colors.onSurface, marginBottom: 12 },
  
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.labelSm, fontWeight: 'bold' },
  
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 }
});
