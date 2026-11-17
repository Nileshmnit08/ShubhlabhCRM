import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, elevation, rounded } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { CameraService } from '../services/CameraService';
import { VisitorRegisterService } from '../services/VisitorRegisterService';
import {
  VISITOR_CATEGORIES,
  istBusinessDate,
  formatIstTime,
  formatIstDateTime,
  generatePassNumber,
  validateVisitorInput,
  searchVisitors,
} from '../utils/visitorRegister';

export function VisitorRegisterScreen({ navigation }) {
  const { session, staffProfile } = useAuth();
  const userId = session?.user?.id;
  const staffName = staffProfile?.display_name || 'Staff';

  // Active Tab: 'REGISTER' or 'HISTORY'
  const [activeTab, setActiveTab] = useState('REGISTER');

  // Form State
  const [visitorName, setVisitorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Customer');
  const [personToMeet, setPersonToMeet] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [passNumber, setPassNumber] = useState(generatePassNumber());

  // UI & Loading States
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);
  const busyRef = useRef(false);

  // History State
  const [visitors, setVisitors] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null); // Modal view
  const [markingExitId, setMarkingExitId] = useState(null);

  // Load today's visitors on mount and tab switch
  useEffect(() => {
    loadTodayVisitors();
  }, [userId, activeTab]);

  const loadTodayVisitors = async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const data = await VisitorRegisterService.getTodayVisitors(userId);
      setVisitors(data || []);
    } catch (err) {
      console.warn('[VisitorRegisterScreen] Error loading visitors:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayVisitors();
    setRefreshing(false);
  };

  // Reset form helper
  const resetForm = () => {
    setVisitorName('');
    setMobileNumber('');
    setCompanyName('');
    setAddress('');
    setCategory('Customer');
    setPersonToMeet('');
    setPurposeOfVisit('');
    setVehicleNumber('');
    setPhotoUri(null);
    setErrors({});
    setPassNumber(generatePassNumber());
  };

  // ─── Camera Actions ────────────────────────────────────────────────────────
  const handleCapturePhoto = async () => {
    if (capturingPhoto) return;
    setCapturingPhoto(true);
    try {
      const photo = await CameraService.capturePhoto();
      if (photo && photo.uri) {
        setPhotoUri(photo.uri);
        // Clear photo error if any
        setErrors((prev) => {
          const next = { ...prev };
          delete next.photo_url;
          return next;
        });
      }
    } catch (err) {
      if (err.code !== 'USER_CANCELLED') {
        Alert.alert(
          'Camera Error',
          err.message || 'Unable to capture photo. Please check camera permissions.'
        );
      }
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  // ─── Form Submission ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (busyRef.current || submitting || !userId) return;

    const form = {
      visitor_name: visitorName,
      mobile_number: mobileNumber,
      company_name: companyName,
      address,
      category,
      person_to_meet: personToMeet,
      purpose_of_visit: purposeOfVisit,
      vehicle_number: vehicleNumber,
      photo_url: photoUri,
      pass_number: passNumber,
    };

    const validation = validateVisitorInput(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setBannerMessage({
        type: 'error',
        text: 'Please correct the highlighted fields and capture a photo.',
      });
      return;
    }

    busyRef.current = true;
    setSubmitting(true);
    setErrors({});
    setBannerMessage(null);

    try {
      const result = await VisitorRegisterService.registerVisitor(form, userId);
      Alert.alert(
        'Pass Generated',
        `Visitor pass ${result.record.pass_number} generated successfully for ${result.record.visitor_name}.`,
        [
          {
            text: 'View in History',
            onPress: () => {
              resetForm();
              setActiveTab('HISTORY');
            },
          },
          {
            text: 'New Visitor',
            onPress: () => resetForm(),
          },
        ]
      );
      resetForm();
      await loadTodayVisitors();
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      setBannerMessage({
        type: 'error',
        text: err.message || 'Failed to register visitor. Please try again.',
      });
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  // ─── Mark Exit Action ───────────────────────────────────────────────────────
  const handleMarkExit = (visitor) => {
    if (!visitor || !visitor.id || markingExitId) return;

    Alert.alert(
      'Confirm Exit',
      `Mark exit for ${visitor.visitor_name} (Pass: ${visitor.pass_number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Exit',
          style: 'destructive',
          onPress: async () => {
            setMarkingExitId(visitor.id);
            try {
              await VisitorRegisterService.markVisitorExit(visitor.id, userId);
              await loadTodayVisitors();
              if (selectedVisitor && selectedVisitor.id === visitor.id) {
                setSelectedVisitor((prev) => ({
                  ...prev,
                  status: 'OUT',
                  exit_time: new Date().toISOString(),
                }));
              }
              Alert.alert('Exit Recorded', `${visitor.visitor_name} marked as exited.`);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not record exit');
            } finally {
              setMarkingExitId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered visitor list for history tab
  const filteredVisitors = useMemo(() => {
    return searchVisitors(visitors, searchQuery);
  }, [visitors, searchQuery]);

  const insideCount = visitors.filter((v) => v.status === 'IN').length;
  const exitedCount = visitors.filter((v) => v.status === 'OUT').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Visitor Register</Text>
          <Text style={styles.headerSub}>
            {formatIstDateTime(new Date().toISOString())?.split(',')[0]} • Gate Entry & Pass
          </Text>
        </View>
        <View style={styles.staffBadge}>
          <MaterialIcons name="security" size={16} color={colors.primary} />
          <Text style={styles.staffBadgeText}>{staffName}</Text>
        </View>
      </View>

      {/* SEGMENTED TAB SWITCHER */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'REGISTER' && styles.tabButtonActive]}
          onPress={() => setActiveTab('REGISTER')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="person-add"
            size={18}
            color={activeTab === 'REGISTER' ? colors.primary : colors.onSurfaceVariant}
          />
          <Text style={[styles.tabText, activeTab === 'REGISTER' && styles.tabTextActive]}>
            New Registration
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'HISTORY' && styles.tabButtonActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="badge"
            size={18}
            color={activeTab === 'HISTORY' ? colors.primary : colors.onSurfaceVariant}
          />
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            Today's Visitors ({visitors.length})
          </Text>
          {insideCount > 0 && (
            <View style={styles.insideCountBadge}>
              <Text style={styles.insideCountBadgeText}>{insideCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* TAB 1: REGISTRATION FORM */}
      {activeTab === 'REGISTER' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* PASS NUMBER CARD */}
            <View style={[styles.passPreviewCard, elevation.level1]}>
              <View style={styles.passHeader}>
                <View style={styles.passBrand}>
                  <MaterialIcons name="domain" size={20} color={colors.primary} />
                  <Text style={styles.passBrandText}>SHUBH LABH GATE PASS</Text>
                </View>
                <View style={styles.inStatusBadge}>
                  <Text style={styles.inStatusText}>STATUS: IN</Text>
                </View>
              </View>
              <View style={styles.passNumberRow}>
                <Text style={styles.passNumberLabel}>Pass No:</Text>
                <Text style={styles.passNumberVal}>{passNumber}</Text>
              </View>
              <Text style={styles.passMeta}>
                Entry: {formatIstTime(new Date().toISOString())} | Attendant: {staffName}
              </Text>
            </View>

            {/* ERROR BANNER */}
            {bannerMessage && (
              <View
                style={[
                  styles.banner,
                  bannerMessage.type === 'error' ? styles.bannerError : styles.bannerSuccess,
                ]}
              >
                <MaterialIcons
                  name={bannerMessage.type === 'error' ? 'error-outline' : 'check-circle'}
                  size={20}
                  color={bannerMessage.type === 'error' ? colors.error : colors.primary}
                />
                <Text
                  style={[
                    styles.bannerText,
                    bannerMessage.type === 'error'
                      ? styles.bannerTextError
                      : styles.bannerTextSuccess,
                  ]}
                >
                  {bannerMessage.text}
                </Text>
              </View>
            )}

            {/* SECTION 1: VISITOR PHOTOGRAPH (REQUIRED) */}
            <View style={styles.sectionHeader}>
              <MaterialIcons name="camera-alt" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                Visitor Photograph <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>

            <View style={[styles.photoCard, errors.photo_url && styles.inputError]}>
              {photoUri ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
                  <View style={styles.photoSuccessTag}>
                    <MaterialIcons name="check-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.photoSuccessText}>Photo Captured</Text>
                  </View>
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity
                      style={styles.photoRetakeBtn}
                      onPress={handleCapturePhoto}
                      disabled={capturingPhoto}
                    >
                      <MaterialIcons name="refresh" size={18} color={colors.primary} />
                      <Text style={styles.photoRetakeText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoRemoveBtn} onPress={handleRemovePhoto}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                      <Text style={styles.photoRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={handleCapturePhoto}
                  disabled={capturingPhoto}
                  activeOpacity={0.8}
                >
                  {capturingPhoto ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <View style={styles.cameraIconCircle}>
                        <MaterialIcons name="photo-camera" size={32} color={colors.primary} />
                      </View>
                      <Text style={styles.captureBtnTitle}>Tap to Capture Visitor Photo</Text>
                      <Text style={styles.captureBtnSub}>
                        Opens device camera directly • Photo required for pass
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {errors.photo_url && (
                <Text style={styles.fieldErrorText}>{errors.photo_url}</Text>
              )}
            </View>

            {/* SECTION 2: VISITOR DETAILS */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <MaterialIcons name="badge" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Visitor Details</Text>
            </View>

            {/* VISITOR NAME */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Visitor Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.visitor_name && styles.inputError]}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={colors.outline}
                value={visitorName}
                onChangeText={(text) => {
                  setVisitorName(text);
                  if (errors.visitor_name) {
                    setErrors((prev) => ({ ...prev, visitor_name: null }));
                  }
                }}
                autoCapitalize="words"
              />
              {errors.visitor_name && (
                <Text style={styles.fieldErrorText}>{errors.visitor_name}</Text>
              )}
            </View>

            {/* MOBILE NUMBER */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Mobile Number (10 digits) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWithIcon, errors.mobile_number && styles.inputError]}>
                <Text style={styles.mobilePrefix}>+91</Text>
                <TextInput
                  style={styles.inputInner}
                  placeholder="9876543210"
                  placeholderTextColor={colors.outline}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={(text) => {
                    const clean = text.replace(/[^0-9]/g, '');
                    setMobileNumber(clean);
                    if (errors.mobile_number) {
                      setErrors((prev) => ({ ...prev, mobile_number: null }));
                    }
                  }}
                />
              </View>
              {errors.mobile_number && (
                <Text style={styles.fieldErrorText}>{errors.mobile_number}</Text>
              )}
            </View>

            {/* VISITOR CATEGORY CHIPS */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Visitor Category <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.chipsRow}>
                {VISITOR_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={16}
                        color={isSelected ? colors.primary : colors.outline}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* COMPANY / FIRM */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Company / Firm Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Kisan Traders / ABC Logistics"
                placeholderTextColor={colors.outline}
                value={companyName}
                onChangeText={setCompanyName}
                autoCapitalize="words"
              />
            </View>

            {/* PERSON TO MEET */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Person to Meet / Employee (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Factory Manager / Accounts Head"
                placeholderTextColor={colors.outline}
                value={personToMeet}
                onChangeText={setPersonToMeet}
              />
            </View>

            {/* PURPOSE OF VISIT */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Purpose of Visit (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Feed purchase inquiry / Material delivery"
                placeholderTextColor={colors.outline}
                value={purposeOfVisit}
                onChangeText={setPurposeOfVisit}
              />
            </View>

            {/* VEHICLE NUMBER */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Vehicle Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. RJ 14 GA 1234"
                placeholderTextColor={colors.outline}
                value={vehicleNumber}
                onChangeText={(text) => setVehicleNumber(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            {/* ADDRESS */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address / City (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                placeholder="e.g. Jaipur, Rajasthan"
                placeholderTextColor={colors.outline}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Generate Gate Pass & Check In</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* TAB 2: TODAY'S VISITORS (HISTORY) */}
      {activeTab === 'HISTORY' && (
        <View style={{ flex: 1 }}>
          {/* SEARCH & METRIC STRIP */}
          <View style={styles.historyTopStrip}>
            {/* SEARCH BAR */}
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, pass, mobile, firm..."
                placeholderTextColor={colors.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={18} color={colors.outline} />
                </TouchableOpacity>
              )}
            </View>

            {/* METRICS ROW */}
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Today</Text>
                <Text style={styles.metricNumber}>{visitors.length}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.primary }]}>Currently Inside</Text>
                <Text style={[styles.metricNumber, { color: colors.primary }]}>{insideCount}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Exited</Text>
                <Text style={[styles.metricNumber, { color: colors.onSurfaceVariant }]}>
                  {exitedCount}
                </Text>
              </View>
            </View>
          </View>

          {/* VISITORS LIST */}
          <ScrollView
            contentContainerStyle={styles.historyList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
          >
            {historyLoading && !refreshing ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading today's visitors...</Text>
              </View>
            ) : filteredVisitors.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="badge" size={48} color={colors.outlineVariant} />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matching visitors found' : 'No visitors registered today'}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery
                    ? 'Try searching with a different name, pass number, or mobile.'
                    : 'Tap "New Registration" to record a visitor and generate a gate pass.'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setActiveTab('REGISTER')}
                  >
                    <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyActionBtnText}>Register First Visitor</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredVisitors.map((v) => {
                const isInside = v.status === 'IN';
                return (
                  <TouchableOpacity
                    key={v.id || v.pass_number}
                    style={[styles.visitorCard, elevation.level1]}
                    onPress={() => setSelectedVisitor(v)}
                    activeOpacity={0.85}
                  >
                    {/* PHOTO THUMBNAIL */}
                    <View style={styles.visitorThumbBox}>
                      {v.photo_url ? (
                        <Image
                          source={{ uri: v.photo_url }}
                          style={styles.visitorThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.visitorThumbPlaceholder}>
                          <MaterialIcons name="person" size={24} color={colors.primary} />
                        </View>
                      )}
                    </View>

                    {/* DETAILS CENTER */}
                    <View style={styles.visitorCardCenter}>
                      <View style={styles.visitorNameRow}>
                        <Text style={styles.visitorName} numberOfLines={1}>
                          {v.visitor_name}
                        </Text>
                        <View
                          style={[
                            styles.categoryBadge,
                            {
                              backgroundColor:
                                v.category === 'Customer'
                                  ? '#E8F5E9'
                                  : v.category === 'Dealer'
                                  ? '#E3F2FD'
                                  : v.category === 'Supplier'
                                  ? '#FFF3E0'
                                  : '#F4F5F2',
                            },
                          ]}
                        >
                          <Text style={styles.categoryBadgeText}>{v.category}</Text>
                        </View>
                      </View>

                      {v.company_name ? (
                        <Text style={styles.visitorCompany} numberOfLines={1}>
                          🏢 {v.company_name}
                        </Text>
                      ) : null}

                      <Text style={styles.visitorPassText}>Pass: {v.pass_number}</Text>
                      <Text style={styles.visitorPhoneText}>📞 {v.mobile_number}</Text>

                      <View style={styles.timeRow}>
                        <Text style={styles.timeText}>
                          In: {formatIstTime(v.entry_time) || 'Today'}
                        </Text>
                        {v.exit_time && (
                          <Text style={styles.timeTextExit}>
                            • Out: {formatIstTime(v.exit_time)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* STATUS & ACTION RIGHT */}
                    <View style={styles.visitorCardRight}>
                      {isInside ? (
                        <>
                          <View style={styles.statusPillInside}>
                            <View style={styles.statusDotGreen} />
                            <Text style={styles.statusPillTextInside}>INSIDE</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.markExitBtn}
                            onPress={() => handleMarkExit(v)}
                            disabled={markingExitId === v.id}
                            activeOpacity={0.7}
                          >
                            {markingExitId === v.id ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <MaterialIcons name="logout" size={14} color="#FFFFFF" />
                                <Text style={styles.markExitBtnText}>Mark Exit</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.statusPillExited}>
                          <MaterialIcons name="check" size={14} color={colors.onSurfaceVariant} />
                          <Text style={styles.statusPillTextExited}>EXITED</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* VISITOR DETAILS MODAL */}
      <Modal
        visible={!!selectedVisitor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVisitor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, elevation.level3]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Visitor Gate Pass</Text>
                <Text style={styles.modalSub}>{selectedVisitor?.pass_number}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedVisitor(null)}
              >
                <MaterialIcons name="close" size={22} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* PHOTO PREVIEW IN MODAL */}
              {selectedVisitor?.photo_url && (
                <View style={styles.modalPhotoContainer}>
                  <Image
                    source={{ uri: selectedVisitor.photo_url }}
                    style={styles.modalPhoto}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* DETAILS GRID */}
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Visitor Name:</Text>
                <Text style={styles.modalDetailValue}>{selectedVisitor?.visitor_name}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Mobile Number:</Text>
                <Text style={styles.modalDetailValue}>+91 {selectedVisitor?.mobile_number}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Category:</Text>
                <Text style={styles.modalDetailValue}>{selectedVisitor?.category}</Text>
              </View>

              {selectedVisitor?.company_name && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Company / Firm:</Text>
                  <Text style={styles.modalDetailValue}>{selectedVisitor.company_name}</Text>
                </View>
              )}

              {selectedVisitor?.person_to_meet && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Person to Meet:</Text>
                  <Text style={styles.modalDetailValue}>{selectedVisitor.person_to_meet}</Text>
                </View>
              )}

              {selectedVisitor?.purpose_of_visit && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Purpose of Visit:</Text>
                  <Text style={styles.modalDetailValue}>{selectedVisitor.purpose_of_visit}</Text>
                </View>
              )}

              {selectedVisitor?.vehicle_number && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Vehicle Number:</Text>
                  <Text style={styles.modalDetailValue}>{selectedVisitor.vehicle_number}</Text>
                </View>
              )}

              {selectedVisitor?.address && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Address:</Text>
                  <Text style={styles.modalDetailValue}>{selectedVisitor.address}</Text>
                </View>
              )}

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Entry Timestamp:</Text>
                <Text style={styles.modalDetailValue}>
                  {formatIstDateTime(selectedVisitor?.entry_time)}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Exit Timestamp:</Text>
                <Text style={styles.modalDetailValue}>
                  {selectedVisitor?.exit_time
                    ? formatIstDateTime(selectedVisitor.exit_time)
                    : 'Still inside premises'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Status:</Text>
                <Text
                  style={[
                    styles.modalDetailValue,
                    {
                      color: selectedVisitor?.status === 'IN' ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {selectedVisitor?.status === 'IN' ? 'INSIDE PREMISES' : 'EXITED'}
                </Text>
              </View>

              {/* ACTION IN MODAL */}
              {selectedVisitor?.status === 'IN' && (
                <TouchableOpacity
                  style={[styles.submitButton, { marginTop: 24 }]}
                  onPress={() => handleMarkExit(selectedVisitor)}
                >
                  <MaterialIcons name="logout" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Mark Visitor Exit</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: 'bold' },
  headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  staffBadgeText: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryContainer,
  },
  tabText: { ...typography.labelMd, color: colors.onSurfaceVariant },
  tabTextActive: { color: colors.primary, fontWeight: 'bold' },
  insideCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  insideCountBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' },

  scrollContent: { padding: 16 },

  // Pass Preview Card
  passPreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passBrandText: { ...typography.labelSm, color: colors.primary, letterSpacing: 0.5 },
  inStatusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inStatusText: { fontSize: 10, color: colors.primary, fontWeight: 'bold' },
  passNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  passNumberLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  passNumberVal: { ...typography.headlineSm, color: colors.onSurface, fontWeight: 'bold' },
  passMeta: { ...typography.bodySm, color: colors.outline },

  // Banners
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  bannerError: { backgroundColor: colors.errorContainer },
  bannerSuccess: { backgroundColor: colors.primaryContainer },
  bannerText: { ...typography.bodyMd, flex: 1 },
  bannerTextError: { color: colors.onErrorContainer },
  bannerTextSuccess: { color: colors.onPrimaryContainer },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: 'bold' },
  requiredStar: { color: colors.error },

  // Photo
  photoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 8,
  },
  captureBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceContainerLow,
    gap: 8,
  },
  cameraIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  captureBtnSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  photoPreviewBox: { alignItems: 'center', gap: 12 },
  photoImage: { width: 140, height: 140, borderRadius: 12, backgroundColor: '#E0E0E0' },
  photoSuccessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  photoSuccessText: { fontSize: 11, color: '#FFFFFF', fontWeight: 'bold' },
  photoActionsRow: { flexDirection: 'row', gap: 12 },
  photoRetakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  photoRetakeText: { ...typography.labelMd, color: colors.primary },
  photoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  photoRemoveText: { ...typography.labelMd, color: colors.error },

  // Forms
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { ...typography.labelMd, color: colors.onSurface, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  mobilePrefix: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.onSurfaceVariant,
    marginRight: 8,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputError: { borderColor: colors.error, borderWidth: 1.5 },
  fieldErrorText: { ...typography.bodySm, color: colors.error, marginTop: 4 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  chipText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  chipTextSelected: { color: colors.primary, fontWeight: 'bold' },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
    elevation: 2,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...typography.labelLg, color: '#FFFFFF', fontWeight: 'bold' },

  // History Tab
  historyTopStrip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  metricItem: { alignItems: 'center' },
  metricLabel: { ...typography.bodySm, color: colors.outline },
  metricNumber: { ...typography.labelLg, fontWeight: 'bold' },

  historyList: { padding: 16 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 10 },
  loadingText: { ...typography.bodyMd, color: colors.outline },
  emptyBox: { padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: 'bold' },
  emptySub: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  emptyActionBtnText: { ...typography.labelMd, color: '#FFFFFF', fontWeight: 'bold' },

  visitorCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  visitorThumbBox: { marginRight: 12 },
  visitorThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E0E0E0' },
  visitorThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitorCardCenter: { flex: 1, gap: 2 },
  visitorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  visitorName: { ...typography.labelLg, color: colors.onSurface, fontWeight: 'bold', flex: 1 },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryBadgeText: { fontSize: 10, fontWeight: 'bold', color: colors.onSurface },
  visitorCompany: { ...typography.bodySm, color: colors.onSurfaceVariant },
  visitorPassText: { fontSize: 11, color: colors.outline, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  visitorPhoneText: { fontSize: 12, color: colors.onSurfaceVariant },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  timeTextExit: { fontSize: 11, color: colors.outline },

  visitorCardRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  statusPillInside: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  statusPillTextInside: { fontSize: 10, color: colors.primary, fontWeight: 'bold' },
  statusPillExited: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusPillTextExited: { fontSize: 10, color: colors.onSurfaceVariant, fontWeight: 'bold' },
  markExitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  markExitBtnText: { fontSize: 11, color: '#FFFFFF', fontWeight: 'bold' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  modalTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  modalSub: { ...typography.bodySm, color: colors.primary, fontWeight: '600' },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { padding: 16 },
  modalPhotoContainer: { alignItems: 'center', marginBottom: 16 },
  modalPhoto: { width: 180, height: 180, borderRadius: 12, backgroundColor: '#E0E0E0' },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  modalDetailLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  modalDetailValue: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});
