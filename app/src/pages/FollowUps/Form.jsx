import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Search } from 'lucide-react';
import { LanguageContext } from '../../LanguageContext';
import { AuthContext } from '../../AuthContext';

export default function FollowUpForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const { userProfile } = useContext(AuthContext);
  const isAdmin = userProfile?.role === 'Admin';
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [manualNextDate, setManualNextDate] = useState('');
  
  // Searchable Dropdown States
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [existingPendingFollowUps, setExistingPendingFollowUps] = useState([]);
  
  const [mobileStatus, setMobileStatus] = useState('idle'); // idle | loading | missing | viewing | editing | saving | error
  const [mobileInput, setMobileInput] = useState('');
  const [customerMobileFromDb, setCustomerMobileFromDb] = useState('');
  const [mobileValidationError, setMobileValidationError] = useState('');

  const normalizeMobile = (val) => {
    if (!val) return '';
    let cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  };

  const validateMobile = (val) => {
    const norm = normalizeMobile(val);
    return /^[6-9]\d{9}$/.test(norm);
  };
  
  const getNextActionConfig = (outcome, followUpType) => {
    if (followUpType === 'Lead' || followUpType === 'Reactivation') {
       switch (outcome) {
         case 'Interested': return { days: 'manual', reason: `${followUpType} Follow-up (Interested)`, type: followUpType, priority: 'High' };
         case 'Call later': return { days: 'manual', reason: `${followUpType} Follow-up (Call Later)`, type: followUpType, priority: 'Normal' };
         case 'No response': return { days: 1, reason: `${followUpType} Follow-up (No Response)`, type: followUpType, priority: 'Normal' };
         case 'Contacted': return { days: 'manual', reason: `${followUpType} Follow-up`, type: followUpType, priority: 'Normal' };
         default: return null;
       }
    } else if (followUpType === 'Commercial') {
       switch (outcome) {
         case 'Quotation Sent': return { days: 2, reason: 'Follow-up on Quotation', type: 'Commercial', priority: 'High' };
         case 'Order Intention Confirmed': return { days: 'manual', reason: 'Awaiting Tally Sync / Payment', type: 'Commercial', priority: 'High' };
         case 'Delayed': return { days: 'manual', reason: 'Commercial Follow-up (Delayed)', type: 'Commercial', priority: 'Normal' };
         case 'No response': return { days: 1, reason: 'Commercial Follow-up (No Response)', type: 'Commercial', priority: 'Normal' };
         case 'Lost': return { days: 0, reason: null, type: 'Commercial', priority: 'Normal' }; // Terminal
         default: return null;
       }
    } else if (followUpType === 'Retention') {
       switch (outcome) {
         case 'Order placed': return { days: 0, reason: null, type: 'Retention', priority: 'Normal' };
         case 'Not ready yet': return { days: 15, reason: 'Follow-up on Restock', type: 'Retention', priority: 'Normal' };
         case 'Follow-up later': return { days: 'manual', reason: 'Follow-up on Restock', type: 'Retention', priority: 'Normal' };
         case 'No response': return { days: 1, reason: 'Retention Follow-up (No Response)', type: 'Retention', priority: 'Normal' };
         case 'Lost to competitor': return { days: 0, reason: null, type: 'Retention', priority: 'Normal' };
         default: return null;
       }
    } else {
       switch (outcome) {
         case 'Sending payment today': return { days: 1, reason: 'Verify Payment Received', type: 'Payment', priority: 'Normal' };
         case 'Payment within 2 days': return { days: 2, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Payment within 3 to 5 days': return { days: 4, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Payment next week': return { days: 7, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Payment next month': return { days: 30, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Part payment today': return { days: 'manual', reason: 'Follow-up on Remaining Balance', type: 'Payment', priority: 'Normal' };
         case 'Not picking phone': return { days: 1, reason: 'Payment Follow-up (No Answer)', type: 'Payment', priority: 'Normal' };
         case 'Phone not reachable': return { days: 1, reason: 'Payment Follow-up (Unreachable)', type: 'Payment', priority: 'Normal' };
         case 'Call later': return { days: 'manual', reason: 'Payment Follow-up (Call Later)', type: 'Payment', priority: 'Normal' };
         case 'Cash problem': return { days: 'manual', reason: 'Payment Follow-up (Cash Problem)', type: 'Payment', priority: 'Normal' };
         case 'Market down': return { days: 'manual', reason: 'Payment Follow-up (Market Down)', type: 'Payment', priority: 'Normal' };
         case 'Payment stuck in market': return { days: 'manual', reason: 'Payment Follow-up (Payment Stuck)', type: 'Payment', priority: 'Normal' };
         case 'Follow-up later': return { days: 'manual', reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Customer asking for statement': return { days: 0, reason: 'Provide Account Statement', type: 'General', priority: 'Normal' };
         case 'Customer asking for ledger': return { days: 0, reason: 'Provide Account Ledger', type: 'General', priority: 'Normal' };
         case 'Wants to talk to senior staff': return { days: 0, reason: 'ESCALATION: Talk to Senior', type: 'General', priority: 'High' };
         case 'Wants to talk to owner': return { days: 0, reason: 'ESCALATION: Talk to Owner', type: 'General', priority: 'High' };
         default: return null;
       }
    }
  };
  
  const [formData, setFormData] = useState({
    party_id: '',
    reason: '',
    follow_up_reason: '',
    custom_reason: '',
    notes: '',
    due_at: '',
    priority: 'Normal',
    assigned_to: '',
    reminder_at: '',
    status: 'Pending',
    follow_up_type: 'General',
    outcome_category: '',
    sequence_id: '',
    sequence_step_number: ''
  });

  const predefinedReasons = [
    "Follow-up for Payment",
    "Payment Commitment",
    "Order Follow-up",
    "Price / Quotation",
    "Product Inquiry",
    "Product Demonstration",
    "Sample Dispatch",
    "Complaint",
    "Meeting / Visit",
    "Callback Requested",
    "Document / Ledger Required",
    "Other / Custom Reason"
  ];
  const [reasonSearch, setReasonSearch] = useState('');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);

  // Speech-to-Text States
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [speechError, setSpeechError] = useState('');
  const [recognition, setRecognition] = useState(null);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognition) {
        recognition.stop();
      }
      return;
    }
    
    setSpeechError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser. Please type your note.');
      return;
    }
    
    try {
      const rec = new SpeechRecognition();
      rec.lang = speechLang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      
      rec.onstart = () => {
        setIsListening(true);
      };
      
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setFormData(prev => ({
          ...prev,
          notes: prev.notes ? `${prev.notes} ${transcript}` : transcript
        }));
      };
      
      rec.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission is required for voice input. You can enable it in browser settings or type manually.');
        } else if (event.error !== 'aborted') {
          setSpeechError('Could not transcribe. Please try again or type manually.');
        }
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(rec);
      rec.start();
    } catch (err) {
      console.error(err);
      setSpeechError('Could not start microphone.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      if (id) {
        const { data: fData, error } = await supabase.from('follow_ups').select('*, crm_parties(id, display_name, mobile)').eq('id', id).single();
        if (error) throw error;
        
        if (fData.crm_parties) {
           setSelectedCustomer(fData.crm_parties);
           setCustomerSearch(fData.crm_parties.display_name);
        }
        
        // Format dates for local datetime-local input
        const formatForInput = (isoString) => {
          if (!isoString) return '';
          const d = new Date(isoString);
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        };

        let initialReason = fData.follow_up_reason;
        let initialCustom = fData.custom_reason || '';
        
        // Backward compatibility
        if (!initialReason && fData.reason) {
          if (predefinedReasons.includes(fData.reason)) {
             initialReason = fData.reason;
          } else {
             initialReason = 'Other / Custom Reason';
             initialCustom = fData.reason;
          }
        }

        setFormData({
          party_id: fData.party_id || '',
          reason: fData.reason || '',
          follow_up_reason: initialReason || '',
          custom_reason: initialCustom,
          notes: fData.notes || '',
          due_at: formatForInput(fData.due_at) || formatForInput(fData.follow_up_date),
          priority: fData.priority || 'Normal',
          assigned_to: fData.assigned_to || '',
          reminder_at: formatForInput(fData.reminder_at),
          status: fData.status || 'Pending',
          follow_up_type: fData.follow_up_type || 'General',
          outcome_category: fData.outcome_category || '',
          sequence_id: fData.sequence_id || '',
          sequence_step_number: fData.sequence_step_number || ''
        });
        setReasonSearch(initialReason || '');
      } else {
        // Auto-assign to current user if new
        const { data: session } = await supabase.auth.getSession();
        
        const prefillParty = searchParams.get('party_id');
        const prefillReason = searchParams.get('reason');
        const prefillType = searchParams.get('follow_up_type');
        
        if (prefillParty) {
           const { data: cData } = await supabase.from('crm_parties').select('id, display_name, mobile').eq('id', prefillParty).single();
           if (cData) {
             setSelectedCustomer(cData);
             setCustomerSearch(cData.display_name);
           }
        }
        
        setFormData(prev => ({ 
          ...prev, 
          assigned_to: searchParams.get('assigned_to') || session?.session?.user?.id || '',
          party_id: prefillParty || '',
          reason: prefillReason || '',
          follow_up_reason: prefillReason || '',
          follow_up_type: prefillType || 'General'
        }));
        setReasonSearch(prefillReason || '');
      }
    } catch (err) {
      console.error(err);
      alert(t('msg.error'));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (fetching || !formData.party_id) return;
    
    let isActive = true;
    setMobileStatus('loading');
    setMobileValidationError('');
    
    // Instant populate if available in the dropdown data to prevent lag
    const match = selectedCustomer;
    let foundValidLocal = false;
    if (match && (match.mobile || match.mobile_number || match.phone || match.phone_number)) {
      const m = match.mobile ?? match.mobile_number ?? match.phone ?? match.phone_number ?? "";
      const normalized = normalizeMobile(m);
      if (validateMobile(normalized)) {
        setCustomerMobileFromDb(normalized);
        setMobileInput(normalized);
        setMobileStatus('viewing');
        foundValidLocal = true;
      }
    }
    
    const fetchMobile = async () => {
      try {
        const { data: customer, error } = await supabase
          .from('crm_parties')
          .select('*')
          .eq('id', formData.party_id)
          .single();
          
        if (error) throw error;
        
        if (isActive && customer) {
          const m = customer.mobile ?? customer.mobile_number ?? customer.phone ?? customer.phone_number ?? "";
          const normalized = normalizeMobile(m);
          if (validateMobile(normalized)) {
            setCustomerMobileFromDb(normalized);
            setMobileInput(normalized);
            setMobileStatus('viewing');
          } else {
            setCustomerMobileFromDb('');
            setMobileInput('');
            setMobileStatus('missing');
          }
        }
        
        if (isActive && !id) {
           const { data: pendingFUs } = await supabase
              .from('follow_ups')
              .select('*')
              .eq('party_id', formData.party_id)
              .eq('status', 'Pending');
           setExistingPendingFollowUps(pendingFUs || []);
        }
      } catch (err) {
        console.error("Error fetching customer mobile:", err);
        if (isActive && !foundValidLocal) {
           setMobileStatus('error');
        }
      }
    };
    
    fetchMobile();
    
    return () => { isActive = false; };
  }, [formData.party_id, fetching, selectedCustomer]);

  // Handle Search Debounce
  useEffect(() => {
    if (!customerSearch || selectedCustomer?.display_name === customerSearch) {
      setCustomerOptions([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const query = customerSearch.trim();
        const { data } = await supabase
          .from('v_customer_master')
          .select('id, display_name, mobile, crm_status')
          .or(`display_name.ilike.%${query}%,mobile.ilike.%${query}%`)
          .limit(50);
        
        setCustomerOptions(data || []);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch, selectedCustomer]);

  const handleSaveMobile = async () => {
    setMobileValidationError('');
    const normalized = normalizeMobile(mobileInput);
    
    if (!validateMobile(normalized)) {
      setMobileValidationError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    
    setMobileStatus('saving');
    
    try {
      const { error } = await supabase
        .from('crm_parties')
        .update({ mobile: normalized })
        .eq('id', formData.party_id);
        
      if (error) throw error;
      
      logActivity({
        module: 'Customers',
        actionType: 'UPDATED',
        entityType: 'crm_parties',
        entityId: formData.party_id,
        summary: `Updated mobile number from New Follow-up page: ${customerMobileFromDb || 'None'} -> ${normalized}`
      });
      
      setCustomerMobileFromDb(normalized);
      setMobileInput(normalized);
      setMobileStatus('viewing');
      
      // Update selected customer cache
      if (selectedCustomer) {
        setSelectedCustomer({ ...selectedCustomer, mobile: normalized });
      }
      
      alert(customerMobileFromDb ? 'Customer mobile number updated successfully.' : 'Customer mobile number added successfully.');
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        setMobileValidationError('This mobile number is already registered to another customer.');
        setMobileStatus('editing'); // leave input open for correction
      } else {
        setMobileStatus('error');
        alert('Failed to save mobile number. Please try again.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.party_id) {
       alert("Please select a customer.");
       return;
    }
    
    if (mobileStatus === 'missing' || mobileStatus === 'editing' || mobileStatus === 'error' || mobileStatus === 'saving') {
       alert("Please add and save a valid mobile number for the selected customer before creating this follow-up.");
       return;
    }
    
    if ((formData.follow_up_type === 'Payment' || formData.follow_up_type === 'Lead' || formData.follow_up_type === 'Reactivation' || formData.follow_up_type === 'Commercial' || formData.follow_up_type === 'Retention') && formData.status === 'Completed' && !formData.outcome_category) {
       alert("Please select an Outcome before completing the task.");
       return;
    }
    
    const config = getNextActionConfig(formData.outcome_category, formData.follow_up_type);
    if (id && formData.status === 'Completed' && config?.days === 'manual' && !manualNextDate) {
       alert("Next follow-up date is required for this outcome.");
       return;
    }
    
    if (!formData.follow_up_reason) {
      alert("Follow-up Reason is required.");
      return;
    }
    
    if (formData.follow_up_reason === 'Other / Custom Reason' && !formData.custom_reason) {
      alert("Please specify the custom reason.");
      return;
    }
    
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
        
      const toISO = (localStr) => localStr ? new Date(localStr).toISOString() : null;
      const cleanEmpty = (val) => val === '' ? null : val;
      
      const finalReason = formData.follow_up_reason === 'Other / Custom Reason' ? formData.custom_reason : formData.follow_up_reason;
      
      const payload = {
        ...formData,
        reason: finalReason,
        due_at: toISO(formData.due_at),
        reminder_at: toISO(formData.reminder_at),
        assigned_to: cleanEmpty(formData.assigned_to),
        sequence_id: cleanEmpty(formData.sequence_id),
        sequence_step_number: cleanEmpty(formData.sequence_step_number),
        outcome_category: cleanEmpty(formData.outcome_category)
      };

      if (id) {
        const { error } = await supabase.from('follow_ups').update(payload).eq('id', id);
        if (error) throw error;
        
        logActivity({
          module: 'FollowUps',
          actionType: 'UPDATED',
          entityType: 'follow_ups',
          entityId: id,
          summary: `Updated follow-up: ${payload.reason}`
        });

        alert(t('msg.updateSuccess'));
      } else {
        payload.created_by = session?.session?.user?.id || null;
        
        const { data, error } = await supabase.from('follow_ups').insert(payload).select();
        if (error) throw error;

        logActivity({
          module: 'FollowUps',
          actionType: 'CREATED',
          entityType: 'follow_ups',
          entityId: data[0].id,
          summary: `Created follow-up: ${payload.reason}`
        });

        alert(t('msg.createSuccess'));
      }
      
      // SEQUENCE AUTOMATION
      let didSequenceAutomation = false;
      if (id && (formData.status === 'Completed' || formData.status === 'Skipped') && formData.sequence_id) {
         const { data: nextStep } = await supabase.from('crm_sequence_steps')
           .select('*')
           .eq('sequence_id', formData.sequence_id)
           .eq('step_number', Number(formData.sequence_step_number) + 1)
           .single();
           
         if (nextStep) {
            didSequenceAutomation = true;
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + nextStep.delay_days);
            const nextDateISO = nextDate.toISOString();
            
            const nextTaskPayload = {
               party_id: formData.party_id,
               reason: `[Seq ${nextStep.step_number}] ${nextStep.reason_template} (${nextStep.action_type})`,
               follow_up_date: nextDateISO,
               due_at: nextDateISO,
               priority: 'Normal',
               follow_up_type: 'General',
               status: 'Pending',
               assigned_to: formData.assigned_to,
               created_by: session?.session?.user?.id || null,
               sequence_id: formData.sequence_id,
               sequence_step_number: nextStep.step_number
            };
            
            // Duplicate Prevention
            const { data: existingPending } = await supabase.from('follow_ups')
              .select('id')
              .eq('party_id', formData.party_id)
              .eq('status', 'Pending')
              .eq('sequence_id', formData.sequence_id);
              
            if (!existingPending || existingPending.length === 0) {
               await supabase.from('follow_ups').insert(nextTaskPayload);
               logActivity({
                 module: 'FollowUps', actionType: 'CREATED', entityType: 'follow_ups', entityId: id,
                 summary: `Sequence advanced: Scheduled step ${nextStep.step_number}`
               });
            }
         }
      }
      
      // NEXT ACTION AUTOMATION (Legacy, only if not handled by Sequence)
      if (id && formData.status === 'Completed' && config && !didSequenceAutomation) {
        let nextDateISO = null;
        if (config.days === 'manual') {
          nextDateISO = new Date(manualNextDate).toISOString();
        } else {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + config.days);
          const yyyy = nextDate.getFullYear();
          const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
          const dd = String(nextDate.getDate()).padStart(2, '0');
          nextDateISO = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
        }
        
        const nextTaskPayload = {
           party_id: formData.party_id,
           reason: config.reason,
           follow_up_date: nextDateISO,
           due_at: nextDateISO,
           priority: config.priority,
           follow_up_type: config.type,
           status: 'Pending',
           assigned_to: formData.assigned_to,
           created_by: session?.session?.user?.id || null
        };
        
        // Duplicate Prevention
        const { data: existingPending } = await supabase.from('follow_ups')
          .select('id')
          .eq('party_id', formData.party_id)
          .eq('status', 'Pending')
          .eq('follow_up_type', config.type)
          .neq('id', id);
          
        if (existingPending && existingPending.length > 0) {
          const existingId = existingPending[0].id;
          await supabase.from('follow_ups').update({
             reason: config.reason,
             follow_up_date: nextDateISO,
             due_at: nextDateISO,
             priority: config.priority
          }).eq('id', existingId);
          
          logActivity({
            module: 'FollowUps', actionType: 'UPDATED', entityType: 'follow_ups', entityId: existingId,
            summary: `Automated duplicate prevention: Updated next action to ${config.reason}`
          });
        } else {
          const { data: nextData } = await supabase.from('follow_ups').insert(nextTaskPayload).select();
          if (nextData && nextData.length > 0) {
            logActivity({
              module: 'FollowUps', actionType: 'CREATED', entityType: 'follow_ups', entityId: nextData[0].id,
              summary: `Automated next action created: ${config.reason}`
            });
          }
        }
      }
      
      // ACTIVITY INTEGRATION (Micro-Sprint 9.6 / 10.4 / 10.8 / 15.4 / 15.6)
      if (id && formData.status === 'Completed' && (formData.follow_up_type === 'Payment' || formData.follow_up_type === 'Lead' || formData.follow_up_type === 'Reactivation' || formData.follow_up_type === 'Commercial' || formData.follow_up_type === 'Retention')) {
        let interactionNote = formData.notes ? `Task Notes: ${formData.notes}` : '';
        if (config && config.reason) {
          interactionNote += (interactionNote ? '\n' : '') + `Next Action: ${config.reason}`;
        }
        
        let nextDateISO = null;
        if (config) {
          if (config.days === 'manual' && manualNextDate) {
            nextDateISO = new Date(manualNextDate).toISOString();
          } else if (config.days !== 'manual') {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + config.days);
            const yyyy = nextDate.getFullYear();
            const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
            const dd = String(nextDate.getDate()).padStart(2, '0');
            nextDateISO = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
          }
        }

        const interactionPayload = {
          party_id: formData.party_id,
          user_id: session?.session?.user?.id || null,
          channel: formData.follow_up_type === 'Lead' ? 'Lead Task' : (formData.follow_up_type === 'Reactivation' ? 'Reactivation Task' : (formData.follow_up_type === 'Commercial' ? 'Commercial Task' : (formData.follow_up_type === 'Retention' ? 'Retention Task' : 'Payment Task'))),
          interaction_type: formData.follow_up_type === 'Lead' ? 'Lead Follow-up Completed' : (formData.follow_up_type === 'Reactivation' ? 'Reactivation Follow-up Completed' : (formData.follow_up_type === 'Commercial' ? 'Commercial Follow-up Completed' : (formData.follow_up_type === 'Retention' ? 'Retention Follow-up Completed' : 'Payment Follow-up Completed'))),
          outcome: formData.outcome_category,
          note: interactionNote,
          next_action: config ? config.reason : null,
          next_action_date: nextDateISO,
          related_follow_up_id: id
        };
        
        const { data: existingInteraction } = await supabase.from('interactions')
          .select('id')
          .eq('related_follow_up_id', id);
          
        if (existingInteraction && existingInteraction.length > 0) {
           await supabase.from('interactions').update(interactionPayload).eq('id', existingInteraction[0].id);
        } else {
           await supabase.from('interactions').insert(interactionPayload);
        }
      }
      
      navigate('/follow-ups');
    } catch (err) {
      console.error(err);
      const errMsg = err.message || JSON.stringify(err);
      alert(`Save failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="animate-fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
      <div className="page-header" style={{alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/follow-ups" className="btn-icon"><ArrowLeft size={24} /></Link>
          <h1 style={{margin: 0}}>{id ? t('btn.edit') : t('btn.newFollowUp')}</h1>
        </div>
      </div>

      <div className="glass-panel" style={{padding: '2rem'}}>
        <h2 style={{marginBottom: '1.5rem'}}>{t('form.title')}</h2>
        
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
            <div style={{ position: 'relative' }}>
              <label>{t('form.customer')} *</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  required={!formData.party_id}
                  placeholder="Search customer by name or mobile..."
                  value={customerSearch} 
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomer) {
                       setSelectedCustomer(null);
                       setFormData({...formData, party_id: ''});
                       setMobileStatus('idle');
                       setMobileInput('');
                       setCustomerMobileFromDb('');
                       setMobileValidationError('');
                    }
                  }}
                  onFocus={() => { if (customerOptions.length > 0) setShowCustomerDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  disabled={!!id} 
                  style={{ paddingLeft: '2rem', width: '100%', borderColor: formData.party_id ? 'var(--success)' : 'var(--border)' }}
                />
                {isSearchingCustomers && <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching...</span>}
              </div>
              
              {showCustomerDropdown && customerOptions.length > 0 && !selectedCustomer && (
                <ul style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  {customerOptions.map(c => (
                    <li 
                      key={c.id} 
                      style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent blur
                        setSelectedCustomer(c);
                        setCustomerSearch(c.display_name);
                        setFormData({...formData, party_id: c.id});
                        setCustomerOptions([]);
                        setShowCustomerDropdown(false);
                        setMobileStatus('idle');
                        setMobileInput('');
                        setCustomerMobileFromDb('');
                        setMobileValidationError('');
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 500 }}>{c.display_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.mobile || 'No mobile'} • {c.crm_status}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label>Mobile Number</label>
              
              {!formData.party_id && (
                 <div style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    Select a customer to view mobile number.
                 </div>
              )}
              
              {formData.party_id && mobileStatus === 'loading' && (
                 <div style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    Loading customer details...
                 </div>
              )}
              
              {formData.party_id && (mobileStatus === 'viewing' || mobileStatus === 'editing' || mobileStatus === 'missing' || mobileStatus === 'saving' || mobileStatus === 'error') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  
                  {mobileStatus === 'missing' && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>
                      Mobile number is not available for this customer. Please add it to continue.
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      value={mobileInput} 
                      onChange={e => {
                        setMobileInput(e.target.value);
                        if (mobileValidationError) setMobileValidationError('');
                      }}
                      disabled={mobileStatus === 'viewing' || mobileStatus === 'saving' || !isAdmin}
                      placeholder="e.g. 9876543210"
                      style={{ flex: 1, borderColor: mobileValidationError ? 'var(--danger)' : 'var(--border)' }}
                    />
                    
                    {isAdmin && mobileStatus === 'viewing' && (
                      <button type="button" className="btn btn-secondary" onClick={() => setMobileStatus('editing')}>
                        Edit
                      </button>
                    )}
                    
                    {isAdmin && (mobileStatus === 'missing' || mobileStatus === 'editing' || mobileStatus === 'error') && (
                      <button type="button" className="btn btn-primary" onClick={handleSaveMobile}>
                        {mobileStatus === 'missing' ? 'Update Mobile Number' : 'Save'}
                      </button>
                    )}
                    
                    {isAdmin && mobileStatus === 'editing' && (
                      <button type="button" className="btn btn-secondary" onClick={() => {
                        setMobileInput(customerMobileFromDb);
                        setMobileValidationError('');
                        setMobileStatus('viewing');
                      }}>
                        Cancel
                      </button>
                    )}
                    
                    {isAdmin && mobileStatus === 'saving' && (
                      <button type="button" className="btn btn-secondary" disabled>
                        Saving...
                      </button>
                    )}
                  </div>
                  
                  {mobileValidationError && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                      {mobileValidationError}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label>Follow-up Reason *</label>
              <p className="text-secondary" style={{fontSize: '0.8rem', marginTop: 0, marginBottom: '0.5rem'}}>Choose the main purpose of this follow-up.</p>
              
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  placeholder="Select or search a reason"
                  value={reasonSearch}
                  onFocus={() => setShowReasonDropdown(true)}
                  onChange={e => {
                    setReasonSearch(e.target.value);
                    setShowReasonDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowReasonDropdown(false), 200)}
                  style={{ width: '100%' }}
                />
                {showReasonDropdown && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    maxHeight: '200px', overflowY: 'auto', zIndex: 10,
                    padding: '0.5rem', marginTop: '0.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}>
                    {predefinedReasons
                      .filter(r => r.toLowerCase().includes(reasonSearch.toLowerCase()))
                      .map(r => (
                        <div 
                          key={r}
                          onClick={() => {
                            setFormData({...formData, follow_up_reason: r});
                            setReasonSearch(r);
                            setShowReasonDropdown(false);
                          }}
                          style={{
                            padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px',
                            background: formData.follow_up_reason === r ? 'var(--bg-hover)' : 'transparent',
                            color: formData.follow_up_reason === r ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: formData.follow_up_reason === r ? 600 : 400
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = formData.follow_up_reason === r ? 'var(--bg-hover)' : 'transparent'}
                        >
                          {r}
                        </div>
                      ))}
                    {predefinedReasons.filter(r => r.toLowerCase().includes(reasonSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No matching reasons found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {formData.follow_up_reason === 'Other / Custom Reason' && (
              <div>
                <label>Specify Reason *</label>
                <input 
                  required
                  type="text" 
                  placeholder="Enter the reason for this follow-up"
                  value={formData.custom_reason} 
                  onChange={e => setFormData({...formData, custom_reason: e.target.value})}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          <div>
            <label>Notes</label>
            <p className="text-secondary" style={{fontSize: '0.8rem', marginTop: 0, marginBottom: '0.5rem'}}>Add customer context, discussion details, commitment, or next action.</p>
            <textarea 
              rows="4"
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Type your notes here..."
              style={{ width: '100%', marginBottom: '0.5rem' }}
            ></textarea>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-base)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {isListening ? (
                      <>
                        <span className="pulse-icon" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></span>
                        Stop Recording
                      </>
                    ) : (
                      <>🎙️ Speak Note</>
                    )}
                  </button>
                  
                  <select 
                    value={speechLang} 
                    onChange={e => setSpeechLang(e.target.value)}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    disabled={isListening}
                  >
                    <option value="en-IN">English / Hinglish</option>
                    <option value="hi-IN">Hindi</option>
                  </select>
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Tap the microphone to dictate. Only transcribed text is saved; audio is not stored.
                </div>
              </div>
              
              {speechError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {speechError}
                </div>
              )}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
            <div>
              <label>{t('form.dueAt')} *</label>
              <input 
                required 
                type="datetime-local" 
                value={formData.due_at} 
                onChange={e => setFormData({...formData, due_at: e.target.value})}
              />
            </div>
            <div>
              <label>{t('form.reminderAt')}</label>
              <input 
                type="datetime-local" 
                value={formData.reminder_at} 
                onChange={e => setFormData({...formData, reminder_at: e.target.value})}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
            <div>
              <label>{t('form.priority')}</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="Normal">{t('priority.Normal')}</option>
                <option value="High">{t('priority.High')}</option>
                <option value="Low">{t('priority.Low')}</option>
              </select>
            </div>
            
            {id && (
              <div>
                <label>{t('form.status')}</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Pending">{t('status.Pending')}</option>
                  <option value="Completed">{t('status.Completed')}</option>
                  <option value="Skipped">Skipped (Next Step)</option>
                  <option value="Postponed">{t('status.Postponed')}</option>
                  <option value="Cancelled">{t('status.Cancelled')}</option>
                </select>
              </div>
            )}
            
            {formData.follow_up_type === 'Payment' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Payment Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <optgroup label="Payment commitment">
                      <option value="Sending payment today">Sending payment today</option>
                      <option value="Payment within 2 days">Payment within 2 days</option>
                      <option value="Payment within 3 to 5 days">Payment within 3 to 5 days</option>
                      <option value="Payment next week">Payment next week</option>
                      <option value="Payment next month">Payment next month</option>
                      <option value="Part payment today">Part payment today</option>
                    </optgroup>
                    <optgroup label="Customer unavailable">
                      <option value="Not picking phone">Not picking phone</option>
                      <option value="Phone not reachable">Phone not reachable</option>
                      <option value="Call later">Call later</option>
                    </optgroup>
                    <optgroup label="Customer issue">
                      <option value="Cash problem">Cash problem</option>
                      <option value="Market down">Market down</option>
                      <option value="Payment stuck in market">Payment stuck in market</option>
                    </optgroup>
                    <optgroup label="Statement/account request">
                      <option value="Customer asking for statement">Customer asking for statement</option>
                      <option value="Customer asking for ledger">Customer asking for ledger</option>
                    </optgroup>
                    <optgroup label="Escalation needed">
                      <option value="Wants to talk to senior staff">Wants to talk to senior staff</option>
                      <option value="Wants to talk to owner">Wants to talk to owner</option>
                    </optgroup>
                    <optgroup label="Follow-up later">
                      <option value="Follow-up later">Follow-up later</option>
                    </optgroup>
                  </select>
                </div>
                
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {formData.follow_up_type === 'Lead' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Lead Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <option value="Contacted">Contacted</option>
                    <option value="No response">No response</option>
                    <option value="Interested">Interested</option>
                    <option value="Call later">Call later</option>
                    <option value="Not interested">Not interested</option>
                  </select>
                </div>
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div style={{marginTop: '1rem'}}>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {formData.follow_up_type === 'Reactivation' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Reactivation Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <option value="Contacted">Contacted</option>
                    <option value="No response">No response</option>
                    <option value="Interested">Interested</option>
                    <option value="Call later">Call later</option>
                    <option value="Not interested">Not interested</option>
                  </select>
                </div>
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div style={{marginTop: '1rem'}}>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {formData.follow_up_type === 'Commercial' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '4px' }}>
                <div>
                  <label>Commercial Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Order Intention Confirmed">Order Intention Confirmed (Awaiting Tally)</option>
                    <option value="Delayed">Delayed / Needs more time</option>
                    <option value="No response">No response</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div style={{marginTop: '1rem'}}>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {formData.follow_up_type === 'Retention' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--warning-light)', padding: '1rem', borderRadius: '4px' }}>
                <div>
                  <label>Retention Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <option value="Order placed">Order placed</option>
                    <option value="Not ready yet">Not ready yet (Auto follow-up in 15 days)</option>
                    <option value="Follow-up later">Follow-up later (Pick date)</option>
                    <option value="No response">No response</option>
                    <option value="Lost to competitor">Lost to competitor</option>
                  </select>
                </div>
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div style={{marginTop: '1rem'}}>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {!id && existingPendingFollowUps.length > 0 && (
            <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '4px', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--warning-dark)' }}>
                This customer already has {existingPendingFollowUps.length} pending follow-up(s).
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                You can still create a new follow-up. 
                <Link to={`/customers/${formData.party_id}`} target="_blank" style={{ color: 'var(--primary)', marginLeft: '0.5rem', fontWeight: 500, textDecoration: 'underline' }}>
                  View existing follow-ups
                </Link>
              </div>
            </div>
          )}

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem'}}>
            <Link to="/follow-ups" className="btn btn-secondary">
              <X size={18} /> {t('btn.cancel')}
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} /> {loading ? '...' : t('btn.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
