import React, { useEffect } from 'react';
import { X, BookOpen, Clock, Calendar, CheckCircle2, ExternalLink, MessageCircle, FileText, Share2 } from 'lucide-react';
import '../publicWebsite.css';

export default function KnowledgeArticleModal({ article, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !article) return null;

  const handleShare = async () => {
    const url = `${window.location.origin}/#knowledge`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `Check out this cattle feed research paper: ${article.title}`,
          url
        });
      } catch (err) {
        // Ignored or cancelled
      }
    } else {
      navigator.clipboard.writeText(`${article.title}\n${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Shubh Labh Team, I was reading your research paper "${article.title}" in the Dairy Knowledge Hub and would like to discuss nutritional formulation for my herd.`
  );
  const whatsappUrl = `https://wa.me/919461924461?text=${whatsappMessage}`;

  return (
    <div className="knowledge-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-article-title">
      <div className="knowledge-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="knowledge-modal-header">
          <div className="knowledge-modal-badges">
            <span className="knowledge-modal-category">
              <BookOpen size={12} className="inline-icon" />
              {article.category || 'DAIRY NUTRITION'}
            </span>
            <span className="knowledge-modal-year">
              <Calendar size={12} className="inline-icon" />
              {article.year || '2024'}
            </span>
            <span className="knowledge-modal-verified">
              <CheckCircle2 size={12} className="inline-icon" />
              Peer-Reviewed Summary
            </span>
          </div>
          <button 
            type="button" 
            className="knowledge-modal-close-btn" 
            onClick={onClose}
            aria-label="Close research reader"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Title Banner */}
        <div className="knowledge-modal-hero">
          <h2 id="modal-article-title" className="knowledge-modal-title">
            {article.title}
          </h2>
          <div className="knowledge-modal-meta">
            <span className="meta-item">
              <Clock size={14} />
              {article.read_time || '4 min read'}
            </span>
            <span className="meta-separator">•</span>
            <span className="meta-item">
              <FileText size={14} />
              Published Reference Library
            </span>
          </div>
        </div>

        {/* Modal Article Body */}
        <div className="knowledge-modal-body">
          {/* Executive Summary */}
          <div className="knowledge-modal-summary-box">
            <strong>Executive Abstract:</strong> {article.summary}
          </div>

          {/* Structured Scientific Content */}
          <div 
            className="knowledge-modal-html-content"
            dangerouslySetInnerHTML={{ __html: article.content_body }} 
          />

          {/* Research Disclaimer */}
          <div className="knowledge-modal-disclaimer">
            <strong>Nutritional Note:</strong> This summary reflects published peer-reviewed findings in bovine nutrition science. Commercial ration adjustments should consider herd lactation stages, local fodder availability, and guidance from qualified veterinary or nutritional advisors.
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="knowledge-modal-footer">
          <div className="footer-left">
            <button type="button" className="btn-modal-share" onClick={handleShare}>
              <Share2 size={15} />
              <span>Share Research</span>
            </button>
          </div>
          <div className="footer-right">
            <button type="button" className="btn-modal-close" onClick={onClose}>
              Close
            </button>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-modal-action"
            >
              <MessageCircle size={16} />
              <span>Discuss Formulation on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
