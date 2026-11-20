import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Calendar,
  Layers,
  Phone,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import './publicWebsite.css';

export default function OrderAppPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'Download Shubh Labh Order App | Official Android APK';
    window.scrollTo(0, 0);
  }, []);

  const releaseInfo = {
    appName: 'Shubh Labh Order',
    version: 'v1.0.1',
    releaseDate: '20 November 2026',
    fileSize: '89.3 MB (93,689,353 bytes)',
    minSdk: 'Android 6.0 (Marshmallow) and above',
    sha256: '42F2CCD46D0F86A589818A3A80550066C1CCD1761FC76EF01BC959A64F54853A',
    downloadPath: '/order-app/download',
    directApkPath: '/downloads/shubhlabh-order-v1.0.1.apk',
  };

  return (
    <div className="sl-public-website lab-page-container">
      {/* Top Header / Navigation Bar */}
      <header className="site-header scrolled">
        <div className="container header-container">
          <Link to="/" className="brand" aria-label="Shubh Labh Home">
            <div className="brand-emblem">
              <span className="emblem-hindi">शुभ</span>
              <span className="emblem-hindi">लाभ</span>
            </div>
            <div className="brand-text">
              <span className="brand-title">SHUBH LABH</span>
              <span className="brand-subtitle">DAIRY NUTRITION</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Main Navigation">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/#products" className="nav-link">Products</Link>
            <Link to="/laboratory" className="nav-link">QA Lab</Link>
            <Link to="/#contact" className="nav-link">Contact</Link>
            <Link to="/order-app" className="nav-link active" style={{ color: 'var(--color-accent-terracotta, #df742c)', fontWeight: 700 }}>
              Order App 📱
            </Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="header-actions">
            <a
              href="https://wa.me/919928192696?text=नमस्ते%20शुभ%20लाभ%20टीम,%20मुझे%20ऑर्डर%20ऐप%20के%20बारे%20में%20जानकारी%20चाहिए।"
              className="btn btn-wa-header"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact support on WhatsApp"
            >
              <MessageCircle size={16} />
              <span>WhatsApp Help</span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              className={`mobile-hamburger ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-drawer-content">
            <nav className="mobile-nav-links">
              <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/#products" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Products</Link>
              <Link to="/laboratory" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>QA Laboratory</Link>
              <Link to="/order-app" className="mobile-nav-link active" onClick={() => setMobileMenuOpen(false)}>Order App 📱</Link>
              <Link to="/#contact" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact Support</Link>
            </nav>
            <div className="mobile-drawer-footer">
              <a
                href="https://wa.me/919928192696"
                className="btn btn-wa-header w-full justify-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={16} />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ paddingTop: '80px', minHeight: '80vh', backgroundColor: 'var(--color-cream-primary, #f7f5ee)' }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1.25rem' }}>
          
          {/* Main App Hero Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            boxShadow: '0 12px 36px rgba(20, 61, 40, 0.08)',
            border: '1px solid var(--color-divider, #e2ddd0)',
            textAlign: 'center',
          }}>
            {/* App Icon */}
            <img
              src="/order-app/assets/app-icon.png"
              alt="Shubh Labh Order App Icon"
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '24px',
                boxShadow: '0 8px 24px rgba(20, 61, 40, 0.15)',
                border: '3px solid #ffffff',
                margin: '0 auto 1.25rem',
                display: 'block',
                objectFit: 'cover',
              }}
            />

            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              fontSize: '0.825rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
            }}>
              <ShieldCheck size={16} />
              <span>आधिकारिक सत्यापित मोबाइल ऐप (Verified Official Release)</span>
            </div>

            <h1 style={{
              fontFamily: "var(--display, 'Manrope', sans-serif)",
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--color-green-primary, #143d28)',
              margin: '0 0 0.5rem',
            }}>
              {releaseInfo.appName}
            </h1>

            <p style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary, #526054)',
              margin: '0 auto 1.75rem',
              maxWidth: '620px',
              lineHeight: 1.6,
            }}>
              पंजीकृत पशु आहार खरीदारों एवं डीलरों के लिए आधिकारिक ऑर्डरिंग ऐप। सीधे अपने मोबाइल से ऑर्डर दर्ज करें, वास्तविक समय में भाव देखें और लेजर स्थिति ट्रैक करें।
            </p>

            {/* Prominent Download Button */}
            <div style={{ marginBottom: '2rem' }}>
              <a
                href={releaseInfo.downloadPath}
                download="shubhlabh-order.apk"
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  backgroundColor: 'var(--color-accent-terracotta, #df742c)',
                  color: '#ffffff',
                  padding: '1.15rem 2.5rem',
                  borderRadius: '16px',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 10px 24px rgba(223, 116, 44, 0.35)',
                  width: '100%',
                  maxWidth: '420px',
                }}
              >
                <Download size={24} />
                <span>Download APK ({releaseInfo.version} • 89.3 MB)</span>
              </a>
            </div>

            {/* Technical Specifications Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              margin: '2rem 0',
              textAlign: 'left',
            }}>
              <div style={{
                backgroundColor: 'var(--color-cream-secondary, #eeebe1)',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--color-divider, #e2ddd0)',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#526054', display: 'block', marginBottom: '0.2rem' }}>
                  वर्जन (Version)
                </span>
                <strong style={{ fontSize: '1rem', color: '#0e2a1c' }}>{releaseInfo.version}</strong>
              </div>

              <div style={{
                backgroundColor: 'var(--color-cream-secondary, #eeebe1)',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--color-divider, #e2ddd0)',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#526054', display: 'block', marginBottom: '0.2rem' }}>
                  रिलीज़ दिनांक (Release Date)
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#0e2a1c' }}>{releaseInfo.releaseDate}</strong>
              </div>

              <div style={{
                backgroundColor: 'var(--color-cream-secondary, #eeebe1)',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--color-divider, #e2ddd0)',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#526054', display: 'block', marginBottom: '0.2rem' }}>
                  फाइल साइज (File Size)
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#0e2a1c' }}>{releaseInfo.fileSize.split(' ')[0]} MB</strong>
              </div>

              <div style={{
                backgroundColor: 'var(--color-cream-secondary, #eeebe1)',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--color-divider, #e2ddd0)',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#526054', display: 'block', marginBottom: '0.2rem' }}>
                  संगतता (Compatibility)
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#0e2a1c' }}>Android 6.0+</strong>
              </div>
            </div>

            {/* Android Notice Alert */}
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderLeft: '4px solid #f59e0b',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              textAlign: 'left',
              margin: '1.5rem 0',
              fontSize: '0.9rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <AlertTriangle size={22} style={{ minWidth: '22px', marginTop: '2px', color: '#d97706' }} />
              <div>
                <strong>केवल Android डिवाइस के लिए (Android OS Only):</strong> यह आधिकारिक Shubh Labh APK पैकेज है। वर्तमान में iOS (iPhone) समर्थित नहीं है। कृपया इस पेज को अपने Android स्मार्टफोन में खोलें।
              </div>
            </div>

            {/* Checksum Card */}
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary, #7a887c)',
              backgroundColor: '#fafaf8',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: '1px dashed var(--color-divider, #e2ddd0)',
              textAlign: 'left',
              wordBreak: 'break-all',
            }}>
              <strong style={{ color: '#526054' }}>SHA-256 Checksum (SHA-256 सुरक्षा चेकसम):</strong><br />
              <code style={{ fontSize: '0.8rem', color: '#1e293b' }}>{releaseInfo.sha256}</code>
            </div>
          </div>

          {/* Installation Steps Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '2.25rem 2rem',
            boxShadow: '0 12px 36px rgba(20, 61, 40, 0.08)',
            border: '1px solid var(--color-divider, #e2ddd0)',
            marginTop: '2rem',
            textAlign: 'left',
          }}>
            <h2 style={{
              fontFamily: "var(--display, 'Manrope', sans-serif)",
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-green-primary, #143d28)',
              margin: '0 0 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Layers size={22} /> आसान इंस्टॉलेशन गाइड (Installation Steps)
            </h2>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.35rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-green-primary, #143d28)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>1</div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0e2a1c' }}>
                  APK डाउनलोड करें (Download APK)
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#526054', lineHeight: 1.5 }}>
                  ऊपर दिए गए <strong>"Download APK"</strong> बटन पर क्लिक करें। डाउनलोड प्रक्रिया कुछ ही सेकंड में पूरी हो जाएगी।
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.35rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-green-primary, #143d28)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>2</div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0e2a1c' }}>
                  अज्ञात ऐप्स की अनुमति दें (Allow Install from Unknown Sources)
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#526054', lineHeight: 1.5 }}>
                  डाउनलोड पूर्ण होने पर फाइल खोलें। यदि आपका फोन "Install Unknown Apps" चेतावनी दिखाता है, तो "Settings" में जाकर ब्राउज़र (Chrome) को अनुमति दें।
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.35rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-green-primary, #143d28)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>3</div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0e2a1c' }}>
                  ऐप इंस्टॉल करें (Install Application)
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#526054', lineHeight: 1.5 }}>
                  स्क्रीन पर <strong>"Install"</strong> पर टैप करें। इंस्टॉलेशन पूरा होने के बाद <strong>"Open"</strong> पर क्लिक करें।
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-green-primary, #143d28)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>4</div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0e2a1c' }}>
                  लॉगिन क्रेडेंशियल्स दर्ज करें (Sign In with Login ID & Password)
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#526054', lineHeight: 1.5 }}>
                  शुभ लाभ टीम / WhatsApp पर प्राप्त अपनी <strong>Login ID</strong> और <strong>Temporary Password</strong> से लॉगिन करें। लॉगिन के बाद प्रोफ़ाइल में जाकर नया पासवर्ड अवश्य सेट कर लें।
                </p>
              </div>
            </div>
          </div>

          {/* Help & Helpline Card */}
          <div style={{
            backgroundColor: 'var(--color-green-primary, #143d28)',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '2rem',
            marginTop: '2rem',
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#ffffff' }}>
              सहायता एवं संपर्क (Help & Customer Support)
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', opacity: 0.9 }}>
              ऐप डाउनलोड, लॉगिन या पासवर्ड रीसेट में किसी भी सहायता के लिए संपर्क करें:
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.85rem',
              flexWrap: 'wrap',
            }}>
              <a
                href="tel:+919352276227"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Phone size={15} /> फैक्ट्री: +91 93522 76227
              </a>
              <a
                href="tel:+919928192696"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Phone size={15} /> ऑफिस: +91 99281 92696
              </a>
              <a
                href="https://wa.me/919928192696"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <MessageCircle size={15} /> WhatsApp Support
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-main-row">
          <div className="footer-brand-col">
            <Link className="brand footer-brand" to="/">
              <div className="brand-emblem light-emblem">
                <span className="emblem-hindi">शुभ</span>
                <span className="emblem-hindi">लाभ</span>
              </div>
            </Link>
            <p className="footer-mission-text">
              Supporting thoughtful cattle nutrition and thriving dairy farming with uncompromising quality, scientific rations, and a farmer-first outlook.
            </p>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-nav-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#products">Product Catalogue</Link></li>
              <li><Link to="/laboratory">QA Laboratory</Link></li>
              <li><Link to="/order-app">Order Mobile App</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Contact</h4>
            <ul className="footer-nav-list">
              <li><a href="tel:+919352276227">+91 93522 76227 (Factory)</a></li>
              <li><a href="tel:+919928192696">+91 99281 92696 (Office)</a></li>
              <li>Makrana, Didwana-Kuchaman, Rajasthan 341505</li>
            </ul>
          </div>
        </div>

        <div className="container footer-bottom-bar">
          <span className="copyright-text">
            © {new Date().getFullYear()} Shubh Labh Dairy Nutrition. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
