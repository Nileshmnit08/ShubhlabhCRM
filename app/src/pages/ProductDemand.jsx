import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { Search, Filter, Layers, Package, Map, ChevronDown, ChevronRight, Activity, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ProductDemand() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signals, setSignals] = useState([]);

  // Filters
  const [filterTerritory, setFilterTerritory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [territories, setTerritories] = useState([]);

  // Expanded product state
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    try {
      let query = supabase.from('v_product_demand_signals').select('*').order('product_category').order('standardized_product_name').order('signal_date', { ascending: false });
      
      if (userProfile?.role !== 'Admin') {
         query = query.eq('assigned_owner_id', userProfile?.id);
      }

      const { data, error: fetchErr } = await query;
      
      if (fetchErr) throw fetchErr;
      setSignals(data || []);

      const uniqueTerritories = new Set();
      data?.forEach(r => {
        if (r.territory_name) uniqueTerritories.add(r.territory_name);
      });
      setTerritories(Array.from(uniqueTerritories).sort());

    } catch (err) {
      console.error(err);
      setError("Failed to load product demand data.");
    } finally {
      setLoading(false);
    }
  }

  const toggleProduct = (prodKey) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(prodKey)) next.delete(prodKey);
      else next.add(prodKey);
      return next;
    });
  };

  const filteredSignals = useMemo(() => signals.filter(s => {
    if (filterTerritory !== 'All' && (s.territory_name || 'Unassigned') !== filterTerritory) return false;
    if (filterType !== 'All' && s.signal_type !== filterType) return false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!s.party_name?.toLowerCase().includes(sq) && !s.standardized_product_name?.toLowerCase().includes(sq)) return false;
    }
    return true;
  }), [signals, filterTerritory, filterType, searchQuery]);

  const groupedByCategory = useMemo(() => {
    const groups = {};
    filteredSignals.forEach(s => {
      const cat = s.product_category || 'Uncategorized';
      const prod = s.standardized_product_name || 'Unknown';
      if (!groups[cat]) groups[cat] = { category: cat, products: {} };
      if (!groups[cat].products[prod]) groups[cat].products[prod] = { name: prod, reqCount: 0, intentCount: 0, txnCount: 0, signals: [] };
      
      const p = groups[cat].products[prod];
      p.signals.push(s);
      
      if (s.signal_type === 'Stated Requirement') p.reqCount++;
      else if (s.signal_type === 'Commercial Intent') p.intentCount++;
      else if (s.signal_type === 'Tally Transaction' || s.signal_type === 'Repeat Purchase Evidence') p.txnCount++;
    });
    
    // Convert to arrays
    const sortedGroups = Object.values(groups).sort((a, b) => a.category.localeCompare(b.category));
    sortedGroups.forEach(g => {
       g.products = Object.values(g.products).sort((a, b) => a.name.localeCompare(b.name));
    });
    return sortedGroups;
  }, [filteredSignals]);

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Product Demand...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={24} className="text-primary" /> Product Demand Matrix
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Aggregate market demand signals by product category and SKU.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
             <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
             <input
               type="text"
               className="input"
               placeholder="Search by customer or product..."
               style={{ paddingLeft: '2.5rem', width: '100%' }}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={18} className="text-muted" />
            <select className="input" value={filterTerritory} onChange={e => setFilterTerritory(e.target.value)} style={{ padding: '0.5rem', minWidth: '150px' }}>
              <option value="All">All Territories</option>
              {territories.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="Unassigned">Unassigned</option>
            </select>
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="All">All Signal Types</option>
              <option value="Stated Requirement">Open Requirements</option>
              <option value="Commercial Intent">Commercial Intents</option>
              <option value="Tally Transaction">Recent Transactions</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {groupedByCategory.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No product demand signals found.
          </div>
        ) : (
          groupedByCategory.map(catGroup => (
            <div key={catGroup.category} className="glass-panel" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', background: 'var(--primary-dark)', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} /> {catGroup.category}
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                      <th style={{ padding: '0.75rem', width: '40px' }}></th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Product Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Total Signals</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Open Reqs</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Active Intents</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catGroup.products.map(prod => {
                      const prodKey = `${catGroup.category}-${prod.name}`;
                      const isExpanded = expandedProducts.has(prodKey);
                      
                      return (
                        <React.Fragment key={prodKey}>
                          <tr 
                            style={{ 
                              borderBottom: isExpanded ? 'none' : '1px solid var(--border)', 
                              background: isExpanded ? 'var(--bg-surface-hover)' : 'transparent', 
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }} 
                            onClick={() => toggleProduct(prodKey)}
                          >
                            <td style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {prod.name}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                              {prod.signals.length}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {prod.reqCount > 0 ? <span className="badge badge-success">{prod.reqCount}</span> : <span className="text-muted">-</span>}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {prod.intentCount > 0 ? <span className="badge badge-primary">{prod.intentCount}</span> : <span className="text-muted">-</span>}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {prod.txnCount > 0 ? <span className="text-success" style={{fontWeight: 600}}>{prod.txnCount}</span> : <span className="text-muted">-</span>}
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)' }}>
                              <td></td>
                              <td colSpan="5" style={{ padding: '0 1rem 1rem 0' }}>
                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '4px' }}>
                                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                    <tbody>
                                      {prod.signals.map((s, idx) => (
                                        <tr key={idx} style={{ borderBottom: idx < prod.signals.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                          <td style={{ padding: '0.5rem', width: '120px' }}>
                                            {s.signal_type === 'Stated Requirement' && <span className="text-success"><CheckCircle2 size={12}/> Req</span>}
                                            {s.signal_type === 'Commercial Intent' && <span className="text-primary"><TrendingUp size={12}/> Intent</span>}
                                            {s.signal_type === 'Tally Transaction' && <span className="text-success"><DollarSign size={12}/> Tally</span>}
                                            {s.signal_type === 'Repeat Purchase Evidence' && <span className="text-warning"><Activity size={12}/> Patrn</span>}
                                          </td>
                                          <td style={{ padding: '0.5rem', width: '150px', color: 'var(--text-secondary)' }}>
                                            {format(parseISO(s.signal_date), 'MMM dd, HH:mm')}
                                          </td>
                                          <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link to={`/customers/${s.party_id}`} className="text-primary" onClick={e => e.stopPropagation()}>
                                              {s.party_name}
                                            </Link>
                                            {s.territory_name && <span className="text-muted" style={{fontSize: '0.75rem', marginLeft: '0.5rem'}}>[{s.territory_name}]</span>}
                                          </td>
                                          <td style={{ padding: '0.5rem', color: 'var(--text-primary)' }}>
                                            {s.description}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
