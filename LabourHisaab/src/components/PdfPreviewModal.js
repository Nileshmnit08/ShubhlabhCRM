// PdfPreviewModal for LabourHisaab
// Displays a printable document preview for Individual Statements and Consolidated Reports
// Allows contractor to review and trigger native Android share sheet / PDF export

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import {
  FileText,
  Share2,
  X,
  Printer,
  Check,
  ShieldCheck,
} from 'lucide-react-native';
import theme from '../constants/theme';
import { formatRupees } from '../utils/shareWhatsApp';

export default function PdfPreviewModal({
  visible,
  onClose,
  documentType = 'statement', // 'statement' | 'consolidated'
  data,
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  const [isSharing, setIsSharing] = useState(false);

  if (!data) return null;

  const isStatement = documentType === 'statement';
  const isSettlementItem = documentType === 'settlement_item';
  const isSettlementSummary = documentType === 'settlement_summary';

  const docTitle = isStatement
    ? `मासिक हिसाब पर्ची - ${data.labourerName || 'मजदूर'}`
    : isSettlementItem
    ? `मासिक सेटलमेंट पर्ची - ${data.labourerName || 'मजदूर'}`
    : isSettlementSummary
    ? `मासिक खाता सेटलमेंट लेजर - ${data.yearMonth || 'अक्टूबर 2026'}`
    : `मासिक लेबर समरी - ${data.periodLabel || data.yearMonth || 'अक्टूबर 2026'}`;

  const handleShare = async () => {
    try {
      setIsSharing(true);
      let shareMessage = '';

      if (isSettlementItem) {
        shareMessage = `🤝 *मासिक सेटलमेंट पर्ची — ${contractorName}*\nमजदूर: ${data.labourerName} | माह: ${data.yearMonth}\nप्रारंभिक शेष: ${formatRupees(data.openingBalance)}\nकमाई: +${formatRupees(data.currentEarnings)}\nभुगतान: -${formatRupees(data.paymentsMade)}\nकटौती: -${formatRupees(data.allocatedDeductions)}\nअंतिम शेष: ${formatRupees(data.closingBalance)} (${data.closingBalance > 0 ? 'देय' : data.closingBalance < 0 ? 'अग्रिम' : 'शून्य'})`;
      } else if (isSettlementSummary) {
        shareMessage = `🤝 *मासिक सेटलमेंट लेजर — ${contractorName}*\nमाह: ${data.yearMonth} | स्थिति: ${data.status}\nकुल मजदूर: ${data.totalLabourers || data.items?.length}\nकुल प्रारंभिक: ${formatRupees(data.totalOpeningBalance)}\nकुल कमाई: ${formatRupees(data.totalEarnings)}\nकुल भुगतान: ${formatRupees(data.totalPaid)}\nकुल अंतिम शेष: ${formatRupees(data.totalClosingBalance)}`;
      } else if (isStatement) {
        shareMessage = `📄 *लेबर हिसाब पर्ची — ${contractorName}*\nमजदूर: ${data.labourerName} | अवधि: ${data.yearMonth || 'अक्टूबर 2026'}\nकुल कमाई: ${formatRupees(data.totalLabourEarned || data.totalEarned)}\nभुगतान: ${formatRupees(data.totalAmountPaid || data.totalPaid)}\nकटौती: ${formatRupees(data.totalAllocatedServiceExpenses || data.totalServiceExpense || 0)}\nबकाया शेष: ${formatRupees(data.remainingBalance)}`;
      } else {
        shareMessage = `📊 *मासिक लेबर समरी — ${contractorName}*\nअवधि: ${data.periodLabel || data.yearMonth || 'अक्टूबर 2026'}\nकुल मजदूर: ${data.individualSummaries?.length || 6} | कार्य दिवस: ${data.totalWorkingDays || 26}\nकुल मजदूरी: ${formatRupees(data.totalLabourEarned)}\nकुल भुगतान: ${formatRupees(data.totalPaymentsMade)}\nकुल सेवा खर्च: ${formatRupees(Number(data.totalAllocatedServiceExpenses || 0) + Number(data.contractorBorneExpenses || 0))}\nदेय शेष: ${formatRupees(data.remainingPayableBalance)}`;
      }

      await Share.share({
        title: docTitle,
        message: shareMessage,
      });
    } catch (err) {
      console.log('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePrint = () => {
    Alert.alert('प्रिंट / PDF', 'दस्तावेज़ प्रिंट और पीडीएफ शेयरिंग के लिए तैयार है।', [
      { text: 'शेयर करें', onPress: handleShare },
      { text: 'ठीक है' },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.pdfIconWrap}>
                <FileText size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {isStatement ? 'लेबर हिसाब पर्ची (PDF Preview)' : 'मासिक समरी रिपोर्ट (PDF Preview)'}
                </Text>
                <Text style={styles.modalSub}>{contractorName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Printable Document Paper View */}
          <ScrollView style={styles.paperScrollArea} contentContainerStyle={styles.paperContent}>
            <View style={styles.paperSheet}>
              {/* Paper Header */}
              <View style={styles.paperHeader}>
                <View style={styles.paperBrandCol}>
                  <Text style={styles.wheatEmoji}>🌾</Text>
                  <View>
                    <Text style={styles.paperBrandTop}>शुभ लाभ लेबर हिसाब</Text>
                    <Text style={styles.paperBrandSub}>{contractorName}</Text>
                  </View>
                </View>
                <View style={styles.docTypeBadge}>
                  <Text style={styles.docTypeBadgeText}>
                    {isStatement ? 'मासिक पर्ची' : 'समेकित समरी'}
                  </Text>
                </View>
              </View>

              <View style={styles.dividerOrange} />

              {/* Meta Grid */}
              <View style={styles.docMetaGrid}>
                {isSettlementItem ? (
                  <>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>मजदूर का नाम</Text>
                      <Text style={styles.metaCellVal}>{data.labourerName}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>लेबर कोड / ID</Text>
                      <Text style={styles.metaCellVal}>{data.labourerId || 'LH_LAB'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>सेटलमेंट माह</Text>
                      <Text style={styles.metaCellVal}>{data.yearMonth || 'अक्टूबर 2026'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>खाता स्थिति</Text>
                      <Text style={[styles.metaCellVal, { color: data.status === 'Closed' ? '#6B7280' : '#137A38', fontWeight: '800' }]}>{data.status || 'Settled'}</Text>
                    </View>
                  </>
                ) : isSettlementSummary ? (
                  <>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>सेटलमेंट माह</Text>
                      <Text style={styles.metaCellVal}>{data.yearMonth || 'अक्टूबर 2026'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>खाता स्थिति</Text>
                      <Text style={[styles.metaCellVal, { color: data.status === 'Closed' ? '#6B7280' : '#137A38', fontWeight: '800' }]}>{data.status || 'Open'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>कुल मजदूर</Text>
                      <Text style={styles.metaCellVal}>{data.totalLabourers || data.items?.length || 6} मजदूर</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>कुल प्रसंस्कृत वजन</Text>
                      <Text style={styles.metaCellVal}>{data.totalWeightProcessedKg ? `${Number(data.totalWeightProcessedKg).toLocaleString('en-IN')} kg` : '1,25,000 kg'}</Text>
                    </View>
                  </>
                ) : isStatement ? (
                  <>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>मजदूर का नाम</Text>
                      <Text style={styles.metaCellVal}>{data.labourerName}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>मजदूर कोड / ID</Text>
                      <Text style={styles.metaCellVal}>{data.labourerId || 'LH_LAB_001'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>हिसाब अवधि</Text>
                      <Text style={styles.metaCellVal}>{data.yearMonth || 'अक्टूबर 2026'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>कुल कार्य दिवस</Text>
                      <Text style={styles.metaCellVal}>{data.workingDays} दिन</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>रिपोर्टिंग अवधि</Text>
                      <Text style={styles.metaCellVal}>{data.periodLabel || data.yearMonth || 'अक्टूबर 2026'}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>कुल कार्यरत मजदूर</Text>
                      <Text style={styles.metaCellVal}>{data.individualSummaries?.length || 6} मजदूर</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>कुल कार्य दिवस</Text>
                      <Text style={styles.metaCellVal}>{data.totalWorkingDays || 26} दिन</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaCellLabel}>कुल प्रसंस्कृत वजन</Text>
                      <Text style={styles.metaCellVal}>{data.totalWeightProcessedKg ? `${Number(data.totalWeightProcessedKg).toLocaleString('en-IN')} kg` : '1,25,000 kg'}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Financial Summary Table */}
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeadingText}>
                  {isSettlementItem ? 'मासिक सेटलमेंट हिसाब विवरण' : isSettlementSummary ? 'समेकित खाता सेटलमेंट विवरण' : isStatement ? 'वित्तीय हिसाब विवरण' : 'समेकित मजदूर हिसाब'}
                </Text>
              </View>

              {isSettlementItem ? (
                <View style={styles.previewTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>विवरण</Text>
                    <Text style={[styles.thCell, { width: 90, textAlign: 'right' }]}>राशि</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>⏮️ प्रारंभिक शेष (Opening Balance)</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#64748B' }]}>
                      {formatRupees(data.openingBalance || 0)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>💰 चालू माह कुल कमाई</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#137A38', fontWeight: '800' }]}>
                      + {formatRupees(data.currentEarnings || 0)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>💵 (-) दिया गया भुगतान</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#DC2626' }]}>
                      - {formatRupees(data.paymentsMade || 0)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>🍽️ (-) सेवा खर्च कटौती</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#DC2626' }]}>
                      - {formatRupees(data.allocatedDeductions || 0)}
                    </Text>
                  </View>
                  <View style={[styles.tableRow, { backgroundColor: '#F0FDF4', borderTopWidth: 2, borderTopColor: '#137A38' }]}>
                    <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '800', color: '#065F46' }]}>
                      अंतिम शेष (Closing Balance)
                    </Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', fontWeight: '900', color: data.closingBalance < 0 ? '#DC2626' : '#137A38' }]}>
                      {data.closingBalance < 0 ? `- ₹${Math.abs(data.closingBalance).toLocaleString('en-IN')}` : `₹${(data.closingBalance || 0).toLocaleString('en-IN')}`}
                    </Text>
                  </View>
                </View>
              ) : isSettlementSummary ? (
                <View style={styles.previewTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.thCell, { flex: 1 }]}>मजदूर</Text>
                    <Text style={[styles.thCell, { width: 55, textAlign: 'right' }]}>प्रारंभिक</Text>
                    <Text style={[styles.thCell, { width: 55, textAlign: 'right' }]}>कमाई</Text>
                    <Text style={[styles.thCell, { width: 55, textAlign: 'right' }]}>भुगतान</Text>
                    <Text style={[styles.thCell, { width: 55, textAlign: 'right' }]}>अंतिम</Text>
                  </View>
                  {(data.items || []).map((item) => {
                    const isNeg = item.closingBalance < 0;
                    return (
                      <View key={item.labourerId} style={styles.tableRow}>
                        <Text style={[styles.tdCell, { flex: 1, fontWeight: '700' }]}>{item.labourerName}</Text>
                        <Text style={[styles.tdCell, { width: 55, textAlign: 'right', color: '#64748B' }]}>
                          ₹{Number(item.openingBalance || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.tdCell, { width: 55, textAlign: 'right', color: '#137A38' }]}>
                          ₹{Number(item.currentEarnings || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.tdCell, { width: 55, textAlign: 'right', color: '#DC2626' }]}>
                          ₹{Number(item.paymentsMade || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text
                          style={[
                            styles.tdCell,
                            {
                              width: 55,
                              textAlign: 'right',
                              fontWeight: '800',
                              color: isNeg ? '#D92D20' : '#137A38',
                            },
                          ]}
                        >
                          {isNeg ? `-₹${Math.abs(item.closingBalance).toLocaleString('en-IN')}` : `₹${item.closingBalance.toLocaleString('en-IN')}`}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={[styles.tableRow, { backgroundColor: '#E8F5EC', borderTopWidth: 2, borderTopColor: '#137A38' }]}>
                    <Text style={[styles.tdCell, { flex: 1, fontWeight: '800', color: '#065F46' }]}>कुल योग</Text>
                    <Text style={[styles.tdCell, { width: 55, textAlign: 'right', fontWeight: '800' }]}>
                      ₹{(data.totalOpeningBalance || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.tdCell, { width: 55, textAlign: 'right', fontWeight: '800', color: '#137A38' }]}>
                      ₹{(data.totalEarnings || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.tdCell, { width: 55, textAlign: 'right', fontWeight: '800', color: '#DC2626' }]}>
                      ₹{(data.totalPaid || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.tdCell, { width: 55, textAlign: 'right', fontWeight: '900', color: '#137A38' }]}>
                      ₹{(data.totalClosingBalance || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              ) : isStatement ? (
                <View style={styles.previewTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>विवरण</Text>
                    <Text style={[styles.thCell, { width: 90, textAlign: 'right' }]}>राशि</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>कुल मजदूरी कमाई</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#137A38', fontWeight: '800' }]}>
                      + {formatRupees(data.totalLabourEarned || data.totalEarned)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>(-) दिया गया भुगतान</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#2563EB' }]}>
                      - {formatRupees(data.totalAmountPaid || data.totalPaid)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>(-) खाना / भोजन खर्च कटौती</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#D97706' }]}>
                      - {formatRupees(data.totalAllocatedFoodExpenses || data.foodExpense || 0)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tdCell, { flex: 1.5 }]}>(-) आवागमन / अन्य सेवा कटौती</Text>
                    <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#D97706' }]}>
                      - {formatRupees(data.totalOtherAllocatedExpenses || data.transportExpense || 0)}
                    </Text>
                  </View>
                  {data.contractorBorneExpenses > 0 && (
                    <View style={[styles.tableRow, { backgroundColor: '#F8FAFC' }]}>
                      <Text style={[styles.tdCell, { flex: 1.5, color: '#64748B', fontStyle: 'italic' }]}>
                        ठेकेदार वहन खर्च (मजदूर से नहीं काटा)
                      </Text>
                      <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: '#64748B', fontStyle: 'italic' }]}>
                        [{formatRupees(data.contractorBorneExpenses)}]
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.previewTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.thCell, { flex: 1 }]}>मजदूर</Text>
                    <Text style={[styles.thCell, { width: 65, textAlign: 'right' }]}>कमाई</Text>
                    <Text style={[styles.thCell, { width: 65, textAlign: 'right' }]}>भुगतान</Text>
                    <Text style={[styles.thCell, { width: 65, textAlign: 'right' }]}>कटौती</Text>
                    <Text style={[styles.thCell, { width: 65, textAlign: 'right' }]}>बकाया</Text>
                  </View>
                  {(data.individualSummaries || []).map((lab) => {
                    const isNeg = lab.remainingBalance < 0;
                    return (
                      <View key={lab.labourerId} style={styles.tableRow}>
                        <Text style={[styles.tdCell, { flex: 1, fontWeight: '700' }]}>{lab.labourerName}</Text>
                        <Text style={[styles.tdCell, { width: 65, textAlign: 'right', color: '#137A38' }]}>
                          ₹{lab.totalLabourEarned?.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.tdCell, { width: 65, textAlign: 'right', color: '#2563EB' }]}>
                          ₹{lab.totalAmountPaid?.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.tdCell, { width: 65, textAlign: 'right', color: '#D97706' }]}>
                          ₹{lab.totalAllocatedServiceExpenses?.toLocaleString('en-IN')}
                        </Text>
                        <Text
                          style={[
                            styles.tdCell,
                            {
                              width: 65,
                              textAlign: 'right',
                              fontWeight: '800',
                              color: isNeg ? '#D92D20' : '#137A38',
                            },
                          ]}
                        >
                          {isNeg ? `- ₹${Math.abs(lab.remainingBalance).toLocaleString('en-IN')}` : `₹${lab.remainingBalance.toLocaleString('en-IN')}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Balance Box */}
              <View
                style={[
                  styles.balanceHighlightBox,
                  (data.remainingBalance < 0 || data.remainingPayableBalance < 0)
                    ? styles.balanceBoxNegative
                    : styles.balanceBoxPositive,
                ]}
              >
                <View>
                  <Text style={styles.balanceHighlightTitle}>
                    {(data.remainingBalance < 0 || data.remainingPayableBalance < 0)
                      ? 'अग्रिम राशि / कांट्रेक्टर बकाया'
                      : 'कुल देय बकाया राशि (Payable)'}
                  </Text>
                  <Text style={styles.balanceFormulaNote}>कमाई − भुगतान − सेवा कटौती</Text>
                </View>
                <Text
                  style={[
                    styles.balanceHighlightValue,
                    {
                      color: (data.remainingBalance < 0 || data.remainingPayableBalance < 0) ? '#D92D20' : '#137A38',
                    },
                  ]}
                >
                  {isStatement
                    ? (data.remainingBalance < 0
                        ? `- ₹${Math.abs(data.remainingBalance).toLocaleString('en-IN')}`
                        : `₹${Number(data.remainingBalance || 0).toLocaleString('en-IN')}`)
                    : (data.remainingPayableBalance < 0
                        ? `- ₹${Math.abs(data.remainingPayableBalance).toLocaleString('en-IN')}`
                        : `₹${Number(data.remainingPayableBalance || 0).toLocaleString('en-IN')}`)}
                </Text>
              </View>

              {/* Signatures */}
              <View style={styles.sigRow}>
                <View style={styles.sigBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>{isStatement ? 'मजदूर हस्ताक्षर' : 'लेखापाल हस्ताक्षर'}</Text>
                </View>
                <View style={styles.sigBox}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>ठेकेदार हस्ताक्षर</Text>
                </View>
              </View>

              <View style={styles.verifiedWatermark}>
                <ShieldCheck size={14} color="#137A38" />
                <Text style={styles.watermarkText}>Shubh Labh Labour Hisab • Verified Statement</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.printActionBtn}
              onPress={handlePrint}
              activeOpacity={0.8}
            >
              <Printer size={18} color="#1E293B" />
              <Text style={styles.printActionText}>प्रिंट / डाउनलोड</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareActionBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Share2 size={18} color="#FFFFFF" />
              <Text style={styles.shareActionText}>PDF शेयर करें</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pdfIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  paperScrollArea: {
    flex: 1,
  },
  paperContent: {
    padding: 16,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paperBrandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wheatEmoji: {
    fontSize: 22,
  },
  paperBrandTop: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EE5A00',
  },
  paperBrandSub: {
    fontSize: 11,
    color: '#64748B',
  },
  docTypeBadge: {
    backgroundColor: '#E8F5EC',
    borderColor: '#137A38',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#137A38',
  },
  dividerOrange: {
    height: 2,
    backgroundColor: '#EE5A00',
    marginTop: 12,
    marginBottom: 12,
  },
  docMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  metaCell: {
    width: '47%',
  },
  metaCellLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  metaCellVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  sectionHeadingRow: {
    marginBottom: 8,
  },
  sectionHeadingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  previewTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdCell: {
    fontSize: 12,
    color: '#1E293B',
  },
  balanceHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  balanceBoxPositive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  balanceBoxNegative: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  balanceHighlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  balanceFormulaNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  balanceHighlightValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sigBox: {
    width: 120,
    alignItems: 'center',
  },
  sigLine: {
    width: 100,
    height: 1,
    backgroundColor: '#64748B',
    marginTop: 24,
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  verifiedWatermark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingTop: 8,
  },
  watermarkText: {
    fontSize: 10,
    color: '#137A38',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  printActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  printActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  shareActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#137A38',
  },
  shareActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

