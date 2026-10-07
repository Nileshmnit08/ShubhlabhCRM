import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { ChevronRight, MapPin, Globe, HeadphonesIcon, Users, Settings, LogOut, Lock, ClipboardList } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
  const { t, language, toggleLanguage } = useTranslation();
  const { userProfile, customerProfile, logout } = useAuth();
  
  const buyerName = userProfile?.display_name || customerProfile?.name || "Buyer Name";
  const shopName = customerProfile?.shop_name || "Shop Name";

  const menuItems = [
    { title: t('profile.language') === 'Language' ? 'My Orders' : 'मेरे ऑर्डर', icon: ClipboardList, onPress: () => navigation.navigate('OrdersStack', { screen: 'MyOrders' }) },
    { title: t('profile.deliveryAddresses'), icon: MapPin },
    { title: 'Business Updates', icon: Globe, onPress: () => navigation.navigate('BusinessUpdatesList') },
    { title: t('updates.title'), icon: Globe, onPress: () => navigation.navigate('UpdatesList') },
    { title: t('support.title'), icon: HeadphonesIcon, onPress: () => navigation.navigate('ComplaintCenter') },
    { title: t('profile.mySalesperson'), icon: Users, onPress: () => navigation.navigate('MySalesperson') },
    { title: t('profile.settings'), icon: Settings },
    { title: t('profile.changePassword'), icon: Lock },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={t('profile.title')} showBack={false} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{buyerName.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{buyerName}</Text>
            <Text style={styles.shop}>{shopName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.iconBox}><Globe size={24} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>{t('profile.language')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginRight: 8, color: theme.colors.textSecondary }}>
                {language === 'en' ? 'English' : 'हिंदी'}
              </Text>
              <Switch 
                value={language === 'hi'} 
                onValueChange={toggleLanguage}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
          </View>

          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={i} style={styles.row} onPress={item.onPress}>
                <View style={styles.iconBox}><Icon size={24} color={theme.colors.primary} /></View>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color={theme.colors.alert} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xl, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  avatarText: { ...theme.typography.h1, color: theme.colors.white },
  info: { flex: 1 },
  name: { ...theme.typography.h2 },
  shop: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary, marginTop: 4 },
  
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBox: { marginRight: theme.spacing.md },
  rowTitle: { ...theme.typography.bodyLarge, flex: 1 },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md, marginTop: theme.spacing.xl },
  logoutText: { ...theme.typography.bodyLarge, color: theme.colors.alert, fontWeight: 'bold' },
});
