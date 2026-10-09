import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import { useTranslation } from '../../shared/localization/i18n';
import { X, Check } from 'lucide-react-native';

export default function WatchlistScreen() {
  const { t, language } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  
  const { watchlists = [], materials = [] } = route.params || {};
  
  const [selected, setSelected] = useState(new Set(watchlists));
  const [saving, setSaving] = useState(false);

  const toggleMaterial = (id) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  };

  const selectAll = () => {
    const allIds = materials.map(m => m.id);
    setSelected(new Set(allIds));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = session?.user?.id;
      if (!uid) throw new Error("Not logged in");

      // We replace the entire watchlist: delete existing then insert new
      // Because we enabled RLS on dealer_market_watchlists for this buyer, it is safe
      await supabase
        .from('dealer_market_watchlists')
        .delete()
        .eq('buyer_id', uid);

      if (selected.size > 0) {
        const inserts = Array.from(selected).map(mId => ({
          buyer_id: uid,
          raw_material_id: mId
        }));
        await supabase.from('dealer_market_watchlists').insert(inserts);
      }

      navigation.goBack();
    } catch (err) {
      console.error('Error saving watchlist:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.language') === 'Language' ? 'Edit Watchlist' : 'वॉचलिस्ट संपादित करें'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.actionText}>{t('profile.language') === 'Language' ? 'Select All' : 'सभी चुनें'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAll}>
          <Text style={styles.actionText}>{t('profile.language') === 'Language' ? 'Clear All' : 'सभी साफ़ करें'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {materials.map(m => (
          <TouchableOpacity 
            key={m.id} 
            style={styles.itemRow}
            onPress={() => toggleMaterial(m.id)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.itemName}>{language === 'hi' && m.name_hi ? m.name_hi : m.name_en}</Text>
              <Text style={styles.itemCat}>{m.category}</Text>
            </View>
            <Switch
              value={selected.has(m.id)}
              onValueChange={() => toggleMaterial(m.id)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Check size={20} color={theme.colors.white} style={{marginRight: 8}} />
              <Text style={styles.saveBtnText}>{t('profile.language') === 'Language' ? 'Save Preferences' : 'सुरक्षित करें'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h2,
  },
  closeBtn: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#FFF3E0',
  },
  actionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  scroll: {
    padding: theme.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemName: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  itemCat: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.white,
    fontWeight: '700',
  }
});
