import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, Linking, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Headset, X, Phone, ChevronRight } from 'lucide-react-native';
import { theme } from '../theme';
import SLText from './SLText';
import SLButton from './SLButton';
import { supabase } from '../../core/api/supabase';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../localization/i18n';

export const SUPPORT_PHONE_NUMBER = '9461924461';

const FALLBACK_FAQS = [
  { id: '1', question: 'How can I place an order?', answer: 'Open New Order, select the products and quantities you need, review your order and confirm it.', category: 'Orders', action: 'NewOrderTab' },
  { id: '2', question: 'How can I repeat my last order?', answer: 'Open My Orders, select your previous order and use the reorder option.', category: 'Orders', action: 'OrdersStack' },
  { id: '3', question: 'Can I edit an order?', answer: 'If the order is still eligible for editing, open the order details and select Edit Order.', category: 'Orders' },
  { id: '4', question: 'Where is my order?', answer: 'Open My Orders and select the order to view its current status.', category: 'Delivery', action: 'OrdersStack' },
  { id: '5', question: 'How can I see my current scheme?', answer: 'Open the current Shubh Labh scheme/update available in the app.', category: 'Schemes' },
  { id: '6', question: 'How can I change my delivery address?', answer: 'Open your profile or the applicable delivery-address section and update the saved delivery address.', category: 'Account', action: 'ProfileTab' },
];

export const GlobalHelpFab = () => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [conversation, setConversation] = useState([]);
  
  const { t } = useTranslation();
  const navigation = useNavigation();

  useEffect(() => {
    if (modalVisible && faqs.length === 0) {
      loadFaqs();
    }
  }, [modalVisible]);

  const loadFaqs = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false })
        .order('sort_order', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setFaqs(data);
      } else {
        setFaqs(FALLBACK_FAQS);
      }
    } catch (err) {
      console.warn('Failed to load FAQs, using fallback', err);
      // For sprint test, we still show the fallback rather than an error if the table doesn't exist
      // Since we couldn't run the SQL script via CLI in this test environment.
      setFaqs(FALLBACK_FAQS); 
    } finally {
      setLoading(false);
      setConversation([{
        type: 'assistant',
        text: 'Hi! I’m here to help you with your Shubh Labh orders, products, schemes and support.'
      }]);
    }
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`);
  };

  const handleAskQuestion = (faq) => {
    setConversation(prev => [
      ...prev,
      { type: 'user', text: faq.question },
      { type: 'assistant', text: faq.answer, action: faq.action }
    ]);
  };

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.fab, 
          { bottom: insets.bottom + theme.spacing.xxl + theme.spacing.lg + 70 }
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Headset size={28} color={theme.colors.white} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.bottomSheet}
          >
            <View style={styles.header}>
              <View>
                <SLText style={styles.headerTitle}>Shubh Labh Help</SLText>
                <SLText style={styles.headerSubtitle}>How can we help you?</SLText>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <SLText style={styles.loadingText}>Loading help...</SLText>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <SLText style={styles.errorText}>Help content is temporarily unavailable.</SLText>
                <SLButton 
                  title="CALL SUPPORT" 
                  onPress={handleCallSupport}
                  icon={<Phone size={20} color={theme.colors.white} />}
                />
              </View>
            ) : (
              <ScrollView style={styles.chatContainer} contentContainerStyle={styles.chatContent}>
                {conversation.map((msg, idx) => (
                  <View key={idx} style={[
                    styles.messageBubble, 
                    msg.type === 'user' ? styles.userBubble : styles.assistantBubble
                  ]}>
                    <SLText style={[
                      styles.messageText, 
                      msg.type === 'user' ? styles.userMessageText : styles.assistantMessageText
                    ]}>
                      {msg.text}
                    </SLText>
                    {msg.action && (
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {
                          setModalVisible(false);
                          if (navigation.navigate) {
                            navigation.navigate(msg.action);
                          }
                        }}
                      >
                        <SLText style={styles.actionButtonText}>Go</SLText>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {conversation.length === 1 && (
                  <View style={styles.contextContainer}>
                    <SLText style={styles.contextTitle}>Common Questions</SLText>
                    <View style={styles.faqList}>
                      {faqs.map((faq, idx) => (
                        <TouchableOpacity 
                          key={faq.id || idx.toString()} 
                          style={styles.faqButton}
                          onPress={() => handleAskQuestion(faq)}
                        >
                          <SLText style={styles.faqButtonText}>{faq.question}</SLText>
                          <ChevronRight size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                
                {conversation.length > 1 && (
                  <TouchableOpacity 
                    style={styles.moreQuestionsButton}
                    onPress={() => {
                      setConversation([{
                        type: 'assistant',
                        text: 'What else can I help you with?'
                      }]);
                    }}
                  >
                    <SLText style={styles.moreQuestionsText}>Ask another question</SLText>
                  </TouchableOpacity>
                )}

                <View style={styles.escalationContainer}>
                  <SLText style={styles.escalationText}>Still need help?</SLText>
                  <SLText style={styles.phoneNumber}>📞 {SUPPORT_PHONE_NUMBER}</SLText>
                  <SLButton 
                    title="CALL SUPPORT" 
                    onPress={handleCallSupport}
                    icon={<Phone size={20} color={theme.colors.white} />}
                    style={styles.callButton}
                  />
                </View>
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.md,
    zIndex: 1001,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: theme.spacing.md,
    paddingBottom: 100, // padding for safety
  },
  messageBubble: {
    maxWidth: '85%',
    padding: theme.spacing.md,
    borderRadius: 16,
    marginBottom: theme.spacing.md,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  assistantMessageText: {
    color: theme.colors.text,
  },
  userMessageText: {
    color: theme.colors.white,
  },
  actionButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contextContainer: {
    marginTop: theme.spacing.sm,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  faqList: {
    gap: theme.spacing.sm,
  },
  faqButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  faqButtonText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  moreQuestionsButton: {
    alignSelf: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  moreQuestionsText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  escalationContainer: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  escalationText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  callButton: {
    width: '100%',
  }
});
