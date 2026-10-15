import React, { useEffect, useState, useContext, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, Sparkles, ArrowRight, Package, Filter, X } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  AUTHORITATIVE_CATEGORIES, 
  AUTHORITATIVE_SUBCATEGORIES, 
  AUTHORITATIVE_PRODUCTS 
} from '../../lib/productCatalogueData';
import ProductsMegaMenu from './ProductsMegaMenu';
import ContactForm from './components/ContactForm';
import BecomeDealerForm from './components/BecomeDealerForm';
import './publicWebsite.css';

// Canonical 7 navigation items with verified IDs and targets
const CANONICAL_NAV = [
  { id: 'nav-home', label: 'Home', url: '#home', target: '_self' },
  { id: 'nav-products', label: 'Products', url: '#products', target: '_self' },
  { id: 'nav-about', label: 'About', url: '#about', target: '_self' },
  { id: 'nav-lab', label: 'In-House Lab', url: '/laboratory', target: '_self' },
  { id: 'nav-knowledge', label: 'Knowledge', url: '#knowledge', target: '_self' },
  { id: 'nav-dealer', label: 'Become a Dealer', url: '#dealer', target: '_self' },
  { id: 'nav-contact', label: 'Contact', url: '#contact', target: '_self' },
];

/**
 * Deduplicates and normalizes navigation items from Supabase CMS or static fallback.
 * Guarantees that each destination anchor appears exactly once in the navigation.
 */
function deduplicateNav(rawItems) {
  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return CANONICAL_NAV;
  }
  const seenUrls = new Set();
  const seenLabels = new Set();
  const deduped = [];

  for (const item of rawItems) {
    if (!item || !item.url) continue;
    const cleanUrl = item.url.trim().toLowerCase().replace(/^#+/, '#');
    const cleanLabel = (item.label || '').trim().toLowerCase();

    // Map common variations (e.g. 'about us' -> 'about')
    const key = cleanUrl.replace(/[^a-z0-9#/]/g, '');

    if (seenUrls.has(key) || seenLabels.has(cleanLabel)) {
      continue;
    }
    seenUrls.add(key);
    seenLabels.add(cleanLabel);

    deduped.push({
      id: item.id || `nav-${key.replace(/[^a-z0-9]/g, '')}`,
      label: item.label,
      url: item.url,
      target: item.target || '_self',
    });
  }

  // Ensure Laboratory is present in the nav
  if (!deduped.some((i) => i.url === '/laboratory' || i.url === '#laboratory' || i.label?.toLowerCase().includes('lab'))) {
    const aboutIndex = deduped.findIndex((i) => i.url === '#about');
    const insertIdx = aboutIndex !== -1 ? aboutIndex + 1 : 3;
    deduped.splice(insertIdx, 0, { id: 'nav-lab', label: 'In-House Lab', url: '/laboratory', target: '_self' });
  }

  return deduped.length > 0 ? deduped : CANONICAL_NAV;
}

export default function PublicWebsite() {
  const { session } = useContext(AuthContext) || {};
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Dynamic CMS content states with verified baseline fallbacks
  const [announcementText, setAnnouncementText] = useState('Nutrition made with farmers in mind ✳ Serving dairy ambitions across Rajasthan & North India');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [contactSettings, setContactSettings] = useState({
    phone: null,
    whatsapp: null,
    email: null,
    address: null,
  });

  const [heroContent, setHeroContent] = useState({
    title: 'Better nutrition. Stronger dairy.',
    subtitle: 'Scientific cattle nutrition crafted for the dedicated dairy farmers driving India\'s white revolution forward.',
    eyebrow: 'A Partner in Dairy Progress',
    primaryCtaText: 'Explore Our Products ↗',
    primaryCtaUrl: '#products',
    secondaryCtaText: 'Discover Shubh Labh →',
    secondaryCtaUrl: '#about',
  });

  const [liveProducts, setLiveProducts] = useState(AUTHORITATIVE_PRODUCTS);
  const [liveCategories, setLiveCategories] = useState(AUTHORITATIVE_CATEGORIES);
  const [liveSubcategories, setLiveSubcategories] = useState(AUTHORITATIVE_SUBCATEGORIES);
  const [liveArticles, setLiveArticles] = useState(null);
  const [navItems, setNavItems] = useState(CANONICAL_NAV);

  // Mega-Menu & Catalogue Filters State
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileProductsAccordionOpen, setMobileProductsAccordionOpen] = useState(false);

  // Fetch published CMS content from Supabase with safe fallback
  useEffect(() => {
    async function fetchPublishedContent() {
      try {
        // 1. Site Settings
        const { data: sData } = await supabase
          .from('website_site_settings')
          .select('setting_key, setting_value, is_public')
          .eq('is_public', true);

        if (sData && sData.length > 0) {
          const ann = sData.find((s) => s.setting_key === 'announcement_text');
          if (ann?.setting_value) setAnnouncementText(ann.setting_value);

          const annAct = sData.find((s) => s.setting_key === 'announcement_active');
          if (annAct) setAnnouncementActive(annAct.setting_value !== '0');

          const phone = sData.find((s) => s.setting_key === 'phone_number')?.setting_value;
          const whatsapp = sData.find((s) => s.setting_key === 'whatsapp_number')?.setting_value;
          const email = sData.find((s) => s.setting_key === 'public_email')?.setting_value;
          const address = sData.find((s) => s.setting_key === 'postal_address')?.setting_value;
          setContactSettings({ phone, whatsapp, email, address });

          const metaTitle = sData.find((s) => s.setting_key === 'meta_title')?.setting_value;
          if (metaTitle) document.title = metaTitle;
        }

        // 2. Hero Section
        const { data: heroData } = await supabase
          .from('website_site_sections')
          .select('*')
          .eq('section_key', 'hero')
          .eq('is_published', true)
          .single();
        if (heroData) {
          setHeroContent({
            title: heroData.title || 'Better nutrition. Stronger dairy.',
            subtitle: heroData.subtitle || heroData.body_text || 'Scientific cattle nutrition crafted for the dedicated dairy farmers driving India\'s white revolution forward.',
            eyebrow: heroData.eyebrow || 'A Partner in Dairy Progress',
            primaryCtaText: heroData.primary_cta_text || 'Explore Our Products ↗',
            primaryCtaUrl: heroData.primary_cta_url || '#products',
            secondaryCtaText: heroData.secondary_cta_text || 'Discover Shubh Labh →',
            secondaryCtaUrl: heroData.secondary_cta_url || '#about',
          });
        }

        // 3. Product Categories
        const { data: catData } = await supabase
          .from('website_product_categories')
          .select('*')
          .order('display_order', { ascending: true });
        if (catData && catData.length > 0) {
          setLiveCategories(catData);
        }

        // 3b. Product Subcategories
        try {
          const { data: subcatData } = await supabase
            .from('website_product_subcategories')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
          if (subcatData && subcatData.length > 0) {
            setLiveSubcategories(subcatData);
          }
        } catch (e) {
          // Subcategory table may be pending migration
        }

        // 4. Published Products
        const { data: pData } = await supabase
          .from('website_products')
          .select('*')
          .eq('status', 'published')
          .order('display_order', { ascending: true });
        if (pData && pData.length > 0) {
          const merged = [...pData];
          AUTHORITATIVE_PRODUCTS.forEach((ap) => {
            if (!merged.some((mp) => mp.slug === ap.slug)) {
              merged.push(ap);
            }
          });
          setLiveProducts(merged);
        }

        // 5. Published Knowledge Articles
        const { data: aData } = await supabase
          .from('website_knowledge_articles')
          .select('*')
          .eq('status', 'published')
          .order('display_order', { ascending: true });
        if (aData && aData.length > 0) {
          setLiveArticles(aData);
        }

        // 6. Navigation Items (Deduplicated)
        const { data: nData } = await supabase
          .from('website_navigation_items')
          .select('*')
          .eq('location', 'header')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (nData && nData.length > 0) {
          setNavItems(deduplicateNav(nData));
        }
      } catch (err) {
        // Fallback gracefully to static verified baseline
        console.debug('CMS content fallback active:', err?.message || err);
      }
    }
    fetchPublishedContent();
  }, []);

  // Filtered Products computation
  const filteredProducts = useMemo(() => {
    let result = liveProducts || AUTHORITATIVE_PRODUCTS;

    if (selectedCategorySlug !== 'all') {
      const cat = liveCategories.find((c) => c.slug === selectedCategorySlug);
      if (cat) {
        result = result.filter((p) => p.category_id === cat.id);
      }
    }

    if (selectedSubcategoryId !== 'all') {
      result = result.filter((p) => p.subcategory_id === Number(selectedSubcategoryId));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q) ||
          p.packaging_desc?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [liveProducts, selectedCategorySlug, selectedSubcategoryId, searchQuery, liveCategories]);

  const activeCategoryObj = useMemo(() => {
    if (selectedCategorySlug === 'all') return null;
    return liveCategories.find((c) => c.slug === selectedCategorySlug) || null;
  }, [selectedCategorySlug, liveCategories]);

  const activeSubcategories = useMemo(() => {
    if (!activeCategoryObj) return [];
    return liveSubcategories.filter((s) => s.category_id === activeCategoryObj.id);
  }, [activeCategoryObj, liveSubcategories]);

  const revealObserverRef = useRef(null);

  // Dynamic reveal observer that monitors all .reveal elements, including async-loaded cards
  const observeAllReveals = useCallback(() => {
    if (typeof window === 'undefined') return;
    const unobserved = document.querySelectorAll('.sl-public-website .reveal:not(.is-visible)');
    if (unobserved.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      unobserved.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!revealObserverRef.current) {
      revealObserverRef.current = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px 50px 0px' }
      );
    }

    unobserved.forEach((el) => {
      // If the element is already within the visible viewport window, reveal immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
      } else {
        revealObserverRef.current.observe(el);
      }
    });
  }, []);

  useEffect(() => {
    // 1. Scroll elevation listener
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 2. Initial observer run + MutationObserver for dynamically inserted DOM nodes
    observeAllReveals();

    let mutationObserver;
    const rootEl = document.querySelector('.sl-public-website');
    if ('MutationObserver' in window && rootEl) {
      mutationObserver = new MutationObserver(() => {
        observeAllReveals();
      });
      mutationObserver.observe(rootEl, { childList: true, subtree: true });
    }

    // 3. IntersectionObserver for active section highlighting
    let activeObserver;
    const sections = document.querySelectorAll('.sl-public-website main section[id]');
    if ('IntersectionObserver' in window && sections.length > 0) {
      activeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        { rootMargin: '-25% 0px -65% 0px' }
      );
      sections.forEach((s) => activeObserver.observe(s));
    }

    // 4. Keyboard listener for Escape to close mobile menu
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      if (mutationObserver) mutationObserver.disconnect();
      if (revealObserverRef.current) revealObserverRef.current.disconnect();
      if (activeObserver) activeObserver.disconnect();
    };
  }, [menuOpen, observeAllReveals]);

  // Re-run reveal checks whenever live products or articles state resolves
  useEffect(() => {
    observeAllReveals();
  }, [liveArticles, liveProducts, filteredProducts, observeAllReveals]);

  // Deep-link hash navigation and scroll restoration
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetId = hash.replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
          targetEl.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
        }
      }
    };

    const timer = setTimeout(handleHash, 120);
    window.addEventListener('hashchange', handleHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', handleHash);
    };
  }, [liveArticles, liveProducts]);

  // Lock body scroll when mobile drawer is open to prevent background scrolling on mobile
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const getWhatsAppProductLink = (productName) => {
    const rawNum = contactSettings.whatsapp || contactSettings.phone || '919829000000';
    const cleanNum = rawNum.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hello Shubh Labh Team, I would like to enquire about ${productName}. Please share details and dealership availability.`);
    return `https://wa.me/${cleanNum}?text=${msg}`;
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="sl-public-website">
      <a href="#home" className="skip-link">Skip to main content</a>

      {/* Top Announcement Bar */}
      {announcementActive && (
        <aside className="announcement-bar" aria-label="Announcement">
          <div className="announcement-content">
            <span className="announcement-badge">QUALITY COMMITMENT</span>
            <span className="announcement-text">{announcementText}</span>
          </div>
        </aside>
      )}

      {/* Master Site Header */}
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`} id="top">
        <div className="header-container">
          {/* Brand Identity */}
          <a className="brand" href="#top" aria-label="Shubh Labh Cattle Feed - Home" onClick={closeMenu}>
            <div className="brand-emblem">
              <span className="emblem-hindi">शुभ</span>
              <span className="emblem-hindi">लाभ</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">SHUBH LABH</span>
              <span className="brand-tagline">DAIRY NUTRITION</span>
            </div>
          </a>

          {/* Desktop Single-Row Navigation */}
          <nav className="desktop-nav site-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const anchor = (item.url || '').replace('#', '');
              const isActive = activeSection === anchor;
              const isProducts = item.label?.toLowerCase() === 'products' || item.url === '#products';

              if (isProducts) {
                return (
                  <div
                    key={item.id}
                    className="nav-item-dropdown"
                    onMouseEnter={() => setMegaMenuOpen(true)}
                    onMouseLeave={() => setMegaMenuOpen(false)}
                  >
                    <a
                      id="products-nav-trigger"
                      className={`nav-link ${isActive || megaMenuOpen ? 'active' : ''}`}
                      href="#products"
                      onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                      aria-expanded={megaMenuOpen}
                      aria-haspopup="true"
                    >
                      <span>{item.label}</span>
                      <ChevronDown size={13} className={`dropdown-chevron ${megaMenuOpen ? 'open' : ''}`} />
                    </a>
                  </div>
                );
              }

              if (item.url && item.url.startsWith('/')) {
                return (
                  <Link
                    key={item.id}
                    className="nav-link"
                    to={item.url}
                    target={item.target || '_self'}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <a
                  key={item.id}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  href={item.url}
                  target={item.target || '_self'}
                  onClick={closeMenu}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Header Action Buttons */}
          <div className="header-actions">
            <a href="#dealer" className="cta-button">
              Become a Dealer <span aria-hidden="true">↗</span>
            </a>

            {session ? (
              <Link to="/today" className="portal-button session-active" title="Open CRM Staff Dashboard">
                CRM Portal <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link to="/login" className="portal-button" title="Staff and Executive Login">
                Login <span aria-hidden="true">↗</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              id="mobile-menu-toggle"
              className={`menu-toggle ${menuOpen ? 'open' : ''}`}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="toggle-bar"></span>
              <span className="toggle-bar"></span>
              <span className="toggle-bar"></span>
            </button>
          </div>
        </div>

        {/* Desktop Products Mega-Menu Dropdown */}
        <div 
          onMouseEnter={() => setMegaMenuOpen(true)}
          onMouseLeave={() => setMegaMenuOpen(false)}
        >
          <ProductsMegaMenu
            isOpen={megaMenuOpen}
            onClose={() => setMegaMenuOpen(false)}
            categories={liveCategories}
            subcategories={liveSubcategories}
            products={liveProducts}
            onSelectCategory={(slug) => {
              setSelectedCategorySlug(slug);
              setSelectedSubcategoryId('all');
            }}
          />
        </div>

        {/* Mobile Navigation Drawer (Single-Instance, Visible Only <= 991px) */}
        <div
          id="mobile-navigation"
          className={`mobile-nav-drawer ${menuOpen ? 'open' : ''}`}
          aria-hidden={!menuOpen}
        >
          <div className="mobile-drawer-inner">
            <nav className="mobile-nav-links" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const anchor = (item.url || '').replace('#', '');
                const isActive = activeSection === anchor;
                const isProducts = item.label?.toLowerCase() === 'products' || item.url === '#products';

                if (isProducts) {
                  return (
                    <div key={`mobile-${item.id}`} className="mobile-nav-accordion-item">
                      <button
                        type="button"
                        id="mobile-products-accordion-btn"
                        className={`mobile-nav-link accordion-toggle ${mobileProductsAccordionOpen ? 'active' : ''}`}
                        onClick={() => setMobileProductsAccordionOpen(!mobileProductsAccordionOpen)}
                        aria-expanded={mobileProductsAccordionOpen}
                      >
                        <span>{item.label} Catalogue</span>
                        <ChevronDown size={16} className={`mobile-acc-arrow ${mobileProductsAccordionOpen ? 'open' : ''}`} />
                      </button>
                      {mobileProductsAccordionOpen && (
                        <div className="mobile-accordion-body">
                          <a
                            href="#products"
                            className="mobile-sub-link all-products-link"
                            onClick={() => {
                              setSelectedCategorySlug('all');
                              setSelectedSubcategoryId('all');
                              closeMenu();
                            }}
                          >
                            <span>All Feed Formulations ({liveProducts.length})</span>
                            <span aria-hidden="true">→</span>
                          </a>
                          {liveCategories.map((cat) => (
                            <a
                              key={`mobile-cat-${cat.id}`}
                              href="#products"
                              className="mobile-sub-link category-link"
                              onClick={() => {
                                setSelectedCategorySlug(cat.slug);
                                setSelectedSubcategoryId('all');
                                closeMenu();
                              }}
                            >
                              <span>{cat.name}</span>
                              <span className="badge-mini">{cat.category_badge}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.url && item.url.startsWith('/')) {
                  return (
                    <Link
                      key={`mobile-${item.id}`}
                      className="mobile-nav-link"
                      to={item.url}
                      target={item.target || '_self'}
                      onClick={closeMenu}
                    >
                      <span>{item.label}</span>
                      <span className="mobile-chevron" aria-hidden="true">→</span>
                    </Link>
                  );
                }

                return (
                  <a
                    key={`mobile-${item.id}`}
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                    href={item.url}
                    target={item.target || '_self'}
                    onClick={closeMenu}
                  >
                    <span>{item.label}</span>
                    <span className="mobile-chevron" aria-hidden="true">→</span>
                  </a>
                );
              })}
            </nav>

            <div className="mobile-drawer-actions">
              <a href="#dealer" className="mobile-cta-btn" onClick={closeMenu}>
                Become a Dealer <span aria-hidden="true">↗</span>
              </a>
              {session ? (
                <Link to="/today" className="mobile-login-btn" onClick={closeMenu}>
                  CRM Dashboard <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <Link to="/login" className="mobile-login-btn" onClick={closeMenu}>
                  Staff & Dealer Login <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer Backdrop */}
        {menuOpen && (
          <div
            className="mobile-nav-backdrop"
            aria-hidden="true"
            onClick={closeMenu}
          />
        )}
      </header>

      {/* Main Website Sections */}
      <main id="main-content">
        {/* 1. Hero Section */}
        <section className="hero-section" id="home">
          <div className="hero-backdrop" role="img" aria-label="Healthy dairy cattle in green Indian pasture at sunrise"></div>
          <div className="hero-overlay"></div>

          <div className="hero-container">
            <div className="hero-content reveal">
              <div className="hero-eyebrow">
                <span className="pulse-indicator"></span>
                <span>{heroContent.eyebrow}</span>
              </div>
              <p className="hero-motto">NOURISH THE HERD • NURTURE THE FUTURE</p>
              <h1 className="hero-title">
                Better nutrition.<br />
                <em className="hero-title-accent">Stronger dairy.</em>
              </h1>
              <p className="hero-description">{heroContent.subtitle}</p>

              <div className="hero-btn-row">
                <a className="btn btn-primary" href={heroContent.primaryCtaUrl}>
                  {heroContent.primaryCtaText}
                </a>
                <a className="btn btn-outline" href={heroContent.secondaryCtaUrl}>
                  {heroContent.secondaryCtaText}
                </a>
              </div>
            </div>

            {/* Hero Base Stats Banner */}
            <div className="hero-stats-bar">
              <div className="stat-item">
                <span className="stat-label">FORMULATION</span>
                <span className="stat-value">100% Balanced Ration</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-label">DAIRY FOCUS</span>
                <span className="stat-value">High Fat & SNF Milk Support</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-label">PARTNERSHIP</span>
                <span className="stat-value">Trusted by Progressive Farmers</span>
              </div>
            </div>
          </div>

          <a href="#about" className="hero-scroll-cue" aria-label="Scroll to learn more about Shubh Labh">
            <span className="scroll-arrow">↓</span>
            <span>SCROLL TO EXPLORE</span>
          </a>
        </section>

        {/* 2. Trust Strip */}
        <section className="trust-strip" aria-label="Key Brand Pillars">
          <div className="trust-container">
            <div className="trust-pillar">
              <span className="pillar-icon">✳</span>
              <div className="pillar-text">
                <strong>Farmer-First Thinking</strong>
                <span>Crafted for real ground-level dairy conditions</span>
              </div>
            </div>
            <div className="trust-pillar">
              <span className="pillar-icon">◈</span>
              <div className="pillar-text">
                <strong>Nutrition-Led Science</strong>
                <span>Rumen-balanced energy & bypass protein</span>
              </div>
            </div>
            <div className="trust-pillar">
              <span className="pillar-icon">⌁</span>
              <div className="pillar-text">
                <strong>Quality-Minded Processes</strong>
                <span>Consistent raw material inspection & pelleting</span>
              </div>
            </div>
            <div className="trust-pillar">
              <span className="pillar-icon">↗</span>
              <div className="pillar-text">
                <strong>Growing Together</strong>
                <span>Reliable dealer partnerships & dedicated support</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Intro / About Section */}
        <section className="about-section section-padding" id="about">
          <div className="container about-grid">
            <div className="about-media reveal">
              <div className="about-image-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=1200&q=85"
                  alt="Healthy dairy cattle herd on a modern Indian farm"
                  width="1200"
                  height="800"
                  loading="lazy"
                  decoding="async"
                />
                <div className="about-badge-seal">
                  <div className="seal-hindi">शुभ लाभ</div>
                  <div className="seal-text">
                    <strong>Rooted in Trust</strong>
                    <span>Focused on Progress</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="about-content reveal">
              <div className="section-eyebrow">
                <span className="eyebrow-dash"></span>
                <span>Welcome to Shubh Labh</span>
              </div>
              <h2 className="section-heading">
                For every farmer's effort,<br />
                <em className="heading-accent">there is a bigger dream.</em>
              </h2>
              <p className="lead-text">
                Dairy farming is built on relentless daily dedication. We believe livestock nutrition should be approached with the same care, consistency, and uncompromising commitment.
              </p>
              <p className="body-text">
                Shubh Labh brings together premium cattle-feed manufacturing and specialized dairy nutrition solutions with a farmer-focused outlook. Our goal is to empower dairy owners and milk producers with formulations that optimize digestion, sustain peak lactation, and safeguard maternal cattle health.
              </p>

              <div className="about-points">
                <div className="point-item">
                  <span className="point-check">✓</span>
                  <span>Scientific bypass protein & energy ratios tailored for indigenous and crossbred cows</span>
                </div>
                <div className="point-item">
                  <span className="point-check">✓</span>
                  <span>Enriched with essential bio-available minerals and vitamins for reproductive vigor</span>
                </div>
                <div className="point-item">
                  <span className="point-check">✓</span>
                  <span>Consistent batch quality tested to maintain uniform dry matter intake</span>
                </div>
              </div>

              <div className="about-actions">
                <a className="btn btn-secondary" href="#products">
                  Explore Products <span>→</span>
                </a>
                <Link to="/laboratory" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Tour In-House Lab 🔬
                </Link>
                <a className="link-subtle" href="#dealer">
                  Become a Distribution Partner ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Products Section */}
        <section className="products-section section-padding" id="products">
          <div className="container">
            <div className="section-header-row reveal">
              <div>
                <div className="section-eyebrow">
                  <span className="eyebrow-dash"></span>
                  <span>Precision Cattle Formulations</span>
                </div>
                <h2 className="section-heading">
                  Nutrition for every<br />
                  <em className="heading-accent">step of the lactation journey.</em>
                </h2>
              </div>
              <p className="section-header-desc">
                Explore our cattle feed and specialized dairy nutrition range. Formulated under stringent manufacturing standards to support milk yield, fat content, and overall herd vitality.
              </p>
            </div>

            {/* Catalog Controls: Search, Category & Subcategory Filter Pills */}
            <div className="catalog-controls-container reveal">
              <div className="catalog-search-row">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    id="catalog-live-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search feed formulations, ingredients, or pack sizes..."
                    aria-label="Search product catalogue"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="btn-icon"
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="category-filter-pills" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCategorySlug === 'all'}
                    className={`filter-pill cat-pill ${selectedCategorySlug === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategorySlug('all');
                      setSelectedSubcategoryId('all');
                    }}
                  >
                    <span>All Formulations</span>
                    <span className="pill-count">({liveProducts.length})</span>
                  </button>

                  {liveCategories.map((cat) => {
                    const isCatActive = selectedCategorySlug === cat.slug;
                    const catCount = liveProducts.filter((p) => p.category_id === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={isCatActive}
                        className={`filter-pill cat-pill ${isCatActive ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategorySlug(cat.slug);
                          setSelectedSubcategoryId('all');
                        }}
                      >
                        <span>{cat.name}</span>
                        {catCount > 0 && <span className="pill-count">({catCount})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategories Row (shown when a specific category is active) */}
              {activeSubcategories.length > 0 && (
                <div className="subcategory-filter-row animate-fade-in" aria-label="Subcategory filter">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--green-primary)', alignSelf: 'center', marginRight: '6px' }}>
                    Subcategory:
                  </span>
                  <button
                    type="button"
                    className={`subcat-pill ${selectedSubcategoryId === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedSubcategoryId('all')}
                  >
                    All {activeCategoryObj?.name}
                  </button>
                  {activeSubcategories.map((subcat) => (
                    <button
                      key={subcat.id}
                      type="button"
                      className={`subcat-pill ${selectedSubcategoryId === String(subcat.id) ? 'active' : ''}`}
                      onClick={() => setSelectedSubcategoryId(String(subcat.id))}
                    >
                      {subcat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Cards Grid */}
            <div className="product-cards-grid">
              {filteredProducts && filteredProducts.length > 0 ? (
                filteredProducts.map((prod, index) => {
                  const categoryObj = liveCategories.find((c) => c.id === prod.category_id);
                  const subcategoryObj = liveSubcategories.find((s) => s.id === prod.subcategory_id);
                  const badgeLabel = categoryObj?.category_badge || categoryObj?.name?.toUpperCase() || 'CATTLE FEED';
                  const isFeatured = prod.is_featured || index === 0;

                  return (
                    <article key={prod.id || prod.slug} className={`product-card ${isFeatured ? 'featured' : ''} reveal is-visible`}>
                      <div className="card-visual-wrapper">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="product-card-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="feed-sack-mockup">
                            <div className="sack-pattern"></div>
                            <div className="sack-seal-box">
                              <span className="sack-hindi">शुभ लाभ</span>
                              <strong className="sack-brand">SHUBH LABH</strong>
                            </div>
                            <div className="sack-name">{prod.name.replace(/Shubh Labh /i, '').toUpperCase()}</div>
                            <div className="sack-bottom-strip">
                              <span>{prod.pack_sizes || prod.packaging_desc?.slice(0, 20) || '50 KG NET'}</span>
                              <span>DAIRY FEED</span>
                            </div>
                          </div>
                        )}
                        <span className="product-category-badge">{badgeLabel}</span>
                      </div>

                      <div className="card-info-wrapper">
                        <div className="card-meta">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="card-index">0{index + 1} / {badgeLabel}</span>
                            {subcategoryObj && (
                              <span style={{ fontSize: '10.5px', color: 'var(--gold-accent)', fontWeight: '700' }}>
                                {subcategoryObj.name}
                              </span>
                            )}
                          </div>
                          <h3 className="card-title product-card-title">{prod.name}</h3>
                          <p className="card-description">{prod.short_description}</p>
                          {(prod.packaging_desc || prod.pack_sizes) && (
                            <div className="card-specs">
                              <span className="spec-icon">📦</span>
                              <span className="spec-text">{prod.packaging_desc || prod.pack_sizes}</span>
                            </div>
                          )}
                        </div>

                        <div className="product-actions-dual">
                          <Link
                            to={`/products/${prod.slug}`}
                            className="btn-specs"
                            aria-label={`View specifications for ${prod.name}`}
                          >
                            <span>View Specs</span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>

                          <a
                            href={getWhatsAppProductLink(prod.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-enquire"
                            aria-label={`Enquire about ${prod.name} on WhatsApp`}
                          >
                            <span>WhatsApp</span>
                            <span className="btn-arrow" aria-hidden="true">↗</span>
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '3rem 1rem', textAlign: 'center', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(18,61,38,0.2)' }}>
                  <Package size={36} color="var(--green-primary)" style={{ margin: '0 auto 12px' }} />
                  <h4>No feed formulations match your filter</h4>
                  <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Try searching with another keyword or clear the active category filters.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      setSelectedCategorySlug('all');
                      setSelectedSubcategoryId('all');
                      setSearchQuery('');
                    }}
                  >
                    Reset Catalogue Filters
                  </button>
                </div>
              )}
            </div>

            <div className="products-footer-cta reveal">
              <span className="cta-prompt">Looking for custom bulk formulations or regional dealership supply?</span>
              <a className="btn btn-secondary" href="#contact">
                Speak to our Nutrition Specialists ↗
              </a>
            </div>
          </div>
        </section>

        {/* 5. Statement Section / Brand Conviction */}
        <section className="statement-section" aria-label="Our Philosophy">
          <div className="statement-container reveal">
            <div className="section-eyebrow light">
              <span className="eyebrow-dash light"></span>
              <span>Our Guiding Conviction</span>
            </div>
            <h2 className="statement-heading">
              When the herd thrives,<br />
              <em className="statement-accent">the whole farming family prospers.</em>
            </h2>
            <p className="statement-text">
              Responsible dairy decisions begin with consistent nutrition, balanced rations, and trusted partnerships. We stand beside India's dairy champions at every milking.
            </p>
            <div className="statement-btn-box">
              <a className="btn btn-primary" href="#knowledge">
                Explore Dairy Knowledge ↗
              </a>
            </div>
          </div>
        </section>

        {/* 6. Values Section */}
        <section className="values-section section-padding">
          <div className="container">
            <div className="section-header-row reveal">
              <div>
                <div className="section-eyebrow">
                  <span className="eyebrow-dash"></span>
                  <span>Core Values</span>
                </div>
                <h2 className="section-heading">
                  Grounded in ethics.<br />
                  <em className="heading-accent">Driven by performance.</em>
                </h2>
              </div>
              <p className="section-header-desc">
                Our operations honor the daily realities of livestock caretakers, combining authentic care with scientifically backed nutritional engineering.
              </p>
            </div>

            <div className="values-grid">
              <article className="value-card reveal">
                <span className="value-num">01</span>
                <div className="value-icon-box">✳</div>
                <h3 className="value-title">Farmer at the Center</h3>
                <p className="value-desc">Every recipe, pellet diameter, and packaging specification is designed around what works practically in the cowshed.</p>
                <div className="value-footer-bar"></div>
              </article>

              <article className="value-card reveal">
                <span className="value-num">02</span>
                <div className="value-icon-box">◈</div>
                <h3 className="value-title">Consistent Quality</h3>
                <p className="value-desc">Strict incoming grain testing, toxin binding, and computer-controlled blending guarantee batch-to-batch nutritional uniformity.</p>
                <div className="value-footer-bar"></div>
              </article>

              <article className="value-card reveal">
                <span className="value-num">03</span>
                <div className="value-icon-box">↗</div>
                <h3 className="value-title">Prospering Together</h3>
                <p className="value-desc">We foster transparent, long-term relationships with our distributors, dealers, dairy cooperatives, and farmers.</p>
                <div className="value-footer-bar"></div>
              </article>
            </div>
          </div>
        </section>

        {/* 7. Knowledge Section */}
        <section className="knowledge-section section-padding" id="knowledge">
          <div className="container">
            <div className="knowledge-header-row reveal">
              <div>
                <div className="section-eyebrow light">
                  <span className="eyebrow-dash light"></span>
                  <span>Dairy Knowledge Hub</span>
                </div>
                <h2 className="section-heading light-heading">
                  Better knowledge.<br />
                  <em className="heading-accent">Better dairy decisions.</em>
                </h2>
              </div>
              <p className="knowledge-header-desc">
                Practical, science-based insights to help dairy farmers optimize dry matter intake, balance green fodder variations, and maintain lactation longevity.
              </p>
            </div>

            <div className="knowledge-cards-grid">
              {liveArticles && liveArticles.length > 0 ? (
                liveArticles.map((art, idx) => (
                  <article key={art.id} className={`knowledge-card ${idx === 0 ? 'prominent' : ''} reveal is-visible`}>
                    <div className="knowledge-card-media">
                      <img
                        src={idx === 0
                          ? 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=85'
                          : 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=85'}
                        alt={art.title}
                        width="1200"
                        height="800"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="knowledge-card-tag">0{idx + 1} / {art.category ? art.category.toUpperCase() : 'NUTRITION'}</span>
                    </div>
                    <div className="knowledge-card-body">
                      <h3 className="knowledge-card-title">{art.title}</h3>
                      <p className="knowledge-card-summary">{art.summary}</p>
                      <a href="#contact" className="knowledge-read-btn">
                        <span>Learn More</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <>
                  <article className="knowledge-card prominent reveal">
                    <div className="knowledge-card-media">
                      <img
                        src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=85"
                        alt="Lush green dairy farmland pasture at sunrise - cattle ration routine"
                        width="1200"
                        height="800"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="knowledge-card-tag">01 / FEEDING BASICS</span>
                    </div>
                    <div className="knowledge-card-body">
                      <h3 className="knowledge-card-title">Building a balanced feeding routine for high-yield dairy animals</h3>
                      <p className="knowledge-card-summary">Understand the critical role of consistent dry matter intake, balanced roughage-to-concentrate ratios, and clean water availability in maintaining daily milk fat and SNF levels.</p>
                      <a href="#contact" className="knowledge-read-btn">
                        <span>Read Advisory</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </article>

                  <article className="knowledge-card reveal">
                    <div className="knowledge-card-media">
                      <img
                        src="https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=85"
                        alt="Healthy dairy cattle in shelter - herd care and nutrition"
                        width="900"
                        height="600"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="knowledge-card-tag">02 / HERD CARE</span>
                    </div>
                    <div className="knowledge-card-body">
                      <h3 className="knowledge-card-title">Transition management & seasonal dairy protection</h3>
                      <p className="knowledge-card-summary">Practical steps to safeguard cow metabolism during calving cycles and heat stress periods with tailored mineral and buffer supplementation.</p>
                      <a href="#contact" className="knowledge-read-btn">
                        <span>Read Advisory</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </article>
                </>
              )}
            </div>

            <p className="knowledge-disclaimer">
              Note: Dairy nutritional advisories are informational. Individual herd feeding programs and veterinary interventions should always be confirmed with a licensed animal nutritionist or veterinary officer.
            </p>
          </div>
        </section>

        {/* 8. Become a Dealer Section */}
        <section className="dealer-section section-padding" id="dealer">
          <div className="container">
            <div className="dealer-panel-card reveal">
              <div className="dealer-copy-column">
                <div className="section-eyebrow light">
                  <span className="eyebrow-dash light"></span>
                  <span>Commercial Dealership</span>
                </div>
                <h2 className="dealer-heading">
                  Let's take dairy<br />
                  <em className="heading-accent">nutrition further together.</em>
                </h2>
                <p className="dealer-description">
                  Expand your business with an established, trusted brand in dairy feeds. We offer our authorized distributors high product demand, reliable logistics, competitive margins, and active field marketing support.
                </p>

                <div className="dealer-perks-list">
                  <div className="perk-item">
                    <span className="perk-bullet">★</span>
                    <strong>Protected Territory & High Retailing Margins</strong>
                  </div>
                  <div className="perk-item">
                    <span className="perk-bullet">★</span>
                    <strong>Timely Factory Dispatches & Consistent Fresh Supply</strong>
                  </div>
                  <div className="perk-item">
                    <span className="perk-bullet">★</span>
                    <strong>On-Ground Veterinary & Farmer-Meeting Support</strong>
                  </div>
                </div>

                <div className="dealer-actions-row">
                  <a
                    className="btn btn-primary"
                    href={contactSettings.whatsapp
                      ? `https://wa.me/${contactSettings.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello Shubh Labh Team, I am interested in becoming an authorized cattle feed dealer in my region. Please share terms.')}`
                      : '#contact'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply for Dealership on WhatsApp ↗
                  </a>
                  <a className="btn btn-outline" href="#dealer-form-box">
                    Fill Application Form ↓
                  </a>
                </div>
              </div>

              <div className="dealer-graphic-column">
                <div className="dealer-orbital-art">
                  <div className="orbit-ring ring-1"></div>
                  <div className="orbit-ring ring-2"></div>
                  <div className="orbit-center-box">
                    <span className="orbit-hindi-top">शुभ</span>
                    <strong className="orbit-hindi-bottom">लाभ</strong>
                    <span className="orbit-sub">GROW TOGETHER</span>
                  </div>
                  <div className="orbit-badge">ESTABLISHED QUALITY</div>
                </div>
              </div>
            </div>

            {/* Embedded Commercial Dealer Application Form */}
            <div id="dealer-form-box" className="dealer-form-container-box reveal" style={{ marginTop: '2.5rem' }}>
              <BecomeDealerForm />
            </div>
          </div>
        </section>

        {/* 9. Contact & Helpline Section */}
        <section className="contact-section section-padding" id="contact">
          <div className="container">
            <div className="contact-grid">
              <div className="contact-intro-column reveal">
                <div className="section-eyebrow">
                  <span className="eyebrow-dash"></span>
                  <span>Connect With Our Team</span>
                </div>
                <h2 className="section-heading">
                  We're here to<br />
                  <em className="heading-accent">help your dairy thrive.</em>
                </h2>
                <p className="lead-text">
                  For dealership terms, bulk cattle feed supplies, product technical specifications, or general inquiries, reach out to our team directly.
                </p>
                <div className="contact-hours-box">
                  <strong>Operating Hours:</strong>
                  <span>Monday – Saturday: 9:00 AM to 6:30 PM (IST)</span>
                </div>

                <div className="contact-direct-channels-list" style={{ marginTop: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Channel 1: WhatsApp */}
                  <a
                    className="contact-card whatsapp-channel"
                    href={contactSettings.whatsapp
                      ? `https://wa.me/${contactSettings.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello Shubh Labh, I would like to enquire about your cattle feed products and dealership opportunities.')}`
                      : 'https://wa.me/?text=Hello%20Shubh%20Labh'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="channel-icon-box">💬</div>
                    <div className="channel-details">
                      <span className="channel-tag">DIRECT MESSAGING</span>
                      <strong className="channel-title">Chat on WhatsApp</strong>
                      <span className="channel-info">{contactSettings.whatsapp ? `Message us at ${contactSettings.whatsapp}` : 'Instant response for product & dealer queries'}</span>
                    </div>
                    <span className="channel-arrow">↗</span>
                  </a>

                  {/* Channel 2: Phone */}
                  {contactSettings.phone && (
                    <a className="contact-card phone-channel" href={`tel:${contactSettings.phone.replace(/[^0-9+]/g, '')}`}>
                      <div className="channel-icon-box">☎</div>
                      <div className="channel-details">
                        <span className="channel-tag">CUSTOMER HELPLINE</span>
                        <strong className="channel-title">Call {contactSettings.phone}</strong>
                        <span className="channel-info">Speak with our regional sales & technical representative</span>
                      </div>
                      <span className="channel-arrow">↗</span>
                    </a>
                  )}

                  {/* Channel 3: Email */}
                  {contactSettings.email && (
                    <a className="contact-card email-channel" href={`mailto:${contactSettings.email}`}>
                      <div className="channel-icon-box">✉</div>
                      <div className="channel-details">
                        <span className="channel-tag">OFFICIAL CORRESPONDENCE</span>
                        <strong className="channel-title">{contactSettings.email}</strong>
                        <span className="channel-info">For corporate, institutional, and tender requests</span>
                      </div>
                      <span className="channel-arrow">↗</span>
                    </a>
                  )}

                  {/* Channel 4: Plant / Office Location */}
                  {contactSettings.address && (
                    <div className="contact-card location-channel">
                      <div className="channel-icon-box">📍</div>
                      <div className="channel-details">
                        <span className="channel-tag">MANUFACTURING & OFFICE</span>
                        <strong className="channel-title">Registered Facility</strong>
                        <span className="channel-info">{contactSettings.address}</span>
                      </div>
                    </div>
                  )}

                  {/* Channel 5: CRM Staff Portal */}
                  <Link className="contact-card portal-channel" to="/login?destination=crm">
                    <div className="channel-icon-box">⌘</div>
                    <div className="channel-details">
                      <span className="channel-tag">INTERNAL TEAM PORTAL</span>
                      <strong className="channel-title">Open Shubh Labh CRM</strong>
                      <span className="channel-info">Secure access for staff, field officers, and administrators</span>
                    </div>
                    <span className="channel-arrow">→</span>
                  </Link>
                </div>
              </div>

              {/* Interactive Contact & Inquiries Form */}
              <div className="contact-form-column reveal">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Master Site Footer */}
      <footer className="site-footer">
        <div className="container footer-main-row">
          <div className="footer-brand-col">
            <a className="brand footer-brand" href="#top">
              <div className="brand-emblem light-emblem">
                <span className="emblem-hindi">शुभ</span>
                <span className="emblem-hindi">लाभ</span>
              </div>
              <div className="brand-text">
                <span className="brand-name light-text">SHUBH LABH</span>
                <span className="brand-tagline light-sub">DAIRY NUTRITION</span>
              </div>
            </a>
            <p className="footer-mission-text">
              Supporting thoughtful cattle nutrition and thriving dairy farming with uncompromising quality, scientific rations, and a farmer-first outlook.
            </p>
            <div className="footer-seal-note">
              <span>✳ Rooted in Trust • Growing with India</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-nav-list">
              <li><a href="#home">Home</a></li>
              <li><a href="#products">Product Catalog</a></li>
              <li><Link to="/laboratory">In-House Quality Lab ↗</Link></li>
              <li><a href="#about">About Our Story</a></li>
              <li><a href="#knowledge">Dairy Knowledge Hub</a></li>
              <li><a href="#dealer">Dealership Opportunities</a></li>
              <li><a href="#contact">Contact & Support</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Product Categories</h4>
            <ul className="footer-nav-list">
              <li><a href="#products">Balanced Cattle Pellets</a></li>
              <li><a href="#products">High-Yield Lactation Feeds</a></li>
              <li><a href="#products">Mineral & Vitamin Premixes</a></li>
              <li><a href="#products">Bypass Protein Nutrition</a></li>
              <li><a href="#products">Transition Cow Care</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Portals & Contact</h4>
            <ul className="footer-nav-list">
              <li><Link to="/login?destination=crm">CRM Staff Login ↗</Link></li>
              <li><Link to="/login?destination=website">Website Admin (CMS) ↗</Link></li>
              {contactSettings.whatsapp && (
                <li><a href={`https://wa.me/${contactSettings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp Desk ↗</a></li>
              )}
              {contactSettings.phone && (
                <li><a href={`tel:${contactSettings.phone.replace(/[^0-9+]/g, '')}`}>Helpline: {contactSettings.phone}</a></li>
              )}
            </ul>
          </div>
        </div>

        <div className="container footer-bottom-bar">
          <span className="copyright-text">
            © {currentYear} Shubh Labh Dairy Nutrition. All rights reserved.
          </span>
          <div className="footer-bottom-links">
            <a href="#products">Products</a>
            <span className="dot-sep">•</span>
            <Link to="/laboratory">In-House Lab</Link>
            <span className="dot-sep">•</span>
            <a href="#about">About Us</a>
            <span className="dot-sep">•</span>
            <a href="#dealer">Dealership</a>
            <span className="dot-sep">•</span>
            <Link to="/login">CRM Login</Link>
          </div>
          <a href="#top" className="back-to-top-btn" aria-label="Back to top of page">
            BACK TO TOP ↑
          </a>
        </div>
      </footer>
    </div>
  );
}
