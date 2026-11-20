import React from 'react';
import { Search, UserPlus, Settings, MessageSquare, Copy, Check, ShieldCheck, ShieldAlert, Clock, Phone, MapPin } from 'lucide-react';
import { normalizeIndianPhone } from '../utils/whatsappTemplate';

export default function CustomerTable({
  customers,
  buyerAccountsMap,
  loading,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onProvisionClick,
  onManageClick,
  onWhatsAppClick,
}) {
  const [copiedId, setCopiedId] = React.useState(null);

  const handleCopyMobile = (e, mobile, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mobile);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderRadius: '16px',
      border: '1px solid var(--border, #e2e8f0)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Search and Filters Bar */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border, #e2e8f0)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fafbfc',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '420px' }}>
          <Search size={17} style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted, #94a3b8)',
          }} />
          <input
            type="text"
            className="input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, customer code, mobile, or location..."
            style={{
              paddingLeft: '2.5rem',
              width: '100%',
              fontSize: '0.875rem',
              borderRadius: '10px',
            }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          backgroundColor: '#e2e8f0',
          padding: '0.25rem',
          borderRadius: '10px',
        }}>
          {[
            { id: 'ALL', label: 'All Customers' },
            { id: 'PENDING', label: 'Pending Access' },
            { id: 'ACTIVE', label: 'Active App' },
            { id: 'DISABLED', label: 'Disabled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              style={{
                border: 'none',
                background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                color: statusFilter === tab.id ? '#0f172a' : '#64748b',
                fontWeight: statusFilter === tab.id ? 600 : 500,
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: statusFilter === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Customer Name</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Customer Code</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Registered Mobile</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>App Status</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Login ID</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                  <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#123d26', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <div>Loading live customer directory...</div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    No Customers Found
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {searchTerm ? `No customer matching "${searchTerm}"` : 'No customers in this status category.'}
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const account = buyerAccountsMap[c.id];
                const hasAccount = Boolean(account);
                const isActive = account?.is_active ?? false;
                const cleanMobile = normalizeIndianPhone(c.mobile || c.whatsapp || '');

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--border, #f1f5f9)',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="hover:bg-slate-50"
                  >
                    {/* Customer Name */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                        {c.display_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                        {c.city && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <MapPin size={12} /> {c.city}
                          </span>
                        )}
                        {c.legal_or_core_name && c.legal_or_core_name !== c.display_name && (
                          <span>• {c.legal_or_core_name}</span>
                        )}
                        {c.crm_status && c.crm_status !== 'Active' && (
                          <span style={{
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}>
                            {c.crm_status}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer Code */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {c.customer_code ? (
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: '#f1f5f9',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          color: '#334155',
                        }}>
                          {c.customer_code}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Registered Mobile */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {cleanMobile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e293b' }}>
                            +91 {cleanMobile}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyMobile(e, cleanMobile, c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              color: copiedId === c.id ? '#16a34a' : '#94a3b8',
                            }}
                            title="Copy number"
                          >
                            {copiedId === c.id ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 500 }}>
                          No Mobile
                        </span>
                      )}
                    </td>

                    {/* App Account Status */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {!hasAccount ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          color: '#b45309',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          <Clock size={13} /> Pending Access
                        </span>
                      ) : isActive ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(22, 163, 74, 0.1)',
                          color: '#15803d',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          <ShieldCheck size={13} /> Active
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(225, 29, 72, 0.1)',
                          color: '#be123c',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          <ShieldAlert size={13} /> Disabled
                        </span>
                      )}
                    </td>

                    {/* Login ID */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {hasAccount ? (
                        <span style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace' }}>
                          {account.email}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!hasAccount ? (
                          <button
                            type="button"
                            onClick={() => onProvisionClick(c)}
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              borderRadius: '8px',
                            }}
                          >
                            <UserPlus size={14} /> Create Access
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onManageClick(c, account)}
                              className="btn btn-secondary"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                borderRadius: '8px',
                              }}
                            >
                              <Settings size={14} /> Manage
                            </button>
                            <button
                              type="button"
                              onClick={() => onWhatsAppClick({ customer: c, account })}
                              title="Prepare WhatsApp Invite"
                              style={{
                                border: '1px solid #bbf7d0',
                                backgroundColor: '#f0fdf4',
                                color: '#16a34a',
                                borderRadius: '8px',
                                padding: '0.35rem 0.55rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MessageSquare size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div style={{
        padding: '0.85rem 1.5rem',
        borderTop: '1px solid var(--border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fafbfc',
        fontSize: '0.82rem',
        color: 'var(--text-secondary, #64748b)',
      }}>
        <div>
          Showing {customers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, totalItems)} of {totalItems} customers
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage <= 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
          >
            Previous
          </button>
          <span style={{ padding: '0 0.5rem', fontWeight: 600, color: '#1e293b' }}>
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
