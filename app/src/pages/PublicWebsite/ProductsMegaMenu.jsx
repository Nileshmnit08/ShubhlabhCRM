import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Package, Sparkles } from 'lucide-react';

export default function ProductsMegaMenu({ 
  isOpen, 
  onClose, 
  categories = [], 
  subcategories = [], 
  products = [],
  onSelectProduct,
  onSelectCategory
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id || 1);
  const menuRef = useRef(null);

  // If categories change or open, ensure valid activeCategoryId
  useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.id === activeCategoryId)) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];
  const currentSubcategories = subcategories.filter((s) => s.category_id === activeCategoryId);
  const currentProducts = products.filter((p) => p.category_id === activeCategoryId);
  const featuredProduct = currentProducts.find((p) => p.is_featured) || currentProducts[0];

  return (
    <div 
      id="products-mega-menu"
      className="mega-menu-overlay"
      ref={menuRef}
      role="region"
      aria-label="Products Mega Menu"
    >
      <div className="mega-menu-container">
        {/* Column 1: Category Selector */}
        <div className="mega-menu-column mega-col-categories">
          <div className="mega-col-header">
            <span className="mega-header-eyebrow">CATALOGUE</span>
            <h4 className="mega-header-title">Product Categories</h4>
          </div>
          <ul className="mega-category-list" role="tablist">
            {categories.map((cat) => {
              const isSelected = cat.id === activeCategoryId;
              return (
                <li key={cat.id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`mega-category-item ${isSelected ? 'active' : ''}`}
                    onMouseEnter={() => setActiveCategoryId(cat.id)}
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      if (onSelectCategory) onSelectCategory(cat.slug);
                    }}
                  >
                    <div className="mega-cat-icon">{cat.icon || '🥛'}</div>
                    <div className="mega-cat-info">
                      <strong className="mega-cat-name">{cat.name}</strong>
                      <span className="mega-cat-badge">{cat.category_badge}</span>
                    </div>
                    <ArrowRight size={14} className="mega-cat-arrow" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mega-col-footer">
            <a 
              href="#products" 
              className="mega-view-all-link"
              onClick={onClose}
            >
              <span>Explore All Products</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Column 2: Subcategories & Product Range */}
        <div className="mega-menu-column mega-col-subcategories">
          <div className="mega-col-header">
            <span className="mega-header-eyebrow">FEED FORMULATIONS</span>
            <h4 className="mega-header-title">{currentCategory?.name || 'Formulations'}</h4>
            {currentCategory?.description && (
              <p className="mega-header-desc">{currentCategory.description}</p>
            )}
          </div>

          <div className="mega-subcategories-grid">
            {currentSubcategories.length > 0 ? (
              currentSubcategories.map((subcat) => {
                const subcatProducts = products.filter((p) => p.subcategory_id === subcat.id);
                return (
                  <div key={subcat.id} className="mega-subcat-group">
                    <h5 className="mega-subcat-title">{subcat.name}</h5>
                    <p className="mega-subcat-desc">{subcat.description}</p>
                    <ul className="mega-subcat-products">
                      {subcatProducts.slice(0, 4).map((prod) => (
                        <li key={prod.id}>
                          <Link
                            to={`/products/${prod.slug}`}
                            className="mega-product-link"
                            onClick={() => {
                              onClose();
                              if (onSelectProduct) onSelectProduct(prod);
                            }}
                          >
                            <span className="mega-product-dot"></span>
                            <span className="mega-product-name">{prod.name}</span>
                            {prod.is_featured && (
                              <span className="mega-tag-featured">★ Featured</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            ) : (
              <div className="mega-subcat-group">
                <ul className="mega-subcat-products">
                  {currentProducts.map((prod) => (
                    <li key={prod.id}>
                      <Link
                        to={`/products/${prod.slug}`}
                        className="mega-product-link"
                        onClick={() => {
                          onClose();
                          if (onSelectProduct) onSelectProduct(prod);
                        }}
                      >
                        <span className="mega-product-dot"></span>
                        <span className="mega-product-name">{prod.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Featured Spotlight */}
        {featuredProduct && (
          <div className="mega-menu-column mega-col-featured">
            <div className="mega-featured-card">
              <div className="mega-featured-badge">
                <Sparkles size={13} />
                <span>RECOMMENDED RATION</span>
              </div>
              <div className="mega-featured-sack-visual">
                <div className="mega-sack-mockup">
                  <div className="mega-sack-hindi">शुभ लाभ</div>
                  <strong className="mega-sack-title">{featuredProduct.name.replace(/Shubh Labh /i, '').toUpperCase()}</strong>
                  <span className="mega-sack-net">{featuredProduct.pack_sizes || '50 KG BAG'}</span>
                </div>
              </div>
              <div className="mega-featured-meta">
                <h5 className="mega-featured-title mega-spotlight-title">{featuredProduct.name}</h5>
                <p className="mega-featured-text">{featuredProduct.short_description}</p>
                <div className="mega-featured-actions">
                  <Link
                    to={`/products/${featuredProduct.slug}`}
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      onClose();
                      if (onSelectProduct) onSelectProduct(featuredProduct);
                    }}
                  >
                    <span>View Specifications</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
