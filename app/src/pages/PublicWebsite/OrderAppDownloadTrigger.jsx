import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowLeft, RefreshCw, Smartphone } from 'lucide-react';

export default function OrderAppDownloadTrigger() {
  const downloadUrl = '/downloads/shubhlabh-order-v1.0.2.apk';

  useEffect(() => {
    document.title = 'Downloading Shubh Labh Order APK...';
    // Trigger download immediately
    const timer = setTimeout(() => {
      window.location.href = downloadUrl;
    }, 400);

    return () => clearTimeout(timer);
  }, [downloadUrl]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-cream-primary, #f7f5ee)',
      padding: '1.5rem',
      fontFamily: "var(--font, 'DM Sans', sans-serif)",
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        boxShadow: '0 16px 40px rgba(20, 61, 40, 0.08)',
        border: '1px solid var(--color-divider, #e2ddd0)',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#faede4',
          color: '#df742c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <Download size={32} className="animate-bounce" />
        </div>

        <h1 style={{
          fontFamily: "var(--display, 'Manrope', sans-serif)",
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--color-green-primary, #143d28)',
          margin: '0 0 0.5rem',
        }}>
          डाउनलोड शुरू हो रहा है...
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: 'var(--color-text-secondary, #526054)',
          margin: '0 0 1.75rem',
          lineHeight: 1.5,
        }}>
          Shubh Labh Order APK (v1.0.2) का डाउनलोड कुछ ही सेकंड में अपने आप शुरू हो जाएगा।
        </p>

        <a
          href={downloadUrl}
          download="shubhlabh-order.apk"
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--color-accent-terracotta, #df742c)',
            color: '#ffffff',
            padding: '0.85rem 1.75rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 8px 18px rgba(223, 116, 44, 0.3)',
            width: '100%',
          }}
        >
          <RefreshCw size={16} /> यदि डाउनलोड न हो तो यहाँ क्लिक करें
        </a>

        <div style={{ marginTop: '1.5rem' }}>
          <Link
            to="/order-app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--color-green-primary, #143d28)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} /> वापस ऐप विवरण पर जाएँ
          </Link>
        </div>
      </div>
    </div>
  );
}
