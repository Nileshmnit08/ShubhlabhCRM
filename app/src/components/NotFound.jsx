import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-base)',
      padding: '2rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '3rem',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          fontSize: '28px',
          fontWeight: 800,
          marginBottom: '1.5rem'
        }}>
          404
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Page Not Found
        </h2>
        <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '2rem'
        }}>
          <Link to="/" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <Home size={18} /> Return to Public Website
          </Link>
          <Link to="/today" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            <LayoutDashboard size={18} /> Go to CRM Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
