import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Clock, MessageCircle, AlertCircle, FileWarning, 
  HelpCircle, ArrowRight, Activity, Filter, CheckCircle2
} from 'lucide-react';

const AttentionCenter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  
  // Filters
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAttentionItems();
  }, []);

  const fetchAttentionItems = async () => {
    setLoading(true);
    try {
      const today = startOfDay(new Date()).toISOString();
      const threeDaysAgo = startOfDay(subDays(new Date(), 3)).toISOString();

      // 1. Fetch materials that need daily tracking
      const { data: materials } = await supabase
        .from('raw_materials')
        .select('id, name_en, name_hi, daily_tracking_required')
        .eq('active', true);

      // 2. Fetch broker assignments
      const { data: brokerMats } = await supabase
        .from('broker_materials')
        .select('raw_material_id, broker_id, brokers(broker_name)');

      // 3. Fetch recent price entries (last 3 days)
      const { data: recentEntries } = await supabase
        .from('raw_material_price_entries')
        .select(`
          id, raw_material_id, broker_id, price, status, entry_date, 
          quality_grade_id, unit_id, price_type_id,
          brokers(broker_name)
        `)
        .gte('entry_date', threeDaysAgo)
        .eq('is_deleted', false);

      // 4. Fetch today's incoming WhatsApp messages
      const { data: whatsappMessages } = await supabase
        .from('whatsapp_incoming_messages')
        .select('id, broker_id, processing_status, received_at, raw_message, sender_phone')
        .gte('received_at', today);

      const detectedIssues = [];

      // Process Data to find issues
      const trackedMaterials = materials.filter(m => m.daily_tracking_required);
      
      trackedMaterials.forEach(material => {
        const todaysEntries = recentEntries.filter(e => e.raw_material_id === material.id && new Date(e.entry_date) >= new Date(today));
        const officialTodaysEntries = todaysEntries.filter(e => e.status === 'Official');
        const pendingTodaysEntries = todaysEntries.filter(e => e.status === 'Pending');

        // Issue: Missing Today's Price
        if (officialTodaysEntries.length === 0) {
          detectedIssues.push({
            id: `missing-price-${material.id}`,
            type: 'missing_price',
            title: 'Missing Today\'s Price',
            description: `No official price recorded today for ${material.name_en}.`,
            materialId: material.id,
            materialName: material.name_en,
            severity: 'high',
            icon: <Clock className="text-red-500" size={20} />,
            actionLabel: 'Enter Price',
            actionUrl: '/raw-material-prices/daily-entry'
          });
        }

        // Issue: Conflicting Quotes (Variance > 5% among today's official quotes)
        if (officialTodaysEntries.length > 1) {
          const prices = officialTodaysEntries.map(e => Number(e.price));
          const max = Math.max(...prices);
          const min = Math.min(...prices);
          if (min > 0 && ((max - min) / min) > 0.05) {
            detectedIssues.push({
              id: `conflict-${material.id}`,
              type: 'conflict',
              title: 'Conflicting Quotes',
              description: `High variance (>5%) detected in today's official quotes for ${material.name_en} (Range: ₹${min} - ₹${max}).`,
              materialId: material.id,
              materialName: material.name_en,
              severity: 'medium',
              icon: <Activity className="text-amber-500" size={20} />,
              actionLabel: 'Analyze',
              actionUrl: `/raw-material-prices/analysis?material=${material.id}`
            });
          }
        }

        // Issue: Stale Price (No price in last 3 days)
        const entriesLast3Days = recentEntries.filter(e => e.raw_material_id === material.id && e.status === 'Official');
        if (entriesLast3Days.length === 0) {
           detectedIssues.push({
            id: `stale-${material.id}`,
            type: 'stale',
            title: 'Stale Price',
            description: `No official price recorded for ${material.name_en} in the last 3 days.`,
            materialId: material.id,
            materialName: material.name_en,
            severity: 'high',
            icon: <AlertTriangle className="text-red-500" size={20} />,
            actionLabel: 'Enter Price',
            actionUrl: '/raw-material-prices/daily-entry'
          });
        }

        // Issue: Quotes Awaiting Verification
        if (pendingTodaysEntries.length > 0) {
           detectedIssues.push({
            id: `pending-verify-${material.id}`,
            type: 'awaiting_verification',
            title: 'Quote Awaiting Verification',
            description: `${pendingTodaysEntries.length} pending quote(s) require verification for ${material.name_en}.`,
            materialId: material.id,
            materialName: material.name_en,
            severity: 'medium',
            icon: <CheckCircle2 className="text-blue-500" size={20} />,
            actionLabel: 'Verify History',
            actionUrl: `/raw-material-prices/history?material=${material.id}`
          });
        }

        // Issue: Broker Not Responding (assigned broker has no messages and no entries today)
        const assignedBrokers = brokerMats.filter(bm => bm.raw_material_id === material.id);
        assignedBrokers.forEach(ab => {
          const hasMessage = whatsappMessages.some(m => m.broker_id === ab.broker_id);
          const hasEntry = todaysEntries.some(e => e.broker_id === ab.broker_id);
          
          if (!hasMessage && !hasEntry) {
            detectedIssues.push({
              id: `no-response-${material.id}-${ab.broker_id}`,
              type: 'no_response',
              title: 'Broker Not Responding',
              description: `Assigned broker ${ab.brokers?.broker_name || 'Unknown'} has not provided a quote for ${material.name_en} today.`,
              materialId: material.id,
              materialName: material.name_en,
              brokerId: ab.broker_id,
              severity: 'low',
              icon: <MessageCircle className="text-slate-400" size={20} />,
              actionLabel: 'Contact',
              actionUrl: `/raw-material-prices/daily-entry` // Could link to a broker directory if it existed
            });
          }
        });
      });

      // Issue: Missing required commercial info
      recentEntries.filter(e => new Date(e.entry_date) >= new Date(today)).forEach(entry => {
        if (!entry.unit_id || !entry.price_type_id) {
          detectedIssues.push({
            id: `missing-info-${entry.id}`,
            type: 'missing_info',
            title: 'Missing Commercial Information',
            description: `Quote from ${entry.brokers?.broker_name || 'Unknown'} is missing Unit or Price Type.`,
            materialId: entry.raw_material_id,
            severity: 'medium',
            icon: <FileWarning className="text-amber-500" size={20} />,
            actionLabel: 'Fix Entry',
            actionUrl: `/raw-material-prices/history`
          });
        }
      });

      // Issue: WhatsApp Response received but not processed
      const unprocessedMessages = whatsappMessages.filter(m => m.processing_status === 'Pending' || m.processing_status === 'Needs Review');
      unprocessedMessages.forEach(msg => {
         detectedIssues.push({
            id: `unprocessed-msg-${msg.id}`,
            type: 'unprocessed_msg',
            title: 'Unprocessed WhatsApp Quote',
            description: `Received a raw message from broker (Phone: ${msg.sender_phone}) that needs processing.`,
            brokerId: msg.broker_id,
            severity: 'high',
            icon: <HelpCircle className="text-blue-500" size={20} />,
            actionLabel: 'Process Inbox',
            actionUrl: `/raw-material-prices/whatsapp` // Assuming WhatsAppInbox or WhatsAppUpdate is available here
          });
      });

      setIssues(detectedIssues);
    } catch (error) {
      console.error('Error fetching attention items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high': return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">Urgent</span>;
      case 'medium': return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">Attention</span>;
      case 'low': return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">Notice</span>;
      default: return null;
    }
  };

  const filteredIssues = filterType === 'all' ? issues : issues.filter(i => i.type === filterType);

  return (
    <div className="animate-fade-in pb-12">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold text-primary">Price Collection Attention Center</h1>
        <p className="text-sm text-secondary mt-1">Actionable workflow for pending prices and unreviewed broker responses.</p>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        <button 
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-white text-secondary border border-base hover:bg-slate-50'}`}
        >
          All Issues ({issues.length})
        </button>
        <button 
          onClick={() => setFilterType('missing_price')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterType === 'missing_price' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-secondary border border-base hover:bg-slate-50'}`}
        >
          Missing Prices ({issues.filter(i => i.type === 'missing_price').length})
        </button>
        <button 
          onClick={() => setFilterType('unprocessed_msg')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterType === 'unprocessed_msg' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-secondary border border-base hover:bg-slate-50'}`}
        >
          Unprocessed Messages ({issues.filter(i => i.type === 'unprocessed_msg').length})
        </button>
        <button 
          onClick={() => setFilterType('awaiting_verification')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterType === 'awaiting_verification' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-secondary border border-base hover:bg-slate-50'}`}
        >
          Awaiting Verification ({issues.filter(i => i.type === 'awaiting_verification').length})
        </button>
        <button 
          onClick={() => setFilterType('conflict')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterType === 'conflict' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-white text-secondary border border-base hover:bg-slate-50'}`}
        >
          Conflicts ({issues.filter(i => i.type === 'conflict').length})
        </button>
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
          <p className="text-sm font-medium">Scanning price records...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center bg-emerald-50/30 border-emerald-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-800">All Caught Up!</h3>
          <p className="text-sm text-emerald-600 max-w-md mt-1">
            There are no pending actions or attention items matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIssues.map(issue => (
            <div key={issue.id} className="card p-5 border border-base hover:border-blue-200 hover:shadow-md transition-all group flex flex-col h-full bg-white relative overflow-hidden">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-base group-hover:bg-white transition-colors">
                  {issue.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-primary text-[15px] truncate pr-2">{issue.title}</h3>
                    {getSeverityBadge(issue.severity)}
                  </div>
                  {issue.materialName && (
                    <div className="text-xs font-medium text-blue-600 bg-blue-50 inline-flex px-2 py-0.5 rounded mb-2">
                      {issue.materialName}
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-secondary mb-5 flex-1 leading-relaxed">
                {issue.description}
              </p>
              
              <div className="mt-auto pt-4 border-t border-base flex justify-end">
                <Link 
                  to={issue.actionUrl} 
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-blue-600 transition-colors group/link"
                >
                  {issue.actionLabel}
                  <ArrowRight size={16} className="transform group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttentionCenter;
