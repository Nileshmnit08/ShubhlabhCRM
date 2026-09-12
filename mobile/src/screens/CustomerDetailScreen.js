import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, AppState, Modal, PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';
import { TextInput as RNTextInput } from 'react-native';
import CallLogs from 'react-native-call-log';
import { supabase } from '../lib/supabase';
import { Phone, MessageCircle, Edit2, Navigation, AlertCircle, X, FilePlus2, CalendarPlus, Building2, MapPin, BadgeCheck, FileText, Truck, Clock, User, Landmark, IndianRupee, Hash, Activity, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../theme';
import Badge from '../components/Badge';
import ScreenHeader from '../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId } = route.params;
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [recentInteractions, setRecentInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // 'not_found' | 'query_error' | null

  // Post-call/WhatsApp outcome prompt
  const [showPostActionSheet, setShowPostActionSheet] = useState(false);
  const [pendingChannel, setPendingChannel] = useState(null); // 'Call' | 'WhatsApp'
  const appStateRef = useRef(AppState.currentState);

  // Tab state: 'overview' | 'requirements' | 'dispatch' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  // Update Modals State
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);


  useEffect(() => {
    fetchCustomerDetails();
    const unsubscribe = navigation.addListener('focus', fetchCustomerDetails);

    // AppState listener: detect when user returns from native dialer/WhatsApp
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        if (pendingChannel) {
          setShowPostActionSheet(true);
        }
      }
      appStateRef.current = nextState;
    });

    return () => { unsubscribe(); appStateSub.remove(); };
  }, [navigation, customerId, pendingChannel]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch from crm_parties
      // NOTE: app_users has no first_name/last_name — use display_name only.
      // The join alias 'rep:assigned_owner_id' follows Supabase FK-based join syntax.
      const { data: custData, error: custError } = await supabase
        .from('crm_parties')
        .select(`*, rep:assigned_owner_id(email, display_name)`)
        .eq('id', customerId)
        .single();

      if (custError) {
        // PostgREST PGRST116 = 0 rows returned (genuine not found or RLS blocked)
        if (custError.code === 'PGRST116') {
          console.warn('[CustomerDetail] Customer not returned for id:', customerId, '— may be RLS or not found.');
          setFetchError('not_found');
        } else {
          console.error('[CustomerDetail] Query error fetching crm_parties:', custError);
          setFetchError('query_error');
        }
        return; // Cannot proceed without the base customer record
      }

      if (custData) setCustomer(custData);

      // 2. Fetch financial data from v_customer_360
      const { data: finData } = await supabase
        .from('v_customer_360')
        .select('*')
        .eq('customer_id', customerId)
        .single();
      if (finData) setFinancials(finData);

      // 3. Fetch requirements — uses party_id (correct column in v_board_requirements)
      const { data: reqData } = await supabase
        .from('v_board_requirements')
        .select('*')
        .eq('party_id', customerId)
        .order('created_at', { ascending: false });
      if (reqData) setRequirements(reqData);

      // 4. Fetch follow-ups
      const { data: followUpData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('party_id', customerId)
        .eq('status', 'Pending')
        .order('follow_up_date', { ascending: true });
      if (followUpData) setFollowUps(followUpData);

      // 5. Fetch dispatches
      if (reqData && reqData.length > 0) {
        const reqIds = reqData.map(r => r.id);
        const { data: dispData } = await supabase
          .from('requirement_dispatches')
          .select('*')
          .in('requirement_id', reqIds)
          .order('dispatch_date', { ascending: false });
        if (dispData) setDispatches(dispData);
      }

      // 6. Fetch recent interactions (History tab)
      const { data: intData } = await supabase
        .from('interactions')
        .select('id, channel, interaction_type, outcome, note, created_at')
        .eq('party_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (intData) setRecentInteractions(intData);

    } catch (err) {
      console.error('[CustomerDetail] Unexpected error:', err);
      setFetchError('query_error');
    } finally {
      setLoading(false);
    }
  };

  
  const handleSaveMobile = async () => {
    if (!editMobile || editMobile.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('crm_parties')
        .update({ mobile: editMobile })
        .eq('id', customerId);
      if (error) throw error;
      setShowMobileModal(false);
      fetchCustomerDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to update mobile number.');
    } finally {
      setIsUpdating(false);
    }
  };

  const captureGpsLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission is required to auto-fill address.');
        setGpsLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync(location.coords);
      
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        setEditCity(place.city || place.subregion || '');
        setEditPincode(place.postalCode || '');
        if (place.region) {
          setEditState(place.region);
        }
      } else {
        alert('Could not determine address from location.');
      }
    } catch (error) {
      console.warn(error);
      alert('Failed to get location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!editAddress.trim() || !editCity.trim() || !editPincode.trim() || !editState.trim()) {
      alert('Please fill all required address fields.');
      return;
    }
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('crm_parties')
        .update({ 
          address_line_1: editAddress.trim(),
          city: editCity.trim(),
          state: editState.trim(),
          pincode: editPincode.trim()
        })
        .eq('id', customerId);
      if (error) throw error;
      setShowLocationModal(false);
      fetchCustomerDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to update location.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCall = () => {
    if (!customer?.mobile) {
      alert('No phone number available.');
      return;
    }
    setPendingChannel('Call');
    Linking.openURL(`tel:${customer.mobile}`);
  };

  const handleWhatsApp = () => {
    if (!customer?.mobile) {
      alert('No phone number available.');
      return;
    }
    setPendingChannel('WhatsApp');
    const cleanPhone = customer.mobile.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  const handleLogAction = () => {
    navigation.navigate('AddActivity', {
      partyId: customer.id,
      partyName: customer.display_name,
    });
  };

  const handlePostActionLog = async () => {
    const ch = pendingChannel;
    setPendingChannel(null);
    setShowPostActionSheet(false);
    
    let callNotes = '';
    
    if (ch === 'Call' && Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          {
            title: 'Call Log Permission',
            message: 'Access your call logs to automatically record call duration.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          const logs = await CallLogs.load(1);
          if (logs && logs.length > 0) {
            const lastCall = logs[0];
            callNotes = `Duration: ${lastCall.duration}s. Type: ${lastCall.type}.`;
          }
        }
      } catch (err) {
        console.warn('Failed to read call log', err);
      }
    }

    navigation.navigate('AddActivity', {
      partyId: customer.id,
      partyName: customer.display_name,
      presetChannel: ch,
      prefillNotes: callNotes
    });
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'requirements', label: `Requirements (${requirements.length})` },
      { id: 'dispatch', label: `Dispatch (${dispatches.length})` },
      { id: 'history', label: `History (${recentInteractions.length})` }
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  if (loading && !customer) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  if (!customer) {
    const isQueryError = fetchError === 'query_error';
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>
          {isQueryError
            ? 'Unable to load customer. Please check your connection and try again.'
            : 'Customer not found or you do not have access to this record.'}
        </Text>
        <TouchableOpacity onPress={fetchCustomerDetails} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.secondary, fontWeight: '600', fontSize: 14 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 'rep' is the FK-joined app_users record (display_name or email)
  const assignedRep = customer.rep
    ? (customer.rep.display_name || customer.rep.email || 'Unassigned')
    : 'Unassigned';

  const creditLimit = financials?.crm_credit_limit_amount || 0;
  const outstanding = financials?.crm_credit_outstanding_amount || 0;
  const creditUtil = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
  const creditAvailable = Math.max(0, creditLimit - outstanding);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customer Profile Detail" showBack={true} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Customer Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{customer.id.substring(0, 8).toUpperCase()}</Text>
                </View>
                {customer.status === 'Active' ? (
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusBadgeText}>Active • {customer.party_type}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.customerName}>{customer.display_name}</Text>
            </View>
            <View style={styles.companyIcon}>
              <Building2 size={24} color={theme.colors.secondary} />
            </View>
          </View>

          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <User size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.contactName}>Primary Contact</Text>
            </View>
            <View style={[styles.contactRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Phone size={16} color={theme.colors.secondary} />
                {customer.mobile ? (
                  <Text style={styles.contactValuePhone} onPress={handleCall}>{customer.mobile}</Text>
                ) : (
                  <Text style={[styles.contactValueLoc, { marginLeft: 8, fontStyle: 'italic', color: theme.colors.error }]}>Mobile not available</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.editBtn} 
                onPress={() => {
                  setEditMobile(customer.mobile || '');
                  setShowMobileModal(true);
                }}
              >
                <Edit2 size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.editBtnText}>{customer.mobile ? 'Edit' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.repRow}>
            <View style={styles.repBadge}>
              <BadgeCheck size={14} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={styles.repText}>Rep: <Text style={styles.repTextBold}>{assignedRep}</Text></Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.tallyText}>Tally Synced</Text>
          </View>
        </View>


        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationTitleRow}>
              <MapPin size={20} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => {
                setEditAddress(customer.address_line_1 || customer.billing_address || '');
                setEditCity(customer.city || '');
                setEditState(customer.state || '');
                setEditPincode(customer.pincode || '');
                setShowLocationModal(true);
              }}
            >
              <Edit2 size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.editBtnText}>{customer.city || customer.address_line_1 ? 'Update Location' : 'Add Location'}</Text>
            </TouchableOpacity>
          </View>
          {customer.city || customer.address_line_1 ? (
            <Text style={styles.locationDetails}>
              {[customer.address_line_1, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
            </Text>
          ) : (
            <Text style={[styles.locationDetails, styles.errorLocText]}>Location not available</Text>
          )}
        </View>

        {/* Quick Action Launchpad */}
        <View style={styles.launchpadGrid}>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.primary }]} onPress={handleCall}>
            <Phone size={20} color={theme.colors.onPrimary} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onPrimary }]}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.surfaceContainer }]} onPress={handleWhatsApp}>
            <MessageCircle size={20} color={theme.colors.onTertiaryContainer} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onTertiaryContainer }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={() => navigation.navigate('AddRequirement', { partyId: customer.id, partyName: customer.display_name })}>
            <FilePlus2 size={20} color={theme.colors.secondary} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onSurface }]}>+ Req</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={() => navigation.navigate('AddFollowUp', { partyId: customer.id, partyName: customer.display_name })}>
            <CalendarPlus size={20} color={theme.colors.secondary} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onSurface }]}>+ Follow-up</Text>
          </TouchableOpacity>
        </View>

        {renderTabs()}

        {/* CRM Financial Vitals */}
        {activeTab === 'overview' && (
          <View style={styles.financialCard}>
            <View style={styles.financialHeader}>
              <Landmark size={20} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>CRM Vital Snapshot</Text>
            </View>

            <View style={styles.financialGrid}>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>GSTIN</Text>
                <Text style={styles.finValue}>{customer.gstin || 'UNREGISTERED'}</Text>
              </View>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>CREDIT TERMS</Text>
                <Text style={styles.finValue}>{financials?.crm_credit_days ? `${financials.crm_credit_days} Days` : 'N/A'}</Text>
              </View>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>CREDIT LIMIT</Text>
                <Text style={styles.finValue}>{formatCurrency(creditLimit)}</Text>
              </View>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>OUTSTANDING</Text>
                <Text style={[styles.finValue, { color: theme.colors.secondary }]}>{formatCurrency(outstanding)}</Text>
              </View>
            </View>

            <View style={styles.creditBarContainer}>
              <View style={styles.creditBarLabels}>
                <Text style={styles.creditUtilText}>Credit Utilization ({creditUtil.toFixed(1)}%)</Text>
                <Text style={styles.creditAvailText}>{formatCurrency(creditAvailable)} Available</Text>
              </View>
              <View style={styles.creditBarTrack}>
                <View style={[styles.creditBarFill, { width: `${Math.min(100, creditUtil)}%` }]} />
              </View>
            </View>
          </View>
        )}

        {/* Dynamic Lists based on tabs */}
        {(activeTab === 'overview' || activeTab === 'requirements') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FileText size={20} color={theme.colors.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Open & Recent Requirements</Text>
              </View>
            </View>
            {requirements.length === 0 ? (
              <Text style={styles.emptyText}>No requirements logged.</Text>
            ) : (
              requirements.map(req => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.reqCard}
                  onPress={() => navigation.navigate('RequirementDetail', {
                    requirementId: req.id,
                    partyName: customer.display_name,
                  })}
                  activeOpacity={0.8}
                >
                  <View style={styles.reqHeader}>
                    <Text style={styles.reqId}>REQ-{req.id.substring(0, 6).toUpperCase()}</Text>
                    <Badge label={req.status} status={req.status === 'Open' ? 'warning' : 'success'} />
                  </View>
                  <Text style={styles.reqTitle}>{req.required_quantity} {req.unit} {req.product_type}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Dispatch Tab */}
        {activeTab === 'dispatch' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Truck size={20} color={theme.colors.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Dispatches</Text>
              </View>
            </View>
            {dispatches.length === 0 ? (
              <Text style={styles.emptyText}>No dispatches recorded for this customer.</Text>
            ) : (
              dispatches.map(d => {
                const dStatus = d.status || 'Dispatched';
                const dBadge = dStatus === 'Dispatched' ? 'info' : dStatus === 'Delivered' ? 'success' : dStatus === 'Delayed' ? 'warning' : dStatus === 'Cancelled' ? 'error' : 'default';
                const dDate = d.dispatch_date
                  ? new Date(d.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.reqCard}
                    onPress={() => navigation.navigate('DispatchDetail', {
                      dispatchId: d.id,
                      partyName: customer.display_name,
                    })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reqHeader}>
                      <Text style={styles.reqId}>DSP-{d.id.substring(0, 6).toUpperCase()}</Text>
                      <Badge label={dStatus} status={dBadge} />
                    </View>
                    <Text style={styles.reqTitle}>
                      {d.quantity} {d.unit}{d.truck_number ? ` · ${d.truck_number}` : ''}
                    </Text>
                    <Text style={[styles.emptyText, { marginTop: 2 }]}>{dDate}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
        {/* History Tab */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Activity size={20} color={theme.colors.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ActivityList', { partyId: customer.id, partyName: customer.display_name })}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentInteractions.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Activity size={32} color={theme.colors.outlineVariant} />
                <Text style={styles.emptyText}>No activity recorded yet for this customer.</Text>
              </View>
            ) : (
              recentInteractions.map(item => {
                const ch = item.channel || item.interaction_type || 'Note';
                const chColor = ch === 'Call' ? theme.colors.primary : ch === 'WhatsApp' ? '#25D366' : theme.colors.secondary;
                const timeStr = item.created_at
                  ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                const Icon = ch === 'Call' ? Phone : ch === 'WhatsApp' ? MessageCircle : ch === 'Meeting' ? User : FileText;
                return (
                  <View key={item.id} style={styles.activityCard}>
                    <View style={[styles.activityIconBox, { backgroundColor: chColor + '18' }]}>
                      <Icon size={18} color={chColor} />
                    </View>
                    <View style={styles.activityBody}>
                      <View style={styles.activityTopRow}>
                        <Text style={styles.activityChannel}>{ch}</Text>
                        {item.outcome ? (
                          <Text style={styles.activityOutcome}>{item.outcome}</Text>
                        ) : null}
                      </View>
                      {item.note ? <Text style={styles.activityNote} numberOfLines={1}>{item.note}</Text> : null}
                      <Text style={styles.activityTime}>{timeStr}</Text>
                    </View>
                  </View>
                );
              })
            )}

            {recentInteractions.length >= 5 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('ActivityList', { partyId: customer.id, partyName: customer.display_name })}
              >
                <Text style={styles.viewAllBtnText}>View Full Activity History</Text>
                <ArrowRight size={16} color={theme.colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      {/* Persistent Floating Tactical Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockInner}>
          <TouchableOpacity style={styles.dockBtnPrimary} onPress={handleCall}>
            <Phone size={20} color={theme.colors.onPrimary} />
            <Text style={styles.dockBtnPrimaryText}>Call {customer.display_name.split(' ')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dockBtnIcon} onPress={handleWhatsApp}>
            <MessageCircle size={24} color={theme.colors.onTertiaryContainer} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dockBtnSecondary} onPress={handleLogAction}>
            <FilePlus2 size={20} color={theme.colors.onSecondary} />
            <Text style={styles.dockBtnSecondaryText}>Log Action</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Post-Call / Post-WhatsApp Outcome Prompt */}
      <Modal
        visible={showPostActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowPostActionSheet(false); setPendingChannel(null); }}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => { setShowPostActionSheet(false); setPendingChannel(null); }}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {pendingChannel === 'Call' ? 'Record Call Outcome' : 'Record WhatsApp Outcome'}
            </Text>
            <Text style={styles.sheetSubtitle}>
              What happened on this {pendingChannel}? Logging it keeps your CRM up to date.
            </Text>
            <TouchableOpacity style={styles.sheetPrimary} onPress={handlePostActionLog}>
              <Text style={styles.sheetPrimaryText}>Log This {pendingChannel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetSecondary}
              onPress={() => { setShowPostActionSheet(false); setPendingChannel(null); }}
            >
              <Text style={styles.sheetSecondaryText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    
      {/* Mobile Number Modal */}
      <Modal visible={showMobileModal} transparent animationType="fade" onRequestClose={() => setShowMobileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Mobile Number</Text>
              <TouchableOpacity onPress={() => setShowMobileModal(false)}>
                <X size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Primary Mobile Number</Text>
              <RNTextInput
                style={styles.textInput}
                placeholder="10 digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={editMobile}
                onChangeText={(v) => setEditMobile(v.replace(/[^0-9]/g, ''))}
              />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveMobile} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="fade" onRequestClose={() => setShowLocationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.gpsBtn} onPress={captureGpsLocation} disabled={gpsLoading}>
              {gpsLoading ? <ActivityIndicator color={theme.colors.secondary} size="small" /> : <Navigation size={18} color={theme.colors.secondary} />}
              <Text style={styles.gpsBtnText}>{gpsLoading ? 'Acquiring GPS Fix...' : 'Use Current Location'}</Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line (Shop / Plot)</Text>
                <RNTextInput style={styles.textInput} value={editAddress} onChangeText={setEditAddress} />
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>City</Text>
                  <RNTextInput style={styles.textInput} value={editCity} onChangeText={setEditCity} />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Pincode</Text>
                  <RNTextInput style={styles.textInput} value={editPincode} onChangeText={setEditPincode} keyboardType="numeric" maxLength={6} />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>State</Text>
                <RNTextInput style={styles.textInput} value={editState} onChangeText={setEditState} />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveLocation} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: theme.spacing['screen-edge'] },
  modalContent: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg, ...theme.shadows.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.typography.sizes.titleLg, fontWeight: '700', color: theme.colors.onSurface },
  inputGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: theme.typography.sizes.labelMd, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 },
  textInput: { height: 48, backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, paddingHorizontal: theme.spacing.md, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface },
  primaryBtn: { height: 48, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  primaryBtnText: { color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  gpsBtn: { height: 48, backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  gpsBtnText: { fontSize: theme.typography.sizes.labelMd, fontWeight: '600', color: theme.colors.secondary, marginLeft: 8 },
  row: { flexDirection: 'row' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.borders.radius.full, backgroundColor: theme.colors.surfaceContainerHigh, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600' },
  locationCard: { backgroundColor: theme.colors.surfaceContainerLowest, marginHorizontal: theme.spacing['screen-edge'], padding: theme.spacing.lg, borderRadius: theme.borders.radius.lg, ...theme.shadows.sm, marginBottom: theme.spacing.lg },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationDetails: { fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, lineHeight: 20 },
  errorLocText: { color: theme.colors.error, fontStyle: 'italic' },

  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: theme.colors.error, fontWeight: '600' },

  identityCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    margin: theme.spacing['screen-edge'],
    padding: theme.spacing.lg,
    borderRadius: theme.borders.radius.lg,
    ...theme.shadows.md,
  },
  identityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  idBadge: { backgroundColor: theme.colors.surfaceContainerHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: theme.borders.radius.full, marginRight: 8 },
  idBadgeText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary, marginRight: 4 },
  statusBadgeText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: '600' },
  customerName: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineLg, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  companyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },

  contactCard: { backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  contactName: { fontSize: theme.typography.sizes.titleMd, fontWeight: '600', color: theme.colors.onSurface, marginLeft: 8 },
  contactValuePhone: { fontSize: theme.typography.sizes.bodyLg, color: theme.colors.onSurface, fontWeight: '600', marginLeft: 8, textDecorationLine: 'underline' },
  contactValueLoc: { fontSize: theme.typography.sizes.bodySm, color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 },

  repRow: { flexDirection: 'row', alignItems: 'center' },
  repBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  repText: { fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant },
  repTextBold: { color: theme.colors.onSurface, fontWeight: '600' },
  tallyText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: '600', textTransform: 'uppercase' },

  launchpadGrid: { flexDirection: 'row', paddingHorizontal: theme.spacing['screen-edge'], gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  launchpadBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: theme.borders.radius.md, ...theme.shadows.sm },
  launchIcon: { marginBottom: 4 },
  launchpadText: { fontSize: theme.typography.sizes.labelSm, fontWeight: '600' },

  tabContainer: { paddingHorizontal: theme.spacing['screen-edge'], paddingVertical: 8, gap: 8, marginBottom: 8 },
  tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borders.radius.full },
  tabButtonActive: { backgroundColor: theme.colors.primary },
  tabButtonInactive: { backgroundColor: theme.colors.surfaceContainer },
  tabText: { fontSize: theme.typography.sizes.labelMd, fontWeight: '600' },
  tabTextActive: { color: theme.colors.onPrimary },
  tabTextInactive: { color: theme.colors.onSurfaceVariant },

  financialCard: { backgroundColor: theme.colors.surfaceContainerLowest, marginHorizontal: theme.spacing['screen-edge'], padding: theme.spacing.lg, borderRadius: theme.borders.radius.lg, ...theme.shadows.sm, marginBottom: theme.spacing.lg },
  financialHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: '700', color: theme.colors.onSurface, marginLeft: 8 },
  financialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  finCell: { width: '48%', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: 12 },
  finLabel: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600', marginBottom: 4 },
  finValue: { fontSize: theme.typography.sizes.bodyLg, color: theme.colors.onSurface, fontWeight: '600', fontFamily: 'monospace' },
  creditBarContainer: { marginTop: 4 },
  creditBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  creditUtilText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },
  creditAvailText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurface, fontWeight: '600' },
  creditBarTrack: { height: 8, backgroundColor: theme.colors.surfaceContainer, borderRadius: 4, overflow: 'hidden' },
  creditBarFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 4 },

  section: { paddingHorizontal: theme.spacing['screen-edge'], marginBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  emptyText: { color: theme.colors.onSurfaceVariant, fontStyle: 'italic', fontSize: theme.typography.sizes.bodyMd },

  reqCard: { backgroundColor: theme.colors.surfaceContainerLowest, padding: theme.spacing.lg, borderRadius: theme.borders.radius.lg, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reqId: { fontSize: theme.typography.sizes.labelMd, fontWeight: '600', color: theme.colors.onSurface },
  reqTitle: { fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,249,255,0.95)', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'], zIndex: 100 },
  dockInner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dockBtnPrimary: { flex: 1, height: 48, backgroundColor: theme.colors.primary, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dockBtnPrimaryText: { color: theme.colors.onPrimary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  dockBtnIcon: { width: 48, height: 48, backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center' },
  dockBtnSecondary: { flex: 1, height: 48, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dockBtnSecondaryText: { color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },

  // History tab styles
  emptyActivity: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: 10 },
  viewAllText: { fontSize: theme.typography.sizes.labelMd, color: theme.colors.secondary, fontWeight: '600' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: theme.spacing.md, marginTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  viewAllBtnText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.secondary, fontWeight: '600' },
  activityCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  activityIconBox: { width: 36, height: 36, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md, flexShrink: 0 },
  activityBody: { flex: 1 },
  activityTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  activityChannel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.titleSm, fontWeight: '700', color: theme.colors.onSurface },
  activityOutcome: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: '600', backgroundColor: theme.colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  activityNote: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodySm, color: theme.colors.onSurfaceVariant, marginBottom: 3 },
  activityTime: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.outlineVariant },

  // Post-action modal sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,28,48,0.45)' },
  sheet: { backgroundColor: theme.colors.surfaceContainerLowest, borderTopLeftRadius: theme.borders.radius.lg, borderTopRightRadius: theme.borders.radius.lg, padding: theme.spacing.xl, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: 'center', marginBottom: theme.spacing.lg },
  sheetTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface, textAlign: 'center', marginBottom: theme.spacing.sm },
  sheetSubtitle: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.xl },
  sheetPrimary: { height: 48, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  sheetPrimaryText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  sheetSecondary: { height: 48, borderRadius: theme.borders.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  sheetSecondaryText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onSurfaceVariant, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
});
