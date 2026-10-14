import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, Package, ShieldCheck, 
  HelpCircle, Sparkles, MessageCircle, Share2, 
  ChevronRight, ExternalLink, Award, FileText
} from 'lucide-react';
import { 
  AUTHORITATIVE_PRODUCTS, 
  AUTHORITATIVE_CATEGORIES, 
  AUTHORITATIVE_SUBCATEGORIES, 
  getProductBySlug 
} from '../../lib/productCatalogueData';
import { supabase } from '../../lib/supabase';
import './publicWebsite.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [contactSettings, setContactSettings] = useState({
    phone: '',
    whatsapp: '',
    email: 'shubhlabhfeedinfo@gmail.com'
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    async function loadProductData() {
      setLoading(true);
      try {
        // 1. Fetch site settings for contact numbers
        const { data: sData } = await supabase.from('website_site_settings').select('*');
        if (sData) {
          const phone = sData.find((s) => s.setting_key === 'phone_number')?.setting_value;
          const whatsapp = sData.find((s) => s.setting_key === 'whatsapp_number')?.setting_value;
          const email = sData.find((s) => s.setting_key === 'public_email')?.setting_value || 'shubhlabhfeedinfo@gmail.com';
          setContactSettings({ phone, whatsapp, email });
        }

        // 2. Fetch live product from Supabase or fallback to verified data
        let currentProd = null;
        try {
          const { data: dbProd, error } = await supabase
            .from('website_products')
            .select('*')
            .eq('slug', slug)
            .single();
          if (!error && dbProd) {
            currentProd = dbProd;
          }
        } catch (e) {
          // fallback to baseline
        }

        if (!currentProd) {
          currentProd = getProductBySlug(slug, AUTHORITATIVE_PRODUCTS);
        }

        if (currentProd) {
          setProduct(currentProd);
          
          // Match category & subcategory
          const cat = AUTHORITATIVE_CATEGORIES.find((c) => c.id === currentProd.category_id);
          const subcat = AUTHORITATIVE_SUBCATEGORIES.find((s) => s.id === currentProd.subcategory_id);
          setCategory(cat);
          setSubcategory(subcat);

          // Find related products
          const related = AUTHORITATIVE_PRODUCTS.filter(
            (p) => p.category_id === currentProd.category_id && p.id !== currentProd.id
          ).slice(0, 3);
          setRelatedProducts(related);

          // Dynamic SEO meta
          document.title = currentProd.seo_title || `${currentProd.name} | Shubh Labh Cattle Feed`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && currentProd.seo_description) {
            metaDesc.setAttribute('content', currentProd.seo_description);
          }
        }
      } catch (err) {
        console.error('Error loading product detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProductData();
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const getWhatsAppLink = (prodName) => {
    const rawNum = contactSettings.whatsapp || contactSettings.phone || '919829000000';
    const cleanNum = rawNum.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Hello Shubh Labh Team, I am interested in ${prodName || product?.name}. Please share technical specifications, bag pricing, and dealer availability.`
    );
    return `https://wa.me/${cleanNum}?text=${msg}`;
  };

  if (loading) {
    return (
      <div className="product-detail-page loading-state">
        <div className="detail-loading-box">
          <div className="spinner"></div>
          <p>Loading nutritional specifications...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page not-found-state">
        <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <h2>Product Not Found</h2>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
            The requested feed formulation could not be found in our catalogue.
          </p>
          <Link to="/#products" className="btn btn-primary" style={{ marginTop: '2rem' }}>
            <ArrowLeft size={16} />
            <span>Return to Product Catalogue</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sl-public-website product-detail-page">
      {/* Detail Top Header */}
      <header className="site-header scrolled">
        <div className="header-container">
          <Link to="/" className="brand">
            <div className="brand-emblem">
              <span className="emblem-hindi">शुभ</span>
              <span className="emblem-hindi">लाभ</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">SHUBH LABH</span>
              <span className="brand-tagline">DAIRY NUTRITION</span>
            </div>
          </Link>

          <nav className="desktop-nav">
            <Link to="/#home" className="nav-link">Home</Link>
            <Link to="/#products" className="nav-link active">All Products</Link>
            <Link to="/laboratory" className="nav-link">In-House Lab</Link>
            <Link to="/#about" className="nav-link">About Us</Link>
            <Link to="/#dealer" className="nav-link">Become a Dealer</Link>
            <Link to="/#contact" className="nav-link">Contact</Link>
          </nav>

          <div className="header-actions">
            <Link to="/login?destination=crm" className="login-link">
              <span>Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="detail-main-wrapper">
        <div className="container">
          {/* Breadcrumbs */}
          <nav className="detail-breadcrumbs" aria-label="Breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <Link to="/#products">Products</Link>
            {category && (
              <>
                <ChevronRight size={14} />
                <span>{category.name}</span>
              </>
            )}
            <ChevronRight size={14} />
            <span className="current-crumb">{product.name}</span>
          </nav>

          {/* Product Hero Grid */}
          <div className="product-hero-card">
            {/* Visual Column */}
            <div className="product-hero-visual">
              <div className="detail-sack-mockup">
                <div className="detail-sack-header">
                  <div className="emblem-mini">शुभ लाभ</div>
                  <span className="brand-label">SHUBH LABH</span>
                </div>
                <div className="detail-sack-center">
                  <h3 className="detail-sack-name">{product.name.replace(/Shubh Labh /i, '').toUpperCase()}</h3>
                  <span className="detail-sack-sub">{subcategory?.name || category?.name || 'BALANCED DAIRY FEED'}</span>
                </div>
                <div className="detail-sack-footer">
                  <span>{product.pack_sizes || '50 KG NET'}</span>
                  <span>PREMIUM FEED</span>
                </div>
              </div>
              {product.is_featured && (
                <div className="detail-featured-badge">
                  <Sparkles size={14} />
                  <span>Featured Formulation</span>
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="product-hero-info">
              <div className="detail-category-strip">
                <span className="badge badge-category">{category?.category_badge || 'CATTLE FEED'}</span>
                {subcategory && (
                  <span className="badge badge-subcategory">{subcategory.name}</span>
                )}
              </div>

              <h1 className="detail-title product-detail-title">{product.name}</h1>
              <p className="detail-short-desc">{product.short_description}</p>

              <div className="detail-quick-specs">
                <div className="quick-spec-item">
                  <Package size={18} className="spec-ico" />
                  <div>
                    <span className="spec-label">Packaging</span>
                    <strong className="spec-val">{product.packaging_desc || product.pack_sizes || '50 kg Bag'}</strong>
                  </div>
                </div>
                <div className="quick-spec-item">
                  <ShieldCheck size={18} className="spec-ico" />
                  <div>
                    <span className="spec-label">Quality Standard</span>
                    <strong className="spec-val">Lab-Tested & Verified</strong>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="detail-action-buttons">
                <a
                  href={getWhatsAppLink(product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg btn-whatsapp whatsapp-enquiry-btn"
                >
                  <MessageCircle size={20} />
                  <span>Enquire on WhatsApp</span>
                  <ExternalLink size={16} />
                </a>

                <Link to="/#dealer" className="btn btn-secondary btn-lg">
                  <span>Apply for Dealership</span>
                </Link>

                <button 
                  type="button" 
                  onClick={handleShare} 
                  className="btn btn-ghost btn-share"
                  title="Share this product"
                >
                  <Share2 size={18} />
                  <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Deep Content: Specs & Feeding Guide */}
          <div className="detail-content-grid">
            {/* Left: Full Description & Specifications */}
            <div className="detail-specifications-section">
              <div className="detail-section-card">
                <h3 className="section-card-title">
                  <Award size={20} />
                  <span>Formulation Overview & Benefits</span>
                </h3>
                <div className="detail-body-text">
                  <p>{product.full_description || product.short_description}</p>
                </div>

                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div className="specifications-table-wrapper">
                    <h4 className="spec-table-title">Nutritional Composition & Parameters</h4>
                    <table className="specs-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Guaranteed Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(product.specifications).map(([key, val]) => (
                          <tr key={key}>
                            <td><strong>{key}</strong></td>
                            <td className="spec-val-highlight">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Feeding Instructions */}
              <div className="detail-section-card feeding-guide-box" style={{ marginTop: '2rem' }}>
                <h3 className="section-card-title">
                  <HelpCircle size={20} />
                  <span>Recommended Feeding Guidelines</span>
                </h3>
                <div className="detail-body-text">
                  <p>{product.feeding_guide || 'Feed according to animal body weight, current milk yield, and dry matter intake. Split into two feedings daily with adequate fresh water.'}</p>
                </div>
                <div className="advisory-callout">
                  <strong>Dairy Management Tip:</strong>
                  <span>Always transition feed gradually over 5–7 days by blending with existing rations to allow rumen microbes to adapt smoothly.</span>
                </div>
              </div>
            </div>

            {/* Right: Dealership & Related Products */}
            <div className="detail-sidebar-section">
              {/* Dealership Box */}
              <div className="dealer-pitch-card">
                <span className="card-kicker">COMMERCIAL INQUIRIES</span>
                <h4>Distribute {product.name}</h4>
                <p>We are expanding our retail distribution network across Rajasthan. Get in touch for wholesale terms, margin structures, and marketing support.</p>
                <Link to="/#dealer" className="btn btn-primary btn-block">
                  <span>Enquire for Dealership</span>
                </Link>
              </div>

              {/* Related Products */}
              {relatedProducts.length > 0 && (
                <div className="related-products-box">
                  <h4 className="related-title">Other {category?.name || 'Related'} Feeds</h4>
                  <div className="related-list">
                    {relatedProducts.map((rel) => (
                      <Link 
                        key={rel.id} 
                        to={`/products/${rel.slug}`} 
                        className="related-item"
                      >
                        <div className="related-sack-mini">
                          <span>शुभ लाभ</span>
                        </div>
                        <div className="related-info">
                          <strong>{rel.name}</strong>
                          <span>{rel.pack_sizes || '50 kg Bag'}</span>
                        </div>
                        <ChevronRight size={16} className="related-arrow" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Detail Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Shubh Labh Feeds Pvt. Ltd. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link to="/#products">Product Catalogue</Link>
              <Link to="/laboratory">In-House Lab</Link>
              <Link to="/#about">About Shubh Labh</Link>
              <Link to="/#contact">Contact Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
