import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

export function AddCustomerScreen({ navigation }) {
  const [category, setCategory] = useState('retailer');
  const [tags, setTags] = useState({ fertiliser: true, seeds: true, pesticides: false, micro: false });

  const toggleTag = (key) => setTags(prev => ({ ...prev, [key]: !prev[key] }));

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
            <Text style={styles.headerPageTitle}>Customer Detail</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.syncBtn}>
            <View style={styles.syncPulse} />
            <Text style={styles.syncText}>Synced</Text>
          </TouchableOpacity>
          <View style={styles.userIcon}><MaterialIcons name="person" size={18} color={colors.onPrimary} /></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Interactive Top Tray Card */}
        <View style={styles.sheetCard}>
          {/* 1. Sheet Header & Beat Context */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={{flex: 1, paddingRight: 8}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text style={styles.sheetTitle}>Quick Add Customer</Text>
                  <View style={styles.timeTag}><Text style={styles.timeTagText}>30s FLOW</Text></View>
                </View>
                <Text style={styles.sheetSub}>नया ग्राहक जोड़ें • Beat: <Text style={{color: colors.onSurface, fontWeight: '600'}}>Indore Krishi Mandi Sec 4</Text></Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Dominant GPS Auto-Location Lock Banner */}
          <View style={styles.gpsBanner}>
            <View style={styles.gpsTop}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialIcons name="verified" size={20} color="#a9f3c5" />
                <Text style={styles.gpsLockText}>GPS LOCKED • ±3M ACCURACY</Text>
              </View>
              <TouchableOpacity style={styles.gpsUpdateBtn}>
                <MaterialIcons name="sync" size={15} color={colors.primary} />
                <Text style={styles.gpsUpdateText}>Update GPS</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.gpsAddress}>Shop 18, Mandi Gate 3, Loha Bazar, Indore</Text>
            <View style={styles.gpsBottom}>
              <Text style={styles.gpsCoords}>Lat 22.7198° N, 75.8580° E</Text>
              <Text style={styles.gpsHi}>वर्तमान स्थान सत्यापित</Text>
            </View>
          </View>

          {/* 3. Voice-Assisted Rapid Intake Strip */}
          <View style={styles.voiceStrip}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
              <View style={styles.micBox}>
                <MaterialIcons name="mic" size={22} color="#663500" />
                <View style={styles.micPulse} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.voiceTitle}>बोलकर भरें (Speak to Auto-Fill)</Text>
                <Text style={styles.voiceHint} numberOfLines={1}>"Sharma Krishi, रमेश शर्मा, 98261XXXXX..."</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.tapSpeakBtn}><Text style={styles.tapSpeakText}>Tap & Speak</Text></TouchableOpacity>
          </View>

          {/* 4. Essential Quick-Intake Form Fields */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Shop / Business Name <Text style={styles.labelHi}>(दुकान / व्यापार का नाम)</Text></Text>
              <Text style={styles.requiredTag}>REQUIRED</Text>
            </View>
            <View style={styles.inputWrap}>
              <MaterialIcons name="storefront" size={22} color={colors.onSurfaceVariant} style={styles.inputIconL} />
              <TextInput style={styles.input} value="Sharma Krishi Seva Kendra" />
              <MaterialIcons name="check-circle" size={20} color={colors.primary} style={styles.inputIconR} />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Owner / Contact Person <Text style={styles.labelHi}>(मालिक का नाम)</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="person" size={22} color={colors.onSurfaceVariant} style={styles.inputIconL} />
              <TextInput style={styles.input} value="Ramesh Sharma (रमेश शर्मा)" />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Primary Mobile Number <Text style={styles.labelHi}>(मोबाइल नंबर)</Text></Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="phone-android" size={22} color={colors.onSurfaceVariant} style={styles.inputIconL} />
              <TextInput style={[styles.input, styles.inputBig]} value="+91 98261 44890" keyboardType="phone-pad" />
              <View style={styles.waTag}>
                <MaterialIcons name="chat" size={16} color="#005232" />
                <Text style={styles.waTagText}>WA Active</Text>
              </View>
            </View>
          </View>

          {/* Customer Category Segmented Fast-Select */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category / श्रेणी <Text style={styles.labelHi}>(One-tap select)</Text></Text>
            <View style={styles.catGrid}>
              <TouchableOpacity style={category === 'retailer' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setCategory('retailer')}>
                <View>
                  <Text style={category === 'retailer' ? styles.catTitleActive : styles.catTitleInactive}>Retailer</Text>
                  <Text style={category === 'retailer' ? styles.catSubActive : styles.catSubInactive}>खुदरा विक्रेता</Text>
                </View>
                {category === 'retailer' ? <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} /> : <View style={styles.catEmptyDot} />}
              </TouchableOpacity>
              
              <TouchableOpacity style={category === 'wholesaler' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setCategory('wholesaler')}>
                <View>
                  <Text style={category === 'wholesaler' ? styles.catTitleActive : styles.catTitleInactive}>Wholesaler</Text>
                  <Text style={category === 'wholesaler' ? styles.catSubActive : styles.catSubInactive}>थोक विक्रेता</Text>
                </View>
                {category === 'wholesaler' ? <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} /> : <View style={styles.catEmptyDot} />}
              </TouchableOpacity>

              <TouchableOpacity style={category === 'grower' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setCategory('grower')}>
                <View>
                  <Text style={category === 'grower' ? styles.catTitleActive : styles.catTitleInactive}>Large Grower</Text>
                  <Text style={category === 'grower' ? styles.catSubActive : styles.catSubInactive}>बड़ा किसान</Text>
                </View>
                {category === 'grower' ? <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} /> : <View style={styles.catEmptyDot} />}
              </TouchableOpacity>

              <TouchableOpacity style={category === 'distributor' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setCategory('distributor')}>
                <View>
                  <Text style={category === 'distributor' ? styles.catTitleActive : styles.catTitleInactive}>Distributor</Text>
                  <Text style={category === 'distributor' ? styles.catSubActive : styles.catSubInactive}>वितरक</Text>
                </View>
                {category === 'distributor' ? <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} /> : <View style={styles.catEmptyDot} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Shopfront Verification Photo Tile */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Shopfront Geotag Photo <Text style={styles.labelHi}>(वैकल्पिक दुकान फोटो)</Text></Text>
              <Text style={styles.requiredTag}>GEOTAGGED</Text>
            </View>
            <View style={styles.photoGrid}>
              <View style={styles.photoBox}>
                <Image source={{uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsPxG-1aZYPgJxg7aK7nrSC-8mn4jO5GvBjm2IFfAM9RQ9wsEnZ39zeMmxle7mQXpGz93J-kVQnovts933nx1sg8iOJhi0njNsO2ahwuGqxrAp1UpMvR7QS-si4eZ-EhhFeHuGHWOQE9B7HKPriLO6f2OyZegux_gmOOthWT_mEmRPwnYQFyNMAK_fOGA8y3uau7IIrR2zJAQqcwklWHv_3GfRVO6qVvZ8qhubDpvRVOEbyMpUUJOV'}} style={{width: '100%', height: '100%', resizeMode: 'cover'}} />
                <View style={styles.photoGpsTag}><Text style={styles.photoGpsText}>11:42 AM • GPS Tagged</Text></View>
                <TouchableOpacity style={styles.photoCloseBtn}><MaterialIcons name="close" size={13} color={colors.onError} /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.addPhotoBtn}>
                <View style={styles.addPhotoIcon}><MaterialIcons name="add-a-photo" size={20} color="#002111" /></View>
                <Text style={styles.addPhotoTitle}>Snap GST / Signboard</Text>
                <Text style={styles.addPhotoSub}>अतिरिक्त फोटो जोड़ें</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6. Smart Interest Tags / Quick Tags */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Primary Product Demand <Text style={styles.labelHi}>(मुख्य मांग)</Text></Text>
            <View style={styles.tagWrap}>
              <TouchableOpacity style={tags.fertiliser ? styles.tagBtnActive : styles.tagBtnInactive} onPress={() => toggleTag('fertiliser')}>
                <MaterialIcons name={tags.fertiliser ? "check" : "add"} size={16} color={tags.fertiliser ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={tags.fertiliser ? styles.tagTextActive : styles.tagTextInactive}>Fertiliser (उर्वरक)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tags.seeds ? styles.tagBtnActive : styles.tagBtnInactive} onPress={() => toggleTag('seeds')}>
                <MaterialIcons name={tags.seeds ? "check" : "add"} size={16} color={tags.seeds ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={tags.seeds ? styles.tagTextActive : styles.tagTextInactive}>Seeds (बीज)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tags.pesticides ? styles.tagBtnActive : styles.tagBtnInactive} onPress={() => toggleTag('pesticides')}>
                <MaterialIcons name={tags.pesticides ? "check" : "add"} size={16} color={tags.pesticides ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={tags.pesticides ? styles.tagTextActive : styles.tagTextInactive}>Pesticides (कीटनाशक)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tags.micro ? styles.tagBtnActive : styles.tagBtnInactive} onPress={() => toggleTag('micro')}>
                <MaterialIcons name={tags.micro ? "check" : "add"} size={16} color={tags.micro ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={tags.micro ? styles.tagTextActive : styles.tagTextInactive}>Micro-nutrients</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 7. Sticky Fast-Action Primary Button Container */}
          <View style={styles.actionBlock}>
            <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="how-to-reg" size={24} color={colors.onPrimary} />
              <View>
                <Text style={styles.saveBtnTitle}>SAVE CUSTOMER & OPEN PROFILE</Text>
                <Text style={styles.saveBtnSub}>ग्राहक सुरक्षित करें एवं ऑर्डर शुरू करें</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.offlineGuar}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineGuarText}>Instant offline save • Syncs automatically when back online</Text>
            </View>
          </View>

        </View>
      </ScrollView>
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
  syncPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  syncText: { ...typography.labelSm, color: '#005232' },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  container: { padding: 16, paddingBottom: 40 },
  sheetCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  sheetHeader: { alignItems: 'center', marginBottom: 16 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(191,201,192,0.6)', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' },
  sheetTitle: { ...typography.headlineMd, color: colors.onSurface, letterSpacing: -0.5 },
  timeTag: { backgroundColor: '#a9f3c5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  timeTagText: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  sheetSub: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '500', marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },

  gpsBanner: { backgroundColor: '#0d5c3a', borderRadius: 12, padding: 8, marginBottom: 16, elevation: 1 },
  gpsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gpsLockText: { fontSize: 11, color: '#a9f3c5', letterSpacing: 0.5 },
  gpsUpdateBtn: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 1 },
  gpsUpdateText: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  gpsAddress: { ...typography.labelLg, fontWeight: '600', color: '#ffffff', marginBottom: 2 },
  gpsBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsCoords: { fontSize: 12, color: '#8ad2a7' },
  gpsHi: { fontSize: 11, color: '#8ad2a7', opacity: 0.9 },

  voiceStrip: { backgroundColor: '#eff4ff', borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  micBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fe932c', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  micPulse: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#904d00' },
  voiceTitle: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  voiceHint: { fontSize: 12, color: colors.onSurfaceVariant },
  tapSpeakBtn: { backgroundColor: '#ffdcc3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  tapSpeakText: { fontSize: 11, fontWeight: 'bold', color: '#904d00' },

  formGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { ...typography.labelMd, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  labelHi: { fontSize: 12, fontWeight: 'normal', color: colors.onSurfaceVariant },
  requiredTag: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  inputWrap: { position: 'relative', width: '100%' },
  inputIconL: { position: 'absolute', left: 14, top: 16, zIndex: 1 },
  inputIconR: { position: 'absolute', right: 14, top: 18, zIndex: 1 },
  input: { height: 56, backgroundColor: '#eff4ff', borderRadius: 12, paddingLeft: 44, paddingRight: 40, fontSize: 15, fontWeight: '600', color: colors.onSurface },
  inputBig: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  waTag: { position: 'absolute', right: 8, top: 12, height: 32, paddingHorizontal: 8, borderRadius: 16, backgroundColor: '#a9f3c5', flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 1 },
  waTagText: { fontSize: 11, fontWeight: 'bold', color: '#005232' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtnActive: { width: '48.5%', height: 52, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  catBtnInactive: { width: '48.5%', height: 52, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#eff4ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catTitleActive: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
  catSubActive: { fontSize: 11, color: '#8ed6aa' },
  catTitleInactive: { ...typography.labelLg, fontWeight: '600', color: colors.onSurface },
  catSubInactive: { fontSize: 11, color: colors.onSurfaceVariant },
  catEmptyDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(191,201,192,0.4)' },

  photoGrid: { flexDirection: 'row', gap: 8 },
  photoBox: { width: '32%', height: 96, borderRadius: 12, backgroundColor: '#e5eeff', overflow: 'hidden', elevation: 1 },
  photoGpsTag: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(33,49,69,0.8)', paddingVertical: 2, alignItems: 'center' },
  photoGpsText: { fontSize: 10, color: '#eaf1ff' },
  photoCloseBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  addPhotoBtn: { flex: 1, height: 96, borderRadius: 12, backgroundColor: '#eff4ff', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#a9f3c5', alignItems: 'center', justifyContent: 'center' },
  addPhotoTitle: { ...typography.labelMd, fontWeight: '600', color: colors.onSurface },
  addPhotoSub: { fontSize: 11, color: colors.onSurfaceVariant },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagBtnActive: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 1 },
  tagBtnInactive: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eff4ff', flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagTextActive: { ...typography.labelMd, fontWeight: '600', color: colors.onPrimary },
  tagTextInactive: { ...typography.labelMd, fontWeight: '500', color: colors.onSurface },

  actionBlock: { paddingTop: 8, gap: 8 },
  saveBtn: { width: '100%', height: 56, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 4 },
  saveBtnTitle: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
  saveBtnSub: { fontSize: 11, color: '#8ed6aa' },
  offlineGuar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  offlineGuarText: { fontSize: 12, color: colors.onSurfaceVariant },
});
