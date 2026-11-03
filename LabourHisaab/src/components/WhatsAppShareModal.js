// WhatsApp Share Review Modal for LabourHisaab
// Allows contractor to review the generated Hindi statement before sharing

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { MessageCircle, Share2, Copy, Check, X, ShieldAlert } from 'lucide-react-native';
import theme from '../constants/theme';
import { buildWhatsAppStatementText } from '../utils/shareWhatsApp';

export default function WhatsAppShareModal({
  visible,
  onClose,
  statementData,
  contractorName = 'शुभ लाभ लेबर कांट्रेक्टर',
}) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!statementData) return null;

  const messageText = statementData.customMessageText || buildWhatsAppStatementText({
    ...statementData,
    contractorName,
  });

  const handleShareNative = async () => {
    try {
      setIsSharing(true);
      await Share.share({
        message: messageText,
        title: `लेबर हिसाब पर्ची - ${statementData.labourerName}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    try {
      setIsSharing(true);
      const encoded = encodeURIComponent(messageText);
      const phone = statementData.labourerPhone ? statementData.labourerPhone.replace(/\D/g, '') : '';
      const whatsappUrl = phone
        ? `whatsapp://send?phone=91${phone}&text=${encoded}`
        : `whatsapp://send?text=${encoded}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web link or native share
        const webUrl = phone
          ? `https://wa.me/91${phone}?text=${encoded}`
          : `https://wa.me/?text=${encoded}`;
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      // If WhatsApp protocol fails, trigger native share sheet
      handleShareNative();
    } finally {
      setIsSharing(false);
    }
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
            <View style={styles.modalHeaderTitleRow}>
              <View style={styles.waIconBadge}>
                <MessageCircle size={22} color="#FFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>व्हाट्सएप हिसाब पर्ची</Text>
                <Text style={styles.modalSubtitle}>संदेश की समीक्षा करें और भेजें</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Review Notice */}
          <View style={styles.reviewNotice}>
            <ShieldAlert size={16} color={theme.colors.warning} />
            <Text style={styles.reviewNoticeText}>
              कृपया संदेश की जांच करें। बटन दबाने पर व्हाट्सएप खुलेगा जहां आप संदेश की पुष्टि करके भेज सकते हैं।
            </Text>
          </View>

          {/* Statement Message Preview */}
          <ScrollView style={styles.previewBox} contentContainerStyle={styles.previewContent}>
            <Text style={styles.previewText}>{messageText}</Text>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryWaButton}
              onPress={handleOpenWhatsApp}
              activeOpacity={0.8}
            >
              <MessageCircle size={20} color="#FFF" />
              <Text style={styles.primaryWaButtonText}>व्हाट्सएप पर भेजें</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryShareButton}
              onPress={handleShareNative}
              activeOpacity={0.8}
            >
              <Share2 size={18} color={theme.colors.primaryDark} />
              <Text style={styles.secondaryShareButtonText}>अन्य माध्यम से शेयर करें</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '85%',
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#25D366', // WhatsApp Brand Green
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.md,
    gap: 8,
    alignItems: 'center',
  },
  reviewNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#7C2D12',
    lineHeight: 17,
    fontWeight: '500',
  },
  previewBox: {
    backgroundColor: '#F7FEE7', // Soft message green/yellow note background
    borderColor: '#BEF264',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    maxHeight: 280,
    marginBottom: theme.spacing.lg,
  },
  previewContent: {
    padding: theme.spacing.md,
  },
  previewText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  actionButtonsContainer: {
    gap: 10,
    paddingBottom: theme.spacing.md,
  },
  primaryWaButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    elevation: 3,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  primaryWaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryShareButton: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  secondaryShareButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
});

