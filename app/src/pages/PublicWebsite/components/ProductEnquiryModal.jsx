import React, { useState, useEffect } from 'react';
import { 
  X, Package, CheckCircle, AlertTriangle, Send, 
  MessageCircle, RefreshCw, MapPin, Phone 
} from 'lucide-react';
import { 
  submitWebsiteLead, 
  cleanPhoneNumber, 
  isValidIndianMobile 
} from '../../../lib/leadService';
import '../leadsForms.css';

export default function ProductEnquiryModal({ isOpen, onClose, product }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    district: '',
    quantity: '20 Bags',
    message: '',
    website_hp: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedLead, setSubmittedLead] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSubmittedLead(null);
      setSubmitError(null);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Please enter your full name.';
    }

    const cleanedPhone = cleanPhoneNumber(formData.phone);
    if (!cleanedPhone) {
      newErrors.phone = 'Mobile number is required.';
    } else if (!isValidIndianMobile(cleanedPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (!formData.district.trim()) {
      newErrors.district = 'Please enter your district or city.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await submitWebsiteLead({
        lead_type: 'product_enquiry',
        full_name: formData.full_name,
        phone: formData.phone,
        district: formData.district,
        product_name: product?.name || 'Cattle Feed',
        product_slug: product?.slug || 'cattle-feed',
        subject: `Product Inquiry: ${product?.name || 'Feed Formulation'} (${formData.quantity})`,
        message: `Quantity: ${formData.quantity}. District: ${formData.district}. Note: ${formData.message || 'No additional note'}.`,
        honeypot: formData.website_hp
      });

      setSubmittedLead(res.data || formData);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const waText = encodeURIComponent(
    `Hello Shubh Labh Team, I am inquiring about "${product?.name}". My name is ${formData.full_name || 'Dairy Farmer'} from ${formData.district || 'Rajasthan'}. Quantity needed: ${formData.quantity}.`
  );

  return (
    <div className="lead-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lead-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lead-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              <Package size={14} /> PRODUCT INQUIRY & BOOKING
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {product?.name || 'Feed Formulation'}
            </h3>
            {product?.pack_sizes && (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Pack Sizes: {product.pack_sizes}</span>
            )}
          </div>
          <button
            type="button"
            className="lead-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="lead-modal-body">
          {submittedLead ? (
            <div className="lead-success-card" style={{ padding: '1.75rem 1rem' }}>
              <div className="lead-success-icon" style={{ width: '50px', height: '50px', marginBottom: '1rem' }}>
                <CheckCircle size={28} />
              </div>
              <h4 className="lead-success-title" style={{ fontSize: '1.25rem' }}>Inquiry Received!</h4>
              <p className="lead-success-desc" style={{ fontSize: '0.88rem' }}>
                Thank you, <strong>{submittedLead.full_name}</strong>. Our local territory officer will connect with you on <strong>{submittedLead.phone}</strong> regarding pricing, delivery logistics, and dealer availability for <strong>{product?.name}</strong>.
              </p>
              <div className="lead-success-actions">
                <a
                  href={`https://wa.me/919461924461?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-success-wa"
                >
                  <MessageCircle size={15} />
                  <span>Chat on WhatsApp</span>
                </a>
                <button type="button" onClick={onClose} className="btn-reset-form">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {submitError && (
                <div className="lead-error-banner" style={{ marginBottom: '1rem' }}>
                  <AlertTriangle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Honeypot field */}
              <div className="hp-trap-field" style={{ display: 'none' }} aria-hidden="true">
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website_hp}
                  onChange={(e) => setFormData({ ...formData, website_hp: e.target.value })}
                />
              </div>

              <div className="lead-form-grid">
                <div className="lead-form-group">
                  <label className="lead-label" htmlFor="prod-enq-name">Your Name *</label>
                  <input
                    type="text"
                    id="prod-enq-name"
                    className={`lead-input ${errors.full_name ? 'has-error' : ''}`}
                    placeholder="e.g. Suresh Meena"
                    value={formData.full_name}
                    onChange={(e) => {
                      setFormData({ ...formData, full_name: e.target.value });
                      if (errors.full_name) setErrors({ ...errors, full_name: null });
                    }}
                    required
                  />
                  {errors.full_name && <span className="lead-field-error">{errors.full_name}</span>}
                </div>

                <div className="lead-form-group">
                  <label className="lead-label" htmlFor="prod-enq-phone">Mobile Phone *</label>
                  <input
                    type="tel"
                    id="prod-enq-phone"
                    className={`lead-input ${errors.phone ? 'has-error' : ''}`}
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) setErrors({ ...errors, phone: null });
                    }}
                    maxLength={14}
                    required
                  />
                  {errors.phone && <span className="lead-field-error">{errors.phone}</span>}
                </div>
              </div>

              <div className="lead-form-grid">
                <div className="lead-form-group">
                  <label className="lead-label" htmlFor="prod-enq-district">District / City *</label>
                  <input
                    type="text"
                    id="prod-enq-district"
                    className={`lead-input ${errors.district ? 'has-error' : ''}`}
                    placeholder="e.g. Jaipur, Dausa, Sikar"
                    value={formData.district}
                    onChange={(e) => {
                      setFormData({ ...formData, district: e.target.value });
                      if (errors.district) setErrors({ ...errors, district: null });
                    }}
                    required
                  />
                  {errors.district && <span className="lead-field-error">{errors.district}</span>}
                </div>

                <div className="lead-form-group">
                  <label className="lead-label" htmlFor="prod-enq-qty">Estimated Quantity</label>
                  <select
                    id="prod-enq-qty"
                    className="lead-select"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  >
                    <option value="5–10 Bags">5–10 Bags (Trial Order)</option>
                    <option value="20–50 Bags">20–50 Bags</option>
                    <option value="50–100 Bags">50–100 Bags (Commercial Dairy)</option>
                    <option value="1 Truckload (10–16 Tons)">1 Truckload (10–16 Tons / Dealership)</option>
                  </select>
                </div>
              </div>

              <div className="lead-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="lead-label" htmlFor="prod-enq-msg">
                  <span>Questions / Requirements <span className="optional">(Optional)</span></span>
                </label>
                <textarea
                  id="prod-enq-msg"
                  className="lead-textarea"
                  rows={2}
                  placeholder="Mention cattle breed, current daily milk yield, or specific feeding advice needed..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-reset-form"
                  style={{ borderRadius: '10px', padding: '0.7rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lead-btn-submit"
                  disabled={isSubmitting}
                  style={{ width: 'auto', padding: '0.7rem 1.5rem', margin: 0 }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spinner-icon" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
