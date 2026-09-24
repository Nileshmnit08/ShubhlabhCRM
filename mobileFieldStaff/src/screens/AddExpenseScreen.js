import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';
import { SyncService } from '../services/SyncService';
import { useAuth } from '../context/AuthContext';
import * as Location from 'expo-location';

const CATEGORIES = ['TRAVEL', 'FUEL', 'TOLL', 'PARKING', 'FOOD', 'LOCAL_TRANSPORT', 'LODGING', 'OTHER'];

export function AddExpenseScreen({ navigation }) {
  const { session } = useAuth();
  const [category, setCategory] = useState('TRAVEL');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (submit = false) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      let lat = null;
      let lon = null;
      let acc = null;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        acc = loc.coords.accuracy;
      } catch (e) {
        console.warn('Could not fetch location for expense', e);
      }

      const expense = {
        staff_id: session.user.id,
        expense_date: new Date().toISOString().split('T')[0],
        expense_time: new Date().toISOString().split('T')[1].split('.')[0],
        category,
        amount: parseFloat(amount).toFixed(2), // Strict Decimal format
        currency: 'INR',
        description,
        latitude: lat,
        longitude: lon,
        location_accuracy_m: acc,
        status: submit ? 'SUBMITTED' : 'DRAFT',
      };

      await SyncService.enqueueOperation('field_expenses', expense, session.user.id, 'insert');
      Alert.alert('Success', `Expense ${submit ? 'submitted' : 'saved as draft'}.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Expense</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryWrap}>
          {CATEGORIES.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.catBtn, category === c && styles.catBtnActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput 
          style={styles.input}
          keyboardType="numeric"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="What was this expense for?"
          value={description}
          onChangeText={setDescription}
        />
        
        {/* Further fields (Visit, Session, Receipt) can be added as needed based on FM-06 guidelines */}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.draftBtn} onPress={() => handleSave(false)} disabled={isSubmitting}>
          <Text style={styles.draftBtnText}>SAVE DRAFT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitBtn} onPress={() => handleSave(true)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>SUBMIT</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', marginLeft: 8 },
  form: { padding: 16 },
  label: { ...typography.labelLg, fontWeight: 'bold', marginBottom: 8, marginTop: 16, color: colors.onSurfaceVariant },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  catBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { ...typography.labelMd, color: colors.onSurface },
  catTextActive: { color: colors.onPrimary, fontWeight: 'bold' },
  input: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: rounded.md, padding: 12, ...typography.bodyLg },
  textArea: { height: 100, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  draftBtn: { flex: 1, height: 50, borderRadius: rounded.full, borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  draftBtnText: { ...typography.labelLg, color: colors.primary, fontWeight: 'bold' },
  submitBtn: { flex: 1, height: 50, borderRadius: rounded.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' }
});
