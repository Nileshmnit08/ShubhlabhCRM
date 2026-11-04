// Settings → Contractor (LH-CONTRACTOR-SELECT-SAVE-VERIFY-06, LH-CONTRACTOR-SELECT-OPEN-07).
// Lists the active contractors from the database (all of them for approved LabourHisaab
// operators, proposal 254; only the account's memberships on a server without 254), shows the
// one this phone works for now, and lets the operator choose or change it (with confirmation).
// The DATABASE authorises the choice; the phone never grants itself Owner/Admin access.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Users, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import theme from '../constants/theme';
import { useLabourHisaab } from '../context/LabourHisaabContext';

const ROLE_LABEL = { Owner: 'मालिक (Owner)', Manager: 'मैनेजर (Manager)', Operator: 'ऑपरेटर (Operator)', Viewer: 'केवल देखें (Viewer)' };

export default function ContractorSelectCard() {
  const { cloudUser, isCloudConfigured, contractorState, loadContractors, selectContractor, syncStatus, activeContractorId } = useLabourHisaab();
  const { status, memberships, error, mode } = contractorState;

  useEffect(() => { if (cloudUser && status === 'idle') loadContractors(); }, [cloudUser, status]);

  const active = memberships.find(m => m.contractor_id === activeContractorId) || null;
  const selectable = (m) => !m.removed && (mode === 'open' || Boolean(m.role));

  const choose = (m) => {
    if (m.contractor_id === activeContractorId) return;
    if (!selectable(m)) {
      Alert.alert('ठेकेदार नहीं चुना जा सकता', m.removed ? 'इस ठेकेदार से आपकी पहुँच मालिक/व्यवस्थापक ने हटा दी है।' : 'यह खाता इस ठेकेदार से जुड़ा नहीं है।');
      return;
    }
    Alert.alert(
      'ठेकेदार चुनें?',
      `अब से नई प्रविष्टियाँ "${m.name}" के लिए सहेजी जाएँगी।${active ? `\n"${active.name}" की प्रविष्टियाँ उसी ठेकेदार में सुरक्षित रहेंगी।` : ''}`,
      [
        { text: 'रद्द करें', style: 'cancel' },
        {
          text: 'हाँ, चुनें',
          onPress: async () => {
            try {
              await selectContractor(m);
              Alert.alert('ठेकेदार चुना गया', `"${m.name}" चुना गया और सिंक शुरू हुआ।`);
            } catch (e) {
              Alert.alert('ठेकेदार नहीं बदला', e?.message || String(e));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Users size={18} color={theme.colors.primary} />
        <Text style={styles.title}>ठेकेदार (Contractor)</Text>
        {cloudUser ? (
          <TouchableOpacity onPress={() => loadContractors()} style={styles.reload} accessibilityLabel="ठेकेदार सूची ताज़ा करें">
            <RefreshCw size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!isCloudConfigured || !cloudUser ? (
        <Text style={styles.note}>ठेकेदार चुनने के लिए ऊपर "क्लाउड सिंक" में साइन इन करें।</Text>
      ) : status === 'loading' || status === 'idle' ? (
        <View style={styles.row}><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.note}>ठेकेदार सूची लोड हो रही है...</Text></View>
      ) : status === 'error' ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>ठेकेदार सूची लोड नहीं हुई</Text>
          <Text style={styles.note}>{error}</Text>
        </View>
      ) : status === 'empty' ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>{mode === 'open' ? 'डेटाबेस में कोई सक्रिय ठेकेदार नहीं है।' : `इस खाते (${cloudUser.email}) को अभी किसी ठेकेदार से नहीं जोड़ा गया है।`}</Text>
          <Text style={styles.note}>Shubh Labh CRM व्यवस्थापक से संपर्क करें। तब तक प्रविष्टियाँ केवल इस फ़ोन पर रहेंगी।</Text>
        </View>
      ) : (
        <>
          <View style={[styles.current, !active && { borderColor: theme.colors.warning }]}>
            <Text style={styles.currentLabel}>अभी का ठेकेदार (Working for)</Text>
            <Text style={styles.currentName}>{active ? active.name : 'कोई नहीं — नीचे से चुनें'}</Text>
            {active?.business_name ? <Text style={styles.note}>{active.business_name}</Text> : null}
            {active?.role ? <Text style={styles.note}>भूमिका: {ROLE_LABEL[active.role] || active.role}</Text> : null}
            {error ? <Text style={[styles.note, { color: theme.colors.danger }]}>{error}</Text> : null}
            {active?.role === 'Viewer' ? <Text style={[styles.note, { color: theme.colors.warning }]}>Viewer भूमिका से काम सहेजा नहीं जा सकता।</Text> : null}
          </View>
          {memberships.map(m => {
            const isOn = m.contractor_id === activeContractorId;
            return (
              <TouchableOpacity key={m.contractor_id} style={[styles.option, isOn && styles.optionOn, !selectable(m) && { opacity: 0.5 }]} onPress={() => choose(m)} disabled={isOn}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{m.name}</Text>
                  <Text style={styles.note}>
                    {[m.business_name, m.removed ? 'पहुँच हटाई गई' : m.role ? ROLE_LABEL[m.role] || m.role : 'चुनने पर ऑपरेटर के रूप में जुड़ेंगे'].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {isOn ? <CheckCircle2 size={18} color={theme.colors.success} /> : <Text style={styles.chooseText}>चुनें</Text>}
              </TouchableOpacity>
            );
          })}
          {mode === 'members' ? <Text style={styles.note}>सूची में केवल वे ठेकेदार हैं जिनसे यह खाता जुड़ा है।</Text> : null}
          {syncStatus.lastError ? <Text style={[styles.note, { color: theme.colors.danger }]}>सिंक: {syncStatus.lastError}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, marginBottom: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { flex: 1, fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary },
  reload: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  warnBox: { backgroundColor: theme.colors.warningLight, borderRadius: theme.borderRadius.md, padding: 10 },
  warnText: { fontSize: 12, fontWeight: '800', color: theme.colors.warning },
  current: { borderWidth: 1, borderColor: theme.colors.success, borderRadius: theme.borderRadius.md, padding: 10, marginBottom: 8 },
  currentLabel: { fontSize: 11, color: theme.colors.textSecondary },
  currentName: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 2 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surfaceVariant, marginBottom: 6 },
  optionOn: { backgroundColor: theme.colors.successLight },
  optionName: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  chooseText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
});
