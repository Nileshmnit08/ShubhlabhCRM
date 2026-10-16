import React, { useState, useEffect, useRef } from 'react';

const OFFICIAL_FB_PAGE_URL = 'https://www.facebook.com/shubhlabhcattlefeed';
const EMBED_PLUGIN_URL = 'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fshubhlabhcattlefeed&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId';

export default function FacebookGalleryModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('embed'); // 'embed' | 'info'
  const [isLoading, setIsLoading] = useState(true);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('');
  const timeoutRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Lazy-load iframe source upon modal open
      setIframeSrc(EMBED_PLUGIN_URL);
      setIsLoading(true);
      setIsIframeLoaded(false);
      setShowFallback(false);
      setActiveTab('embed');

      // 5.5 second guard timeout for adblock or privacy restrictions
      timeoutRef.current = setTimeout(() => {
        if (!isIframeLoaded) {
          setShowFallback(true);
          setIsLoading(false);
          setActiveTab('info');
        }
      }, 5500);

      // Focus close button for keyboard accessibility
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 60);
    } else {
      document.body.style.overflow = '';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIframeSrc('');
    }

    return () => {
      document.body.style.overflow = '';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleIframeLoad = () => {
    setIsIframeLoaded(true);
    setIsLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setShowFallback(true);
    setActiveTab('info');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleRetry = () => {
    setShowFallback(false);
    setIsLoading(true);
    setIsIframeLoaded(false);
    setActiveTab('embed');
    setIframeSrc('');
    setTimeout(() => {
      setIframeSrc(EMBED_PLUGIN_URL);
    }, 50);

    timeoutRef.current = setTimeout(() => {
      if (!isIframeLoaded) {
        setShowFallback(true);
        setIsLoading(false);
        setActiveTab('info');
      }
    }, 5500);
  };

  return (
    <div
      className="fb-modal-overlay is-open"
      id="fb-gallery-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-modal-title"
      aria-hidden={!isOpen}
    >
      <div className="fb-modal-backdrop" id="fb-modal-backdrop" onClick={onClose}></div>
      <div className="fb-modal-container" role="document">
        {/* Header */}
        <div className="fb-modal-header">
          <div className="fb-modal-heading-group">
            <div className="fb-modal-meta-tag">
              <svg className="fb-icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Verified Official Channel</span>
            </div>
            <h2 id="fb-modal-title" className="fb-modal-title">Shubh Labh Cattle Feed — Facebook Gallery</h2>
            <p className="fb-modal-subtitle">Official posts, photos and dairy videos • @shubhlabhcattlefeed</p>
          </div>
          <button
            type="button"
            className="fb-modal-close"
            id="fb-modal-close-btn"
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close Facebook Gallery"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Action & View Controls Bar */}
        <div className="fb-modal-action-bar">
          <a
            className="button button-orange fb-external-cta"
            href={OFFICIAL_FB_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>View All Photos & Videos on Facebook</span>
            <span aria-hidden="true">↗</span>
          </a>
          <div className="fb-embed-tabs" role="tablist" aria-label="Gallery view mode">
            <button
              type="button"
              className={`fb-tab-btn ${activeTab === 'embed' ? 'active' : ''}`}
              id="fb-tab-embed"
              role="tab"
              aria-selected={activeTab === 'embed'}
              aria-controls="fb-embed-container"
              onClick={() => {
                setActiveTab('embed');
                setShowFallback(false);
              }}
            >
              Embedded Feed
            </button>
            <button
              type="button"
              className={`fb-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              id="fb-tab-info"
              role="tab"
              aria-selected={activeTab === 'info'}
              aria-controls="fb-fallback-state"
              onClick={() => {
                setActiveTab('info');
                setShowFallback(true);
              }}
            >
              Direct Info
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="fb-modal-body">
          {/* Loading State Skeleton */}
          {isLoading && activeTab === 'embed' && (
            <div className="fb-loading-state" id="fb-loading-state" aria-live="polite">
              <div className="fb-spinner" aria-hidden="true"></div>
              <p className="fb-loading-text">Connecting to Shubh Labh Facebook Feed...</p>
              <span className="fb-loading-sub">Loading official posts, photos and cattle nutrition videos</span>
            </div>
          )}

          {/* Embedded Meta Page Plugin Frame */}
          {activeTab === 'embed' && !showFallback && (
            <div className="fb-embed-container" id="fb-embed-container" role="tabpanel" aria-labelledby="fb-tab-embed" style={{ display: isLoading ? 'none' : 'flex' }}>
              <iframe
                id="fb-page-iframe"
                className="fb-page-iframe"
                title="Shubh Labh Cattle Feed — Facebook Gallery"
                src={iframeSrc}
                width="500"
                height="580"
                scrolling="no"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
          )}

          {/* Helpful Branded Fallback (shown if blocked, timeout, or user toggles tab) */}
          {(showFallback || activeTab === 'info') && (
            <div className="fb-fallback-state" id="fb-fallback-state" role="tabpanel" aria-labelledby="fb-tab-info">
              <div className="fb-fallback-card">
                <div className="fb-fallback-brandmark" aria-hidden="true">
                  <span>शुभ</span><span>लाभ</span>
                </div>
                <h3 className="fb-fallback-headline">Official Shubh Labh Facebook Gallery</h3>
                <p className="fb-fallback-lead">
                  Watch cattle feeding ration advice, field demonstrations, bag quality checks, farmer testimonials, and latest company updates directly on our official page.
                </p>
                <div className="fb-fallback-features">
                  <div className="fb-fallback-feature-item">
                    <span className="fb-feature-icon" aria-hidden="true">📸</span>
                    <span>Product Bags & Field Photos</span>
                  </div>
                  <div className="fb-fallback-feature-item">
                    <span className="fb-feature-icon" aria-hidden="true">🎥</span>
                    <span>Farmer Guidance & Dairy Videos</span>
                  </div>
                  <div className="fb-fallback-feature-item">
                    <span className="fb-feature-icon" aria-hidden="true">🌾</span>
                    <span>Ration Balancing & Nutrition Insights</span>
                  </div>
                  <div className="fb-fallback-feature-item">
                    <span className="fb-feature-icon" aria-hidden="true">📢</span>
                    <span>Official Announcements & Schemes</span>
                  </div>
                </div>
                <div className="fb-fallback-actions">
                  <a
                    className="button button-orange fb-fallback-primary-btn"
                    href={OFFICIAL_FB_PAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>View All Photos & Videos on Facebook</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                  <button
                    type="button"
                    className="fb-reload-embed-btn"
                    id="fb-retry-embed-btn"
                    onClick={handleRetry}
                  >
                    <span>↻ Retry Embedded Feed</span>
                  </button>
                </div>
                <div className="fb-fallback-disclaimer">
                  <p><strong>Browser Privacy Note:</strong> If the embedded feed does not appear above, your browser's ad-blocker or enhanced tracking protection may be shielding third-party cookies from Meta. You can always access all photos and videos directly on Facebook with one click.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="fb-modal-footer">
          <div className="fb-footer-address">
            <span>Official Page: </span>
            <a href={OFFICIAL_FB_PAGE_URL} target="_blank" rel="noopener noreferrer">facebook.com/shubhlabhcattlefeed ↗</a>
          </div>
          <button
            type="button"
            className="fb-modal-secondary-close"
            id="fb-modal-close-footer-btn"
            onClick={onClose}
          >
            Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
