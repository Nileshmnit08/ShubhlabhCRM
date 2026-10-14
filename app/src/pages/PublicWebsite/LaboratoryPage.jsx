import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  RotateCw,
  Activity,
  FlaskConical,
  Layers,
  ShieldCheck,
  Radio,
  Droplets,
  Filter,
  Gauge,
  Flame,
  Shield,
  ShieldAlert,
  CheckCircle2,
  MessageCircle,
  FileText,
  ArrowRight,
  ChevronDown,
  Award,
  ExternalLink,
  Phone,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  LAB_OVERVIEW,
  LAB_WORKFLOW_STEPS,
  LAB_TESTING_PARAMETERS,
  LAB_EQUIPMENT,
  LAB_QA_POLICIES,
  LAB_FAQS
} from '../../lib/laboratoryData';
import './laboratoryPage.css';
import './publicWebsite.css';

// Safe icon component mapper
const ICON_COMPONENTS = {
  Truck,
  RotateCw,
  Activity,
  FlaskConical,
  Layers,
  ShieldCheck,
  Radio,
  Beaker: FlaskConical,
  Droplets,
  Filter,
  Gauge,
  Flame,
  Shield,
  ShieldAlert
};

function renderLabIcon(iconName, defaultComponent = FlaskConical) {
  const Component = ICON_COMPONENTS[iconName] || defaultComponent;
  return <Component size={22} />;
}

export default function LaboratoryPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Dynamic CMS or fallback data
  const [overview, setOverview] = useState(LAB_OVERVIEW);
  const [workflowSteps, setWorkflowSteps] = useState(LAB_WORKFLOW_STEPS);
  const [parameters, setParameters] = useState(LAB_TESTING_PARAMETERS);
  const [equipment, setEquipment] = useState(LAB_EQUIPMENT);
  const [contactSettings, setContactSettings] = useState({
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    email: 'contact@shubhlabhfeeds.in'
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'In-House Quality Laboratory & Proximate Testing | Shubh Labh Dairy Nutrition';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Tour the Shubh Labh feed laboratory: 6-stage QC workflow, rapid NIR spectroscopy, wet-chemistry proximate analysis (Protein, Fat, Fiber, Silica, Aflatoxin B1).'
      );
    }

    async function loadLabData() {
      try {
        // 1. Contact Settings
        const { data: sData } = await supabase.from('website_site_settings').select('*');
        if (sData && sData.length > 0) {
          const phone = sData.find((s) => s.setting_key === 'phone_number')?.setting_value;
          const whatsapp = sData.find((s) => s.setting_key === 'whatsapp_number')?.setting_value;
          const email = sData.find((s) => s.setting_key === 'public_email')?.setting_value;
          setContactSettings({
            phone: phone || '+91 98765 43210',
            whatsapp: (whatsapp || '919876543210').replace(/[^0-9]/g, ''),
            email: email || 'contact@shubhlabhfeeds.in'
          });
        }

        // 2. Workflow Steps
        const { data: wfData } = await supabase
          .from('website_lab_workflow_steps')
          .select('*')
          .eq('is_published', true)
          .order('display_order', { ascending: true });
        if (wfData && wfData.length > 0) {
          setWorkflowSteps(wfData);
        }

        // 3. Testing Parameters
        const { data: paramData } = await supabase
          .from('website_lab_capabilities')
          .select('*')
          .eq('is_published', true)
          .order('display_order', { ascending: true });
        if (paramData && paramData.length > 0) {
          setParameters(paramData);
        }

        // 4. Equipment Showcase
        const { data: eqData } = await supabase
          .from('website_lab_equipment')
          .select('*')
          .eq('is_published', true)
          .order('display_order', { ascending: true });
        if (eqData && eqData.length > 0) {
          setEquipment(eqData);
        }
      } catch (err) {
        console.debug('Using verified baseline laboratory data fallback:', err?.message || err);
      }
    }

    loadLabData();
  }, []);

  // Filter parameters by category
  const categoriesList = useMemo(() => {
    const set = new Set();
    parameters.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [parameters]);

  const filteredParameters = useMemo(() => {
    if (selectedCategory === 'All') return parameters;
    return parameters.filter((p) => p.category === selectedCategory);
  }, [parameters, selectedCategory]);

  const whatsappMessage = encodeURIComponent(
    'Hello Shubh Labh Team, I am interested in learning more about your In-House Laboratory testing capabilities and cattle feed quality assurance.'
  );

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
              <span className="brand-name">SHUBH LABH</span>
              <span className="brand-tagline">DAIRY NUTRITION</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="desktop-nav site-nav" aria-label="Main Navigation">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/#products" className="nav-link">Products</Link>
            <Link to="/#about" className="nav-link">About</Link>
            <Link to="/laboratory" className="nav-link active">In-House Lab</Link>
            <Link to="/#knowledge" className="nav-link">Knowledge</Link>
            <Link to="/#dealer" className="nav-link">Become a Dealer</Link>
            <Link to="/#contact" className="nav-link">Contact</Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="header-actions">
            <a
              href={`https://wa.me/${contactSettings.whatsapp}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lab-whatsapp"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              <MessageCircle size={15} />
              <span>Lab Desk</span>
            </a>
            <Link to="/#dealer" className="cta-button">
              Become a Dealer <span aria-hidden="true">↗</span>
            </Link>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              id="lab-mobile-menu-toggle"
              className={`menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="toggle-bar"></span>
              <span className="toggle-bar"></span>
              <span className="toggle-bar"></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-drawer-inner">
            <nav className="mobile-nav-links">
              <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/#products" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Products Catalogue</Link>
              <Link to="/#about" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>About Shubh Labh</Link>
              <Link to="/laboratory" className="mobile-nav-link active" onClick={() => setMobileMenuOpen(false)}>In-House Quality Lab</Link>
              <Link to="/#knowledge" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Dairy Knowledge Hub</Link>
              <Link to="/#dealer" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Become a Dealer</Link>
              <Link to="/#contact" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact Support</Link>
            </nav>
            <div className="mobile-drawer-footer">
              <a
                href={`https://wa.me/${contactSettings.whatsapp}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lab-whatsapp"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <MessageCircle size={18} /> WhatsApp Lab Helpline
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="lab-hero-section">
        <div className="lab-hero-backdrop"></div>
        <div className="lab-hero-inner">
          <div className="lab-hero-badge">
            <span className="pulse-dot"></span>
            <span>{overview.hero_eyebrow || 'EVIDENCE-BASED DAIRY QUALITY'}</span>
          </div>

          <h1 className="lab-hero-title">
            Precision Nutrition. <br />
            <span className="accent">Scientific Quality Control.</span>
          </h1>

          <p className="lab-hero-subtitle">
            {overview.hero_subtitle || 'Inside the Shubh Labh In-House Feed & Grain Analysis Laboratory'}
          </p>

          <p style={{ maxWidth: '820px', color: '#cbd5e1', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '2rem' }}>
            {overview.lead_text}
          </p>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <a href="#workflow" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Explore 6-Stage QC Workflow</span>
              <ArrowRight size={16} />
            </a>
            <a href="#parameters" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              <span>View Testing Parameters</span>
              <FlaskConical size={16} />
            </a>
            <a
              href={`https://wa.me/${contactSettings.whatsapp}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lab-whatsapp"
            >
              <MessageCircle size={16} />
              <span>Direct Lab Inquiry</span>
            </a>
          </div>

          {/* Key Quality Stats */}
          <div className="lab-stats-grid">
            {overview.stats.map((st, idx) => (
              <div key={idx} className="lab-stat-card">
                <div className="lab-stat-value">{st.value}</div>
                <div className="lab-stat-label">{st.label}</div>
                <div className="lab-stat-detail">{st.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. 6-Stage Quality Control Workflow */}
      <section id="workflow" className="lab-section">
        <div className="lab-container">
          <div className="lab-section-header">
            <span className="lab-section-eyebrow">STANDARDIZED OPERATING PROCEDURE</span>
            <h2 className="lab-section-title">The 6-Stage Quality Control Workflow</h2>
            <p className="lab-section-lead">
              From raw grain delivery at our plant gates to sealed batch dispatch, every kilogram of Shubh Labh cattle feed passes through six rigorous checkpoints.
            </p>
          </div>

          <div className="workflow-grid">
            {workflowSteps.map((step) => (
              <div key={step.id || step.step_number} className="workflow-card">
                <div className="workflow-card-top">
                  <span className="workflow-step-num">{step.step_number}</span>
                  <span className="workflow-phase-badge">{step.phase}</span>
                </div>
                <h3 className="workflow-title">{step.title}</h3>
                <p className="workflow-desc">{step.description}</p>
                {step.quality_check && (
                  <div className="workflow-check-box">
                    <strong>Mandatory Checkpoint:</strong>
                    <span>{step.quality_check}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Testing Capabilities / Proximate Analysis Parameters */}
      <section id="parameters" className="lab-section lab-section-alt">
        <div className="lab-container">
          <div className="lab-section-header">
            <span className="lab-section-eyebrow">ANALYTICAL RIGOR</span>
            <h2 className="lab-section-title">Guaranteed Proximate Analysis Parameters</h2>
            <p className="lab-section-lead">
              Our laboratory tests for both positive nutritional density and negative contaminants, ensuring every bag of feed delivers consistent energy, protein, and safety for your herd.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="parameters-category-filter">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'All' ? `All Parameters (${parameters.length})` : cat}
              </button>
            ))}
          </div>

          {/* Parameters Grid */}
          <div className="parameters-grid">
            {filteredParameters.map((param) => (
              <div key={param.id || param.parameter_code} className="param-card">
                <div className="param-header">
                  <span className="param-code-pill">{param.parameter_code}</span>
                  <span className="param-cat-tag">{param.category}</span>
                </div>
                <h3 className="param-name">{param.parameter_name}</h3>
                <div className="param-method">
                  <strong>Method:</strong> {param.standard_method}
                </div>
                <div className="param-range-box">
                  <span className="param-range-label">Standard Range / Limit</span>
                  <span className="param-range-val">{param.typical_range}</span>
                </div>
                <p className="param-significance">{param.importance || param.significance}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Equipment Showcase */}
      <section id="equipment" className="lab-section">
        <div className="lab-container">
          <div className="lab-section-header">
            <span className="lab-section-eyebrow">ADVANCED INSTRUMENTATION</span>
            <h2 className="lab-section-title">In-House Analytical Equipment Showcase</h2>
            <p className="lab-section-lead">
              State-of-the-art laboratory hardware operated on-site at our Jaipur manufacturing facility, ensuring real-time testing without delays.
            </p>
          </div>

          <div className="equipment-grid">
            {equipment.map((eq) => (
              <div key={eq.id || eq.name} className="equip-card">
                <div className="equip-icon-wrap">
                  {renderLabIcon(eq.icon)}
                </div>
                <h3 className="equip-name">{eq.name}</h3>
                <div className="equip-model">{eq.model_type}</div>
                <p className="equip-purpose">{eq.purpose}</p>
                {eq.specs && (
                  <div className="equip-specs-box">
                    <strong>Specifications:</strong> {eq.specs}
                  </div>
                )}
                {eq.significance && (
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: '#15803d', fontWeight: 600 }}>
                    ✳ {eq.significance}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Quality Assurance Policies & Compliance Notice */}
      <section className="lab-section lab-section-alt">
        <div className="lab-container">
          <div className="lab-section-header">
            <span className="lab-section-eyebrow">INTEGRITY & PROVENANCE</span>
            <h2 className="lab-section-title">Our Quality Assurance & Traceability Framework</h2>
            <p className="lab-section-lead">
              Our quality policies protect commercial dairy farms and rural dealers by ensuring complete batch traceability from raw material truck to feed trough.
            </p>
          </div>

          <div className="qa-pillars-grid">
            {LAB_QA_POLICIES.map((policy, idx) => (
              <div key={idx} className="qa-pillar-card">
                <h3 className="qa-pillar-title">{policy.title}</h3>
                <p className="qa-pillar-desc">{policy.description}</p>
              </div>
            ))}
          </div>

          {/* Compliance Notice */}
          <div className="compliance-box">
            <ShieldCheck size={32} className="compliance-icon" />
            <div className="compliance-text">
              <h4>Feed Industry Standard Adherence</h4>
              <p>
                Shubh Labh Cattle Feeds operates its in-house laboratory in strict accordance with standard proximate feed testing methodologies established by the Bureau of Indian Standards (BIS IS:2052 for Compounded Cattle Feeds) and the Indian Council of Agricultural Research (ICAR). We adhere to honest, verified testing claims with full sample provenance and batch archiving.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Frequently Asked Questions */}
      <section className="lab-section">
        <div className="lab-container">
          <div className="lab-section-header">
            <span className="lab-section-eyebrow">COMMON INQUIRIES</span>
            <h2 className="lab-section-title">Laboratory & Testing FAQs</h2>
            <p className="lab-section-lead">
              Clear answers to the questions progressive dairy farmers and prospective dealers ask us most frequently.
            </p>
          </div>

          <div className="faqs-list">
            {LAB_FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="faq-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="faq-question" style={{ margin: 0, paddingRight: '1rem' }}>
                      {faq.q}
                    </h3>
                    <ChevronDown
                      size={18}
                      color="#15803d"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                    />
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                      <p className="faq-answer">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Call to Action Banner */}
          <div className="lab-cta-banner">
            <h3>Ready to partner with a quality-first cattle feed brand?</h3>
            <p>
              Connect with our technical team to discuss custom feeding schedules, request a batch Certificate of Analysis (COA), or enquire about dealership opportunities in your district.
            </p>
            <div className="lab-cta-actions">
              <a
                href={`https://wa.me/${contactSettings.whatsapp}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lab-whatsapp"
              >
                <MessageCircle size={18} />
                <span>Chat with Lab & Nutrition Desk</span>
              </a>
              <Link to="/#dealer" className="btn-lab-dealer">
                <span>Become a Shubh Labh Dealer</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/#products" className="btn-lab-dealer" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                <span>View Full Product Catalogue</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="site-footer">
        <div className="container footer-main-row">
          <div className="footer-brand-col">
            <Link className="brand footer-brand" to="/">
              <div className="brand-emblem light-emblem">
                <span className="emblem-hindi">शुभ</span>
                <span className="emblem-hindi">लाभ</span>
              </div>
              <div className="brand-text">
                <span className="brand-name light-text">SHUBH LABH</span>
                <span className="brand-tagline light-sub">DAIRY NUTRITION</span>
              </div>
            </Link>
            <p className="footer-mission-text">
              Supporting thoughtful cattle nutrition and thriving dairy farming with uncompromising quality, scientific rations, and a farmer-first outlook.
            </p>
            <div className="footer-seal-note">
              <span>✳ In-House Laboratory Tested • Guaranteed Quality</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-nav-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#products">Product Catalogue</Link></li>
              <li><Link to="/laboratory">In-House Quality Lab</Link></li>
              <li><Link to="/#about">About Our Story</Link></li>
              <li><Link to="/#knowledge">Dairy Knowledge Hub</Link></li>
              <li><Link to="/#dealer">Become a Dealer</Link></li>
              <li><Link to="/#contact">Contact Support</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Quality Standards</h4>
            <ul className="footer-nav-list">
              <li><a href="#workflow">6-Step QC Workflow</a></li>
              <li><a href="#parameters">Proximate Parameters</a></li>
              <li><a href="#equipment">NIR & Testing Gear</a></li>
              <li><a href="#parameters">Aflatoxin B1 Safe Limit</a></li>
              <li><a href="#workflow">90-Day Sample Vault</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Portals & Contact</h4>
            <ul className="footer-nav-list">
              <li><Link to="/login?destination=crm">CRM Staff Login ↗</Link></li>
              <li><Link to="/login?destination=website">Website Admin (CMS) ↗</Link></li>
              {contactSettings.whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${contactSettings.whatsapp}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp Lab Desk ↗
                  </a>
                </li>
              )}
              {contactSettings.phone && (
                <li>
                  <a href={`tel:${contactSettings.phone.replace(/[^0-9+]/g, '')}`}>
                    Helpline: {contactSettings.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="container footer-bottom-bar">
          <span className="copyright-text">
            © {new Date().getFullYear()} Shubh Labh Dairy Nutrition. All rights reserved.
          </span>
          <div className="footer-bottom-links">
            <Link to="/#products">Products</Link>
            <span className="dot-sep">•</span>
            <Link to="/laboratory">Laboratory</Link>
            <span className="dot-sep">•</span>
            <Link to="/#about">About Us</Link>
            <span className="dot-sep">•</span>
            <Link to="/#dealer">Dealership</Link>
            <span className="dot-sep">•</span>
            <Link to="/login">CRM Login</Link>
          </div>
          <button
            type="button"
            className="back-to-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            BACK TO TOP ↑
          </button>
        </div>
      </footer>
    </div>
  );
}
