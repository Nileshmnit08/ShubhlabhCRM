import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, User, Building2 } from 'lucide-react';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      let query = supabase.from('crm_parties').select('*').order('created_at', { ascending: false });
      
      if (search) {
        query = query.ilike('display_name', `%${search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'badge badge-active';
      case 'dormant': return 'badge badge-dormant';
      case 'at risk': return 'badge badge-at-risk';
      default: return 'badge badge-dormant';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            Manage your CRM parties, relationships, and contacts.
          </p>
        </div>
        
        <Link to="/customers/new" className="btn btn-primary">
          <Plus size={18} />
          Add Customer
        </Link>
      </div>

      <div className="glass-panel" style={{marginBottom: '2rem', padding: '1.5rem'}}>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div style={{position: 'relative', flex: 1, maxWidth: '400px'}}>
            <Search size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
            <input 
              type="text" 
              placeholder="Search by customer name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{paddingLeft: '2.75rem'}}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchCustomers()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <Building2 size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
            <h3>No customers found</h3>
            <p>Get started by creating your first CRM party.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div style={{fontWeight: 500}}>{customer.display_name}</div>
                    {customer.legal_or_core_name && (
                      <div className="text-muted" style={{fontSize: '0.8rem'}}>{customer.legal_or_core_name}</div>
                    )}
                  </td>
                  <td>
                    {[customer.city, customer.state].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td>
                    {customer.mobile || customer.whatsapp || '-'}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(customer.crm_status)}>
                      {customer.crm_status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/customers/${customer.id}`} className="btn btn-secondary" style={{padding: '0.375rem 0.75rem', fontSize: '0.85rem'}}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
