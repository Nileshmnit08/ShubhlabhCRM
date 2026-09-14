import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { colors, typography, rounded } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { calculateDistanceKm, formatDistance } from '../utils/location';

export function NearbyScreen({ navigation }) {
  const { t } = useTranslation();
  const [activeRadius, setActiveRadius] = useState(1); // stored as km integer: 1, 2, 5
  
  const [locationStatus, setLocationStatus] = useState('locating'); // locating, success, denied, error
  const [myLocation, setMyLocation] = useState(null);
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLocationStatus('locating');
    try {
      // 1. Get GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setMyLocation(loc.coords);
      setLocationStatus('success');

      // 2. Fetch authenticated customers with coordinates
      const { data, error } = await supabase
        .from('crm_parties')
        .select('id, display_name, legal_or_core_name, latitude, longitude, location_accuracy')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // 3. Compute distance locally
      const withDistance = data.map(c => {
        const distKm = calculateDistanceKm(loc.coords.latitude, loc.coords.longitude, c.latitude, c.longitude);
        return { ...c, distanceKm: distKm };
      });
      
      // 4. Sort Closest First
      withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

      setCustomers(withDistance);
    } catch (err) {
      console.warn(err);
      setLocationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // 5. Filter by radius
  const filteredCustomers = customers.filter(c => c.distanceKm <= activeRadius);
  const totalVerified = customers.length; // total with coordinates

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerLogoText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerPageTitle}>{t('nearby.title')}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.syncBtn} onPress={fetchData}>
            <MaterialIcons name="sync" size={14} color="#005232" />
            <Text style={styles.syncText}>{t('nearby.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Offline / GPS Diagnostic Strip */}
        <View style={[styles.gpsStrip, locationStatus !== 'success' && { backgroundColor: '#663500' }]}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            {locationStatus === 'success' ? (
               <View style={styles.gpsPulse} />
            ) : locationStatus === 'locating' ? (
               <ActivityIndicator size="small" color="#a9f3c5" />
            ) : (
               <MaterialIcons name="error" size={16} color="#ffdad6" />
            )}
            <Text style={[styles.gpsText, locationStatus !== 'success' && { color: '#ffdad6' }]}>
              {locationStatus === 'success' ? `${t('nearby.gpsLive')}: ±${Math.round(myLocation?.accuracy || 0)}m` :
               locationStatus === 'locating' ? t('nearby.locating') :
               locationStatus === 'denied' ? t('nearby.permissionDenied') : t('nearby.locationUnavailable')}
            </Text>
          </View>
          {locationStatus === 'success' && (
            <View style={styles.gpsBadge}>
              <MaterialIcons name="satellite-alt" size={14} color="#0d5c3a" />
              <Text style={styles.gpsBadgeText}>{t('nearby.highAccuracy')}</Text>
            </View>
          )}
        </View>

        {/* Screen Context / Value Proposition */}
        <View style={styles.contextBox}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.contextTitle}>{t('nearby.title')} <Text style={{fontWeight: 'normal', fontSize: 15, color: colors.onSurfaceVariant}}>• {t('nearby.titleHi')}</Text></Text>
          </View>
          <Text style={styles.contextDesc}>{t('nearby.subtitle')}</Text>
        </View>

        {/* Radius Filter Chips */}
        {locationStatus === 'success' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll} style={{marginBottom: 12}}>
            {[1, 2, 5].map(radius => (
              <TouchableOpacity key={radius} style={activeRadius === radius ? styles.radiusActive : styles.radiusInactive} onPress={() => setActiveRadius(radius)}>
                <MaterialIcons name="near-me" size={18} color={activeRadius === radius ? colors.onPrimary : colors.onSurface} />
                <Text style={activeRadius === radius ? styles.radiusTextActive : styles.radiusTextInactive}>{'<'} {radius} km</Text>
                <View style={activeRadius === radius ? styles.radiusCountActive : styles.radiusCountInactive}>
                  <Text style={activeRadius === radius ? styles.radiusCountTextActive : styles.radiusCountTextInactive}>
                    {customers.filter(c => c.distanceKm <= radius).length}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Quick Sorting Strip */}
        <View style={styles.sortStrip}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1}}>
            <MaterialIcons name="sort" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.sortLabel}>{t('nearby.sortBy')}</Text>
            <Text style={styles.sortValue} numberOfLines={1}>{t('nearby.closestFirst')}</Text>
          </View>
        </View>

        {/* Radar Map (Visual) */}
        {locationStatus === 'success' && (
          <View style={styles.mapContainer}>
            <View style={styles.mapCanvas}>
              {/* Grid lines mocked */}
              <View style={[styles.mapLine, {top: '30%', width: '100%'}]} />
              <View style={[styles.mapLine, {left: '40%', height: '100%', width: 1}]} />
              {/* Center Pulse */}
              <View style={styles.mapCenter}>
                <View style={styles.mapPulseOuter} />
                <View style={styles.mapPulseInner} />
                <View style={styles.mapLabel}><Text style={styles.mapLabelText}>{t('nearby.youAreHere')}</Text></View>
              </View>
              {/* Dynamic Pins */}
              {filteredCustomers.slice(0, 5).map((c, idx) => {
                // Pseudo-random placement around center based on index for radar effect
                const angle = idx * (Math.PI * 2 / 5);
                const r = 30 + (c.distanceKm / activeRadius) * 50; 
                const top = 50 + Math.sin(angle) * r;
                const left = 50 + Math.cos(angle) * r;
                
                return (
                  <View key={c.id} style={[styles.pinWrapper, {top: `${top}%`, left: `${left}%`}]}>
                    <View style={styles.pinTag}>
                      <View style={[styles.pinDot, {backgroundColor: idx === 0 ? colors.primary : '#2f3a4d'}]}>
                        <Text style={styles.pinDotText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.pinTagText}>{formatDistance(c.distanceKm)}</Text>
                    </View>
                  </View>
                );
              })}
              
              <View style={styles.mapTopBadge}>
                <MaterialIcons name="radar" size={16} color={colors.primary} />
                <Text style={styles.mapTopBadgeText}>{t('nearby.radarCluster', { radius: `${activeRadius}km` })}</Text>
              </View>
              <View style={styles.mapRecenterBtn}>
                <MaterialIcons name="my-location" size={20} color={colors.primary} />
              </View>
            </View>
            <View style={styles.mapBottomStrip}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialIcons name="verified" size={18} color={colors.primary} />
                <Text style={styles.mapBottomText}>{t('nearby.verifiedCustomers', { radius: `${activeRadius}km` }).replace('{{radius}}', `${activeRadius}km`)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Text style={styles.sectionTitle}>{t('nearby.nearestOpportunities')}</Text>
            <View style={styles.sectionActiveBadge}><Text style={styles.sectionActiveText}>{filteredCustomers.length}</Text></View>
          </View>
          <Text style={styles.sectionSub}>{t('nearby.tapToStart')}</Text>
        </View>

        {/* Dynamic Customer Cards */}
        {loading ? (
           <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer, idx) => (
            <View key={customer.id} style={styles.card}>
              <View style={[styles.cardBorder, {backgroundColor: idx === 0 ? colors.primary : '#fe932c'}]} />
              <View style={styles.cardTop}>
                <View style={{flex: 1, paddingRight: 8}}>
                  <Text style={styles.cardTitle}>{customer.display_name}</Text>
                  <Text style={styles.cardDesc}>{customer.legal_or_core_name || ''}</Text>
                </View>
                <View style={idx === 0 ? styles.distBadge : [styles.distBadge, {backgroundColor: '#dce9ff'}]}>
                  <MaterialIcons name="directions-walk" size={16} color={idx === 0 ? "#002111" : colors.onSurface} />
                  <Text style={idx === 0 ? styles.distBadgeText : [styles.distBadgeText, {color: colors.onSurface}]}>{formatDistance(customer.distanceKm)}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('CustomerProfile', { id: customer.id, customerName: customer.display_name })}>
                  <MaterialIcons name="play-circle" size={22} color={colors.onPrimary} />
                  <Text style={styles.actionBtnPrimaryText}>{t('nearby.startVisit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
           <View style={{alignItems: 'center', padding: 20}}>
             <MaterialIcons name="location-off" size={48} color={colors.onSurfaceVariant} style={{marginBottom: 10}} />
             <Text style={{...typography.bodyMd, color: colors.onSurfaceVariant}}>{locationStatus !== 'success' ? t('nearby.enableLocation') : t('nearby.noCustomersFound')}</Text>
           </View>
        )}

      </ScrollView>

      {/* Floating Add Customer */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCustomer')}>
          <MaterialIcons name="person-add" size={24} color="#663500" />
          <Text style={styles.fabTitle}>{t('nearby.fabTitle')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, backgroundColor: 'rgba(248, 249, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'col' },
  headerLogoText: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 8, height: 32, borderRadius: 16, gap: 4 },
  syncText: { ...typography.labelSm, color: '#005232' },
  container: { padding: 16, paddingBottom: 100 },
  gpsStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 12, elevation: 1 },
  gpsPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#a9f3c5' },
  gpsText: { ...typography.labelSm, color: colors.onPrimary },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d5c3a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4 },
  gpsBadgeText: { ...typography.labelSm, color: '#8ad2a7' },
  contextBox: { marginBottom: 12 },
  contextTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  contextDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  radiusScroll: { gap: 8, paddingBottom: 8 },
  radiusActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, height: 36, borderRadius: 18, gap: 6, elevation: 1 },
  radiusInactive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dce9ff', paddingHorizontal: 14, height: 36, borderRadius: 18, gap: 6 },
  radiusTextActive: { ...typography.labelMd, color: colors.onPrimary },
  radiusTextInactive: { ...typography.labelMd, color: colors.onSurface },
  radiusCountActive: { backgroundColor: '#0d5c3a', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  radiusCountInactive: { backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  radiusCountTextActive: { fontSize: 11, fontWeight: 'bold', color: '#8ad2a7' },
  radiusCountTextInactive: { fontSize: 11, fontWeight: 'bold', color: colors.onSurfaceVariant },
  sortStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  sortLabel: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurface, textTransform: 'uppercase' },
  sortValue: { ...typography.labelSm, fontWeight: 'bold', color: colors.primary, flex: 1 },
  mapContainer: { backgroundColor: '#e5eeff', borderRadius: 16, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  mapCanvas: { height: 176, backgroundColor: '#dce9ff', position: 'relative' },
  mapLine: { position: 'absolute', backgroundColor: '#cbdbf5' },
  mapCenter: { position: 'absolute', top: '50%', left: '50%', width: 32, height: 32, marginLeft: -16, marginTop: -16, alignItems: 'center', justifyContent: 'center' },
  mapPulseOuter: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,67,40,0.25)' },
  mapPulseInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#ffffff' },
  mapLabel: { position: 'absolute', top: 32, backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, elevation: 1 },
  mapLabelText: { fontSize: 10, color: colors.onPrimary },
  pinWrapper: { position: 'absolute', marginLeft: -12, marginTop: -12 },
  pinTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 2, paddingRight: 6, borderRadius: 12, elevation: 2, gap: 4 },
  pinDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pinDotText: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  pinTagText: { fontSize: 11, fontWeight: 'bold', color: colors.onSurface },
  mapTopBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapTopBadgeText: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurface },
  mapRecenterBtn: { position: 'absolute', bottom: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  mapBottomStrip: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapBottomText: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurface },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface },
  sectionActiveBadge: { backgroundColor: '#a9f3c5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sectionActiveText: { fontSize: 11, fontWeight: 'bold', color: '#002111' },
  sectionSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, elevation: 2, marginBottom: 12, paddingLeft: 20 },
  cardBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  cardDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  distBadgeText: { ...typography.labelMd, fontWeight: 'bold', color: '#002111' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtnPrimary: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  actionBtnPrimaryText: { ...typography.labelLg, color: colors.onPrimary, letterSpacing: 0.5 },
  fabContainer: { position: 'absolute', bottom: 20, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fe932c', paddingHorizontal: 20, height: 56, borderRadius: 28, gap: 8, elevation: 4, borderWidth: 2, borderColor: '#ffffff' },
  fabTitle: { ...typography.labelLg, fontWeight: 'bold', color: '#663500' },
});
