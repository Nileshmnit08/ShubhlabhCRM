import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import Auth from '../../components/Auth';
import { 
  Building2, 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Layers
} from 'lucide-react';

export default function LoginPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useContext(AuthContext) || {};

  const destinationParam = searchParams.get('destination');
  const [selectedDestination, setSelectedDestination] = useState(destinationParam || 'crm');
  const [pendingNotice, setPendingNotice] = useState(false);

  // If already logged into CRM and requesting CRM, navigate to dashboard or previous route
  useEffect(() => {
    if (session) {
      const target = location.state?.from?.pathname || '/today';
      navigate(target, { replace: true });
    }
  }, [session, navigate, location]);

  // Keep state in sync with URL param
  useEffect(() => {
    if (destinationParam) {
      setSelectedDestination(destinationParam);
      if (destinationParam === 'website') {
        const cmsUrl = import.meta.env.VITE_CMS_ADMIN_URL;
        if (cmsUrl) {
          window.location.href = cmsUrl;
        } else {
          setPendingNotice(true);
        }
      }
    }
  }, [destinationParam]);

  const handleContinue = (e) => {
    e.preventDefault();
    if (selectedDestination === 'crm') {
      setSearchParams({ destination: 'crm' });
    } else if (selectedDestination === 'website') {
      const cmsUrl = import.meta.env.VITE_CMS_ADMIN_URL;
      if (cmsUrl) {
        window.location.href = cmsUrl;
      } else if (session) {
        navigate('/website-cms');
      } else {
        navigate('/login?destination=crm', { state: { from: { pathname: '/website-cms' } } });
      }
    }
  };

  const handleBackToSelector = () => {
    setPendingNotice(false);
    setSearchParams({});
  };

  const handleCrmLoginSuccess = () => {
    const target = location.state?.from?.pathname || '/today';
    navigate(target, { replace: true });
  };

  // If destination is CRM, show the existing CRM Auth component with back button
  if (destinationParam === 'crm') {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg-base, #f8fafc)' }}>
        <div style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1.25rem',
          zIndex: 10
        }}>
          <button
            onClick={handleBackToSelector}
            className="btn btn-secondary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontSize: '0.875rem',
              fontWeight: 500,
              padding: '0.5rem 0.85rem'
            }}
          >
            <ArrowLeft size={16} /> Back to Workspace Selector
          </button>
        </div>
        <Auth onLogin={handleCrmLoginSuccess} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: 'clamp(1rem, 3vw, 2.5rem)',
      position: 'relative',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* Top Header Navigation */}
      <div style={{
        position: 'absolute',
        top: '1.25rem',
        left: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Link 
          to="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            color: '#475569',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0f766e';
            e.currentTarget.style.borderColor = '#0f766e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <ArrowLeft size={16} /> Back to Website
        </Link>
      </div>

      {/* Main Selector Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: 'clamp(1.5rem, 5vw, 2.25rem)',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #143d28 0%, #1b5e20 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '17px',
            margin: '0 auto 1rem',
            letterSpacing: '1px',
            boxShadow: '0 8px 16px rgba(20, 61, 40, 0.18)'
          }}>
            शुभ लाभ
          </div>
          <h2 style={{
            fontSize: 'clamp(1.35rem, 4vw, 1.6rem)',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 0.4rem 0',
            letterSpacing: '-0.02em',
            fontFamily: "'Manrope', sans-serif"
          }}>
            Welcome to Shubh Labh
          </h2>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            Select the workspace you want to access
          </p>
        </div>

        {/* Unavailable Notice for Website Admin */}
        {pendingNotice && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            color: '#92400e',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            lineHeight: 1.45
          }}>
            <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: '#b45309', marginBottom: '0.2rem' }}>
                Website Admin Panel (CMS) Notice:
              </strong>
              The Website Admin Panel backend is awaiting dedicated PHP/cPanel hosting provisioning. Please access the <strong>CRM</strong> or contact your system administrator.
              <button 
                type="button" 
                onClick={() => {
                  setSelectedDestination('crm');
                  setPendingNotice(false);
                }}
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#0f766e',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Switch to CRM workspace →
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleContinue} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Radio Option 1: CRM — Business Management */}
          <label 
            htmlFor="dest-crm"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1.15rem',
              borderRadius: '12px',
              border: selectedDestination === 'crm' ? '2px solid #0f766e' : '1.5px solid #e2e8f0',
              backgroundColor: selectedDestination === 'crm' ? '#f0fdfa' : '#ffffff',
              boxShadow: selectedDestination === 'crm' ? '0 0 0 3px rgba(15, 118, 110, 0.12)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <div style={{ marginTop: '3px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                id="dest-crm"
                type="radio"
                name="destination"
                value="crm"
                checked={selectedDestination === 'crm'}
                onChange={() => {
                  setSelectedDestination('crm');
                  setPendingNotice(false);
                }}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#0f766e',
                  cursor: 'pointer',
                  margin: 0
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Building2 size={18} color="#0f766e" />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.975rem' }}>
                    CRM — Business Management
                  </span>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#0f766e',
                  backgroundColor: 'rgba(15, 118, 110, 0.1)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  Core System
                </span>
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.825rem', color: '#475569', lineHeight: 1.45 }}>
                Customers, orders, requirements, dispatches, market prices and reports.
              </p>
            </div>
          </label>

          {/* Radio Option 2: Website Admin Panel */}
          <label 
            htmlFor="dest-website"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1.15rem',
              borderRadius: '12px',
              border: selectedDestination === 'website' ? '2px solid #0f766e' : '1.5px solid #e2e8f0',
              backgroundColor: selectedDestination === 'website' ? '#f0fdfa' : '#ffffff',
              boxShadow: selectedDestination === 'website' ? '0 0 0 3px rgba(15, 118, 110, 0.12)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <div style={{ marginTop: '3px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                id="dest-website"
                type="radio"
                name="destination"
                value="website"
                checked={selectedDestination === 'website'}
                onChange={() => {
                  setSelectedDestination('website');
                  setPendingNotice(false);
                }}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#0f766e',
                  cursor: 'pointer',
                  margin: 0
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Globe size={18} color="#0f766e" />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.975rem' }}>
                    Website Admin Panel
                  </span>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  CMS & Portal
                </span>
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.825rem', color: '#475569', lineHeight: 1.45 }}>
                Manage website content, products, banners and enquiries.
              </p>
            </div>
          </label>

          {/* Continue Submit Button */}
          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '0.85rem 1.25rem', 
              marginTop: '0.85rem', 
              fontSize: '0.95rem', 
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#ffffff',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#115e59';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0f766e';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(223, 116, 44, 0.4), 0 4px 12px rgba(15, 118, 110, 0.25)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 118, 110, 0.25)';
            }}
          >
            Continue <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer Security Note */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '1.5rem', 
          paddingTop: '1.25rem', 
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          color: '#94a3b8',
          fontSize: '0.78rem'
        }}>
          <Shield size={14} />
          <span>Authorized access only · Protected by enterprise encryption</span>
        </div>
      </div>
    </div>
  );
}
