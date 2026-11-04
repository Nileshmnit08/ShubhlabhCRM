// Settings → Contractor (LH-CONTRACTOR-SELECT-SAVE-VERIFY-06).
// Lists the REAL contractors this signed-in account is an active member of (from the database),
// shows which one this phone saves work for, and lets the operator choose (with confirmation).
// It cannot create memberships: an unlinked account is told exactly who must add it.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Users, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import theme from '../constants/theme';
import { useLabourHisaab } from '../context/LabourHisaabContext';

const ROLE_LABEL = { Owner: 'मालिक (Owner)', Manager: 'मैनेजर (Manager)', Operator: 'ऑपरेटर (Operator)', Viewer: 'केवल देखें (Viewer)' };

export default function ContractorSelectCard() {
  const { cloudUser, isCloudConfigured, contractorState, loadContractors, selectContractor, syncStatus } = useLabourHisaab();
  const { status, memberships, selectedId, selectedName, error } = contractorState;

  useEffect(() => { if (cloudUser && status === 'idle') loadContractors(); }, [cloudUser, status]);

  // What this phone uses: the explicit choice, else the only membership.
  const effective = selectedId
    ? memberships.find(m => m.contractor_id === selectedId) || null
    : memberships.length === 1 ? memberships[0] : null;

  const choose = (m) => {
    if (m.contractor_id === selectedId) return;
    Alert.alert(
      'ठेकेदार चुनें?',
      `इस फ़ोन की नई प्रविष्टियाँ "${m.name}" के लिए डेटाबेस में सहेजी जाएँगी (${ROLE_LABEL[m.role] || m.role}).`,
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
        <Text style={[styles.note, { color: theme.colors.danger }]}>ठेकेदार सूची लोड नहीं हुई: {error}</Text>
      ) : status === 'empty' ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>इस खाते ({cloudUser.email}) को अभी किसी ठेकेदार से नहीं जोड़ा गया है।</Text>
          <Text style={styles.note}>ठेकेदार के मालिक (Owner) या Shubh Labh CRM व्यवस्थापक से कहें कि वे आपका यही ईमेल ठेकेदार में ऑपरेटर के रूप में जोड़ें। जुड़ने के बाद ऊपर ताज़ा करें।</Text>
          <Text style={styles.note}>तब तक प्रविष्टियाँ केवल इस फ़ोन पर रहेंगी — डेटाबेस/CRM में नहीं जाएँगी।</Text>
        </View>
      ) : (
        <>
          <View style={[styles.current, !effective && { borderColor: theme.colors.warning }]}>
            <Text style={styles.currentLabel}>चुना गया ठेकेदार (Selected)</Text>
            <Text style={styles.currentName}>
              {effective ? effective.name : selectedName ? `${selectedName} (अब जुड़ा नहीं)` : 'कोई नहीं — नीचे से चुनें'}
            </Text>
            {effective ? (
              <Text style={styles.note}>
                भूमिका: {ROLE_LABEL[effective.role] || effective.role}
                {!selectedId ? ' · इकलौता जुड़ा हुआ ठेकेदार, अपने-आप उपयोग' : ''}
              </Text>
            ) : null}
            {error ? <Text style={[styles.note, { color: theme.colors.danger }]}>{error}</Text> : null}
            {effective && effective.role === 'Viewer' ? (
              <Text style={[styles.note, { color: theme.colors.warning }]}>Viewer भूमिका से काम सहेजा नहीं जा सकता।</Text>
            ) : null}
          </View>
          {memberships.map(m => {
            const isOn = effective && m.contractor_id === effective.contractor_id;
            return (
              <TouchableOpacity key={m.contractor_id} style={[styles.option, isOn && styles.optionOn]} onPress={() => choose(m)} disabled={isOn && Boolean(selectedId)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{m.name}</Text>
                  <Text style={styles.note}>{ROLE_LABEL[m.role] || m.role}</Text>
                </View>
                {isOn ? <CheckCircle2 size={18} color={theme.colors.success} /> : <Text style={styles.chooseText}>चुनें</Text>}
              </TouchableOpacity>
            );
          })}
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
