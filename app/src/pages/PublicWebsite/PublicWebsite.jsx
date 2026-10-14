import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import './publicWebsite.css';

export default function PublicWebsite() {
  const { session } = useContext(AuthContext) || {};
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Dynamic CMS content states with verified baseline fallbacks
  const [announcementText, setAnnouncementText] = useState('Nutrition made with farmers in mind ✳ Serving dairy ambitions across Rajasthan');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [contactSettings, setContactSettings] = useState({
    phone: null,
    whatsapp: null,
    email: null,
    address: null
  });

  const [heroContent, setHeroContent] = useState({
    title: 'Better nutrition. Stronger dairy.',
    subtitle: 'Thoughtful cattle nutrition for the people who keep India\'s dairy story moving forward.',
    eyebrow: 'A partner in dairy progress',
    primaryCtaText: 'Explore our products ↗',
    primaryCtaUrl: '#products',
    secondaryCtaText: 'Discover Shubh Labh →',
    secondaryCtaUrl: '#about'
  });

  const [liveProducts, setLiveProducts] = useState(null);
  const [liveCategories, setLiveCategories] = useState([]);
  const [liveArticles, setLiveArticles] = useState(null);
  const [liveNav, setLiveNav] = useState(null);

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
          const ann = sData.find(s => s.setting_key === 'announcement_text');
          if (ann?.setting_value) setAnnouncementText(ann.setting_value);

          const annAct = sData.find(s => s.setting_key === 'announcement_active');
          if (annAct) setAnnouncementActive(annAct.setting_value !== '0');

          const phone = sData.find(s => s.setting_key === 'phone_number')?.setting_value;
          const whatsapp = sData.find(s => s.setting_key === 'whatsapp_number')?.setting_value;
          const email = sData.find(s => s.setting_key === 'public_email')?.setting_value;
          const address = sData.find(s => s.setting_key === 'postal_address')?.setting_value;
          setContactSettings({ phone, whatsapp, email, address });

          const metaTitle = sData.find(s => s.setting_key === 'meta_title')?.setting_value;
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
            subtitle: heroData.subtitle || heroData.body_text || 'Thoughtful cattle nutrition for the people who keep India\'s dairy story moving forward.',
            eyebrow: heroData.eyebrow || 'A partner in dairy progress',
            primaryCtaText: heroData.primary_cta_text || 'Explore our products ↗',
            primaryCtaUrl: heroData.primary_cta_url || '#products',
            secondaryCtaText: heroData.secondary_cta_text || 'Discover Shubh Labh →',
            secondaryCtaUrl: heroData.secondary_cta_url || '#about'
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

        // 4. Published Products
        const { data: pData } = await supabase
          .from('website_products')
          .select('*')
          .eq('status', 'published')
          .order('display_order', { ascending: true });
        if (pData && pData.length > 0) {
          setLiveProducts(pData);
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

        // 6. Navigation Items
        const { data: nData } = await supabase
          .from('website_navigation_items')
          .select('*')
          .eq('location', 'header')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (nData && nData.length > 0) {
          setLiveNav(nData);
        }
      } catch (err) {
        // Silent fallback to static verified baseline
        console.debug('CMS content fallback active:', err?.message || err);
      }
    }
    fetchPublishedContent();
  }, []);

  useEffect(() => {
    // 1. Scroll elevation listener
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 2. IntersectionObserver for reveal animations
    let revealObserver;
    const revealElements = document.querySelectorAll('.sl-public-website .reveal');
    if ('IntersectionObserver' in window && revealElements.length > 0) {
      revealObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -35px 0px' }
      );
      revealElements.forEach((el) => revealObserver.observe(el));
    } else {
      revealElements.forEach((el) => el.classList.add('is-visible'));
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
        { rootMargin: '-30% 0px -60% 0px' }
      );
      sections.forEach((s) => activeObserver.observe(s));
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (revealObserver) revealObserver.disconnect();
      if (activeObserver) activeObserver.disconnect();
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="sl-public-website">
      <a href="#home" className="skip-link">Skip to main content</a>
      
      {/* Announcement Bar */}
      {announcementActive && (
        <div className="announcement">
          <span className="announcement-dot"></span>
          {announcementText}
        </div>
      )}

      {/* Site Header */}
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`} id="top">
        <a className="brand" href="#top" aria-label="Shubh Labh home" onClick={closeMenu}>
          <span className="brand-mark"><span>शुभ</span><span>लाभ</span></span>
          <span className="brand-name">SHUBH LABH<small>DAIRY NUTRITION</small></span>
        </a>

        <button 
          className="menu-toggle" 
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} 
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
        </button>

        <nav className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          {liveNav && liveNav.length > 0 ? (
            liveNav.map((item) => (
              <a
                key={item.id}
                className={activeSection === item.url.replace('#', '') ? 'active' : ''}
                href={item.url}
                target={item.target || '_self'}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))
          ) : (
            <>
              <a className={activeSection === 'home' ? 'active' : ''} href="#home" onClick={closeMenu}>Home</a>
              <a className={activeSection === 'products' ? 'active' : ''} href="#products" onClick={closeMenu}>Products</a>
              <a className={activeSection === 'about' ? 'active' : ''} href="#about" onClick={closeMenu}>About us</a>
              <a className={activeSection === 'knowledge' ? 'active' : ''} href="#knowledge" onClick={closeMenu}>Knowledge</a>
              <a className={activeSection === 'dealer' ? 'active' : ''} href="#dealer" onClick={closeMenu}>Become a dealer</a>
              <a className={activeSection === 'contact' ? 'active' : ''} href="#contact" onClick={closeMenu}>Contact</a>
            </>
          )}
        </nav>

        {session ? (
          <Link to="/today" className="login-link" style={{background: 'var(--color-green-interactive)', color: 'var(--white)'}}>
            CRM Dashboard <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <Link to="/login" className="login-link">
            Login <span aria-hidden="true">↗</span>
          </Link>
        )}
      </header>

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section */}
        <section className="hero" id="home">
          <div className="hero-image" role="img" aria-label="Healthy dairy cattle in a green pasture"></div>
          <div className="hero-shade"></div>
          <div className="hero-content reveal">
            <div className="eyebrow light"><span></span> {heroContent.eyebrow}</div>
            <p className="hero-kicker">NOURISH THE HERD. NURTURE THE FUTURE.</p>
            <h1>Better nutrition.<br /><em>Stronger dairy.</em></h1>
            <p className="hero-copy">{heroContent.subtitle}</p>
            <div className="hero-actions">
              <a className="button button-orange" href={heroContent.primaryCtaUrl}>{heroContent.primaryCtaText}</a>
              <a className="text-link light-link" href={heroContent.secondaryCtaUrl}>{heroContent.secondaryCtaText}</a>
            </div>
          </div>
          <div className="hero-bottom">
            <span>01 / 03</span>
            <span className="hero-bottom-line"></span>
            <span>Nutrition • Care • Progress</span>
          </div>
          <a href="#about" className="scroll-cue"><span></span> SCROLL TO EXPLORE</a>
        </section>

        {/* Trust Strip */}
        <section className="trust-strip" aria-label="Our approach">
          <div><span className="trust-icon">✳</span><span>Farmer-first thinking</span></div>
          <div><span className="trust-icon">◈</span><span>Nutrition-led approach</span></div>
          <div><span className="trust-icon">⌁</span><span>Quality-minded processes</span></div>
          <div><span className="trust-icon">↗</span><span>Growing together</span></div>
        </section>

        {/* Intro / About Section */}
        <section className="intro section-pad" id="about">
          <div className="intro-visual reveal">
            <img 
              src="https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=1100&q=85" 
              alt="Dairy cattle herd grazing together on a farm" 
              width="1100" 
              height="733" 
              loading="lazy" 
              decoding="async" 
            />
            <div className="image-note">
              <span className="note-mark">शुभ लाभ</span>
              <span>Rooted in trust.<br />Focused on progress.</span>
            </div>
            <div className="image-index">01 <span>/</span> OUR STORY</div>
          </div>
          <div className="intro-copy reveal">
            <div className="eyebrow"><span></span> Welcome to Shubh Labh</div>
            <h2>For every farmer's effort,<br /><em>there is a bigger dream.</em></h2>
            <p className="lead">Dairy farming is built on daily dedication. We believe nutrition should be approached with the same care, consistency and commitment.</p>
            <p>Shubh Labh brings together cattle-feed products and dairy nutrition solutions with a farmer-focused outlook. Our goal is to help farmers and dairy businesses make informed choices for their herds.</p>
            <a className="text-link" href="#contact">Get to know us <span>→</span></a>
            <div className="intro-signoff">
              <span className="signoff-line"></span>
              <span>Growing with the dairy community</span>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="products section-pad" id="products">
          <div className="section-heading reveal">
            <div>
              <div className="eyebrow"><span></span> Made for dairy needs</div>
              <h2>Nutrition for every<br /><em>step of the journey.</em></h2>
            </div>
            <p>Explore our cattle feed and dairy nutrition range. Product details and specifications should always be confirmed against the latest approved packaging.</p>
          </div>

          <div className="product-grid">
            {liveProducts && liveProducts.length > 0 ? (
              liveProducts.map((prod, index) => {
                const categoryObj = liveCategories.find(c => c.id === prod.category_id);
                const badgeLabel = categoryObj?.category_badge || categoryObj?.name?.toUpperCase() || (index === 0 ? 'CATTLE FEED' : 'NUTRITION SUPPORT');
                const isFeature = index === 0;

                return (
                  <article key={prod.id} className={`product-card ${isFeature ? 'product-feature' : ''} reveal`}>
                    <div className={`product-image ${isFeature ? 'feed-image' : index % 2 === 1 ? 'premix-image' : 'mineral-image'}`}>
                      <span className="product-label">{badgeLabel}</span>
                      <div className="product-art">
                        <span className="art-sun"></span>
                        <span className="art-hill hill-one"></span>
                        <span className="art-hill hill-two"></span>
                        <span className={`art-bag ${isFeature ? '' : 'bag-small'}`}>
                          SHUBH<br />LABH
                          <small>{prod.name.replace(/Shubh Labh /i, '').toUpperCase()}</small>
                        </span>
                      </div>
                    </div>
                    <div className="product-info">
                      <div>
                        <span className="product-category">0{index + 1} / {badgeLabel}</span>
                        <h3>{prod.name}</h3>
                        <p>{prod.short_description}</p>
                        {prod.packaging_desc && (
                          <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                            {prod.packaging_desc}
                          </small>
                        )}
                      </div>
                      <a href="#contact" aria-label={`Enquire about ${prod.name}`} className="circle-arrow">↗</a>
                    </div>
                  </article>
                );
              })
            ) : (
              <>
                <article className="product-card product-feature reveal">
                  <div className="product-image feed-image">
                    <span className="product-label">CATTLE FEED</span>
                    <div className="product-art">
                      <span className="art-sun"></span>
                      <span className="art-hill hill-one"></span>
                      <span className="art-hill hill-two"></span>
                      <span className="art-bag">SHUBH<br />LABH<small>DAIRY SPECIAL</small></span>
                    </div>
                  </div>
                  <div className="product-info">
                    <div>
                      <span className="product-category">01 / DAILY NUTRITION</span>
                      <h3>Shubh Labh Dairy Special</h3>
                      <p>A core cattle-feed range for everyday dairy nutrition.</p>
                    </div>
                    <a href="#contact" aria-label="Enquire about Shubh Labh Dairy Special" className="circle-arrow">↗</a>
                  </div>
                </article>

                <article className="product-card reveal">
                  <div className="product-image premix-image">
                    <span className="product-label">NUTRITION SUPPORT</span>
                    <div className="product-art">
                      <span className="art-sun"></span>
                      <span className="art-hill hill-one"></span>
                      <span className="art-bag bag-small">SHUBH<br />LABH<small>PERFORMANCE<br />PREMIX</small></span>
                    </div>
                  </div>
                  <div className="product-info">
                    <div>
                      <span className="product-category">02 / PREMIX</span>
                      <h3>Performance Premix</h3>
                      <p>A nutrition premix designed for targeted formulation needs.</p>
                    </div>
                    <a href="#contact" aria-label="Enquire about Performance Premix" className="circle-arrow">↗</a>
                  </div>
                </article>

                <article className="product-card reveal">
                  <div className="product-image mineral-image">
                    <span className="product-label">SPECIALISED RANGE</span>
                    <div className="product-art">
                      <span className="art-sun"></span>
                      <span className="art-hill hill-one"></span>
                      <span className="art-hill hill-two"></span>
                      <span className="art-bag bag-small">SHUBH<br />LABH<small>DAIRY CARE</small></span>
                    </div>
                  </div>
                  <div className="product-info">
                    <div>
                      <span className="product-category">03 / DAIRY NUTRITION</span>
                      <h3>Specialised Nutrition</h3>
                      <p>Explore mineral and other nutrition solutions for dairy needs.</p>
                    </div>
                    <a href="#contact" aria-label="Enquire about specialised nutrition" className="circle-arrow">↗</a>
                  </div>
                </article>
              </>
            )}
          </div>

          <div className="products-foot">
            <span>Looking for a specific product?</span>
            <a className="button button-dark" href="#contact">Talk to our team <span>↗</span></a>
          </div>
        </section>

        {/* Statement Section */}
        <section className="statement">
          <div className="statement-bg"></div>
          <div className="statement-inner reveal">
            <div className="eyebrow light"><span></span> Our belief</div>
            <h2>When the herd thrives,<br /><em>the whole family moves forward.</em></h2>
            <p>Good dairy decisions begin with knowledge, consistency and care.</p>
            <a className="button button-orange" href="#knowledge">Explore dairy knowledge <span>↗</span></a>
          </div>
          <div className="statement-side">CARE IN EVERY CHOICE</div>
        </section>

        {/* Values Section */}
        <section className="values section-pad">
          <div className="section-heading reveal">
            <div>
              <div className="eyebrow"><span></span> What guides us</div>
              <h2>Grounded in values.<br /><em>Driven by progress.</em></h2>
            </div>
            <p>Our approach is built around the everyday realities of farmers, the importance of nutrition and long-term relationships.</p>
          </div>
          <div className="value-grid">
            <article className="value-card reveal">
              <span className="value-number">01</span>
              <div className="value-icon">✳</div>
              <h3>Farmer at the centre</h3>
              <p>We aim to keep products and communication relevant to the people who work with cattle every day.</p>
              <span className="value-rule"></span>
            </article>
            <article className="value-card reveal">
              <span className="value-number">02</span>
              <div className="value-icon">◈</div>
              <h3>Quality with care</h3>
              <p>Consistent processes and clear product information are important parts of responsible nutrition.</p>
              <span className="value-rule"></span>
            </article>
            <article className="value-card reveal">
              <span className="value-number">03</span>
              <div className="value-icon">↗</div>
              <h3>Progress together</h3>
              <p>We value lasting relationships with farmers, dealers and the wider dairy community.</p>
              <span className="value-rule"></span>
            </article>
          </div>
        </section>

        {/* Knowledge Section */}
        <section className="knowledge section-pad" id="knowledge">
          <div className="knowledge-top reveal">
            <div>
              <div className="eyebrow light"><span></span> Learn with Shubh Labh</div>
              <h2>Better knowledge.<br /><em>Better decisions.</em></h2>
            </div>
            <p>Simple, practical learning can help dairy farmers ask better questions and make more informed feeding choices.</p>
          </div>

          <div className="knowledge-grid">
            {liveArticles && liveArticles.length > 0 ? (
              liveArticles.map((art, idx) => (
                <a key={art.id} href="#contact" className={`knowledge-card ${idx === 0 ? 'knowledge-main' : ''} reveal`}>
                  <img 
                    src={idx === 0 
                      ? "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=85" 
                      : "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=85"} 
                    alt={art.title} 
                    width="1200" 
                    height="800" 
                    loading="lazy" 
                    decoding="async" 
                  />
                  <span className="knowledge-number">0{idx + 1} / {art.category ? art.category.toUpperCase() : 'NUTRITION'}</span>
                  <div className="knowledge-card-bottom">
                    <div>
                      <h3>{art.title}</h3>
                      <p>{art.summary}</p>
                    </div>
                    <span className="circle-arrow">↗</span>
                  </div>
                </a>
              ))
            ) : (
              <>
                <a href="#contact" className="knowledge-card knowledge-main reveal">
                  <img 
                    src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=85" 
                    alt="Open dairy farmland pasture at sunrise - cattle feeding ration routine" 
                    width="1200" 
                    height="800" 
                    loading="lazy" 
                    decoding="async" 
                  />
                  <span className="knowledge-number">01 / FEEDING BASICS</span>
                  <div className="knowledge-card-bottom">
                    <div>
                      <h3>Building a balanced feeding routine</h3>
                      <p>Understand why consistency and a balanced ration matter.</p>
                    </div>
                    <span className="circle-arrow">↗</span>
                  </div>
                </a>
                <a href="#contact" className="knowledge-card reveal">
                  <img 
                    src="https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=85" 
                    alt="Healthy dairy cow grazing in green meadow - herd care and nutrition" 
                    width="900" 
                    height="600" 
                    loading="lazy" 
                    decoding="async" 
                  />
                  <span className="knowledge-number">02 / HERD CARE</span>
                  <div className="knowledge-card-bottom">
                    <div>
                      <h3>Care across the dairy journey</h3>
                      <p>Learn about the changing needs of dairy animals.</p>
                    </div>
                    <span className="circle-arrow">↗</span>
                  </div>
                </a>
              </>
            )}
          </div>
          <p className="knowledge-disclaimer">Educational topics are introductory. Feeding plans and animal-health concerns should be discussed with a qualified nutritionist or veterinarian.</p>
        </section>

        {/* Dealer Section */}
        <section className="dealer section-pad" id="dealer">
          <div className="dealer-panel reveal">
            <div className="dealer-copy">
              <div className="eyebrow light"><span></span> Grow with us</div>
              <h2>Let's take dairy<br /><em>nutrition further.</em></h2>
              <p>Interested in becoming a Shubh Labh dealer or distribution partner? Start a conversation with our team.</p>
              <a className="button button-orange" href="#contact">Enquire about dealership <span>↗</span></a>
            </div>
            <div className="dealer-art">
              <div className="dealer-ring ring-one"></div>
              <div className="dealer-ring ring-two"></div>
              <div className="dealer-orbit">SHUBH LABH <span>✳</span> SHUBH LABH <span>✳</span></div>
              <div className="dealer-center">शुभ<br /><strong>लाभ</strong><small>GROW TOGETHER</small></div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact section-pad" id="contact">
          <div className="contact-copy reveal">
            <div className="eyebrow"><span></span> Start a conversation</div>
            <h2>We're here to<br /><em>help you connect.</em></h2>
            <p>For product information, dealership enquiries or general questions, reach out to the Shubh Labh team.</p>
            <Link className="text-link" to="/login?destination=crm">Team login <span>↗</span></Link>
          </div>
          <div className="contact-options reveal">
            <a 
              className="contact-option" 
              href={contactSettings.whatsapp 
                ? `https://wa.me/${contactSettings.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20Shubh%20Labh%2C%20I%20would%20like%20to%20know%20more.`
                : "https://wa.me/?text=Hello%20Shubh%20Labh%2C%20I%20would%20like%20to%20know%20more."} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="contact-icon">↗</span>
              <span>
                <small>QUICK ENQUIRY</small>
                <strong>Start a WhatsApp conversation</strong>
                <em>{contactSettings.whatsapp ? `Chat with us on ${contactSettings.whatsapp}` : 'Opens WhatsApp with a prefilled message'}</em>
              </span>
              <span className="contact-arrow">↗</span>
            </a>

            {contactSettings.phone && (
              <a className="contact-option" href={`tel:${contactSettings.phone.replace(/[^0-9+]/g, '')}`}>
                <span className="contact-icon">☎</span>
                <span>
                  <small>OFFICIAL HELPLINE</small>
                  <strong>Call {contactSettings.phone}</strong>
                  <em>Direct customer and dealer assistance</em>
                </span>
                <span className="contact-arrow">↗</span>
              </a>
            )}

            <Link className="contact-option" to="/login?destination=crm">
              <span className="contact-icon">⌘</span>
              <span>
                <small>EXISTING BUSINESS PORTAL</small>
                <strong>Open Shubh Labh CRM</strong>
                <em>For authorised team access</em>
              </span>
              <span className="contact-arrow">↗</span>
            </Link>

            {contactSettings.email && (
              <a className="contact-option" href={`mailto:${contactSettings.email}`}>
                <span className="contact-icon">✉</span>
                <span>
                  <small>EMAIL INQUIRIES</small>
                  <strong>{contactSettings.email}</strong>
                  <em>Official communications and dealership requests</em>
                </span>
                <span className="contact-arrow">↗</span>
              </a>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-top">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark"><span>शुभ</span><span>लाभ</span></span>
            <span className="brand-name">SHUBH LABH<small>DAIRY NUTRITION</small></span>
          </a>
          <p>Supporting thoughtful dairy nutrition<br />with a farmer-first approach.</p>
          <a href="#top" className="back-top">BACK TO TOP ↑</a>
        </div>
        <div className="footer-bottom">
          <span>© {currentYear} Shubh Labh. All rights reserved.</span>
          <div>
            <a href="#products">Products</a>
            <a href="#about">About</a>
            <a href="#dealer">Dealership</a>
            <Link to="/login?destination=crm">CRM Login ↗</Link>
          </div>
          <span className="footer-note">Website preview · Verify content before publishing</span>
        </div>
      </footer>
    </div>
  );
}
