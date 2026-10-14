import React, { useState } from 'react';
import { 
  Send, CheckCircle, AlertTriangle, MessageCircle, 
  Phone, Mail, RefreshCw, User, HelpCircle, FileText 
} from 'lucide-react';
import { 
  submitWebsiteLead, 
  cleanPhoneNumber, 
  isValidIndianMobile, 
  isValidEmail, 
  INQUIRY_SUBJECTS 
} from '../../../lib/leadService';
import '../leadsForms.css';

export default function ContactForm({ defaultSubject = '', onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    whatsapp: '',
    sameAsPhone: true,
    email: '',
    subject: defaultSubject || 'General Inquiry',
    message: '',
    preferred_contact: 'phone',
    website_hp: '' // Honeypot field for bot detection
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedLead, setSubmittedLead] = useState(null);

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      phone: val,
      whatsapp: prev.sameAsPhone ? val : prev.whatsapp
    }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
  };

  const handleSameAsPhoneToggle = (e) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      sameAsPhone: checked,
      whatsapp: checked ? prev.phone : ''
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Please enter your full name (minimum 2 characters).';
    }

    const cleanedPhone = cleanPhoneNumber(formData.phone);
    if (!cleanedPhone) {
      newErrors.phone = 'Mobile number is required.';
    } else if (!isValidIndianMobile(cleanedPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (formData.whatsapp && !formData.sameAsPhone) {
      const cleanedWA = cleanPhoneNumber(formData.whatsapp);
      if (!isValidIndianMobile(cleanedWA)) {
        newErrors.whatsapp = 'Please enter a valid 10-digit WhatsApp number.';
      }
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
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
        lead_type: 'contact_inquiry',
        full_name: formData.full_name,
        phone: formData.phone,
        whatsapp: formData.sameAsPhone ? formData.phone : formData.whatsapp,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        preferred_contact: formData.preferred_contact,
        honeypot: formData.website_hp
      });

      setSubmittedLead(res.data || formData);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setSubmitError(err.message || 'Unable to submit your inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      full_name: '',
      phone: '',
      whatsapp: '',
      sameAsPhone: true,
      email: '',
      subject: defaultSubject || 'General Inquiry',
      message: '',
      preferred_contact: 'phone',
      website_hp: ''
    });
    setErrors({});
    setSubmitError(null);
    setSubmittedLead(null);
  };

  if (submittedLead) {
    const waText = encodeURIComponent(
      `Hello Shubh Labh Team, I have just submitted a contact inquiry regarding "${submittedLead.subject || 'Cattle Feed'}" on your website. My name is ${submittedLead.full_name}.`
    );

    return (
      <div className="lead-form-card">
        <div className="lead-success-card">
          <div className="lead-success-icon">
            <CheckCircle size={32} />
          </div>
          <h3 className="lead-success-title">Inquiry Registered!</h3>
          <p className="lead-success-desc">
            Thank you, <strong>{submittedLead.full_name}</strong>. Your inquiry has been routed to our nutrition advisory team. We will call you on <strong>{submittedLead.phone}</strong> shortly.
          </p>

          <div className="lead-success-actions">
            <a
              href={`https://wa.me/919876543210?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-success-wa"
            >
              <MessageCircle size={16} />
              <span>Connect on WhatsApp Instantly</span>
            </a>
            <button type="button" onClick={handleReset} className="btn-reset-form">
              Send Another Query
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-form-card" id="contact-inquiry-form">
      <div className="lead-form-header">
        <span className="lead-form-eyebrow">
          <Send size={14} /> DIRECT INQUIRY INBOX
        </span>
        <h3 className="lead-form-title">Send Us a Direct Message</h3>
        <p className="lead-form-subtitle">
          Have questions regarding feed formulation, dealership terms, or bulk bookings? Fill in your details below.
        </p>
      </div>

      {submitError && (
        <div className="lead-error-banner">
          <AlertTriangle size={18} />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Anti-bot Honeypot field (hidden from screen readers & users) */}
        <div className="hp-trap-field" style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="website_hp_field">Do not fill this</label>
          <input
            type="text"
            id="website_hp_field"
            name="website_hp"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website_hp}
            onChange={(e) => setFormData({ ...formData, website_hp: e.target.value })}
          />
        </div>

        <div className="lead-form-grid">
          {/* Full Name */}
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="contact-name">
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              id="contact-name"
              className={`lead-input ${errors.full_name ? 'has-error' : ''}`}
              placeholder="e.g. Ramesh Chandra"
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value });
                if (errors.full_name) setErrors({ ...errors, full_name: null });
              }}
              required
            />
            {errors.full_name && <span className="lead-field-error">{errors.full_name}</span>}
          </div>

          {/* Phone Number */}
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="contact-phone">
              <span>Mobile Phone *</span>
            </label>
            <input
              type="tel"
              id="contact-phone"
              className={`lead-input ${errors.phone ? 'has-error' : ''}`}
              placeholder="10-digit number (e.g. 9829012345)"
              value={formData.phone}
              onChange={handlePhoneChange}
              maxLength={14}
              required
            />
            {errors.phone && <span className="lead-field-error">{errors.phone}</span>}

            <label className="lead-checkbox-wrap">
              <input
                type="checkbox"
                checked={formData.sameAsPhone}
                onChange={handleSameAsPhoneToggle}
              />
              <span>WhatsApp number is the same as mobile</span>
            </label>
          </div>
        </div>

        {/* WhatsApp & Email (conditional if WhatsApp is different) */}
        <div className="lead-form-grid">
          {!formData.sameAsPhone && (
            <div className="lead-form-group">
              <label className="lead-label" htmlFor="contact-whatsapp">
                <span>WhatsApp Number</span>
              </label>
              <input
                type="tel"
                id="contact-whatsapp"
                className={`lead-input ${errors.whatsapp ? 'has-error' : ''}`}
                placeholder="10-digit WhatsApp number"
                value={formData.whatsapp}
                onChange={(e) => {
                  setFormData({ ...formData, whatsapp: e.target.value });
                  if (errors.whatsapp) setErrors({ ...errors, whatsapp: null });
                }}
                maxLength={14}
              />
              {errors.whatsapp && <span className="lead-field-error">{errors.whatsapp}</span>}
            </div>
          )}

          <div className={`lead-form-group ${formData.sameAsPhone ? 'full-width' : ''}`}>
            <label className="lead-label" htmlFor="contact-email">
              <span>Email Address <span className="optional">(Optional)</span></span>
            </label>
            <input
              type="email"
              id="contact-email"
              className={`lead-input ${errors.email ? 'has-error' : ''}`}
              placeholder="e.g. yourname@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
            />
            {errors.email && <span className="lead-field-error">{errors.email}</span>}
          </div>
        </div>

        {/* Subject & Preferred Contact */}
        <div className="lead-form-grid">
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="contact-subject">
              <span>Inquiry Subject *</span>
            </label>
            <select
              id="contact-subject"
              className="lead-select"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            >
              {INQUIRY_SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="lead-form-group">
            <label className="lead-label">
              <span>Preferred Callback Method</span>
            </label>
            <div className="lead-radio-group">
              {[
                { id: 'phone', label: 'Phone Call', icon: Phone },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                { id: 'email', label: 'Email', icon: Mail }
              ].map(opt => {
                const Icon = opt.icon;
                const isActive = formData.preferred_contact === opt.id;
                return (
                  <label key={opt.id} className={`lead-radio-pill ${isActive ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="preferred_contact"
                      value={opt.id}
                      checked={isActive}
                      onChange={() => setFormData({ ...formData, preferred_contact: opt.id })}
                    />
                    <Icon size={13} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="lead-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="lead-label" htmlFor="contact-message">
            <span>Message / Questions</span>
          </label>
          <textarea
            id="contact-message"
            className="lead-textarea"
            rows={3}
            placeholder="Please describe your requirements, herd size, or location..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="lead-btn-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={18} className="spinner-icon" />
              <span>Registering Inquiry...</span>
            </>
          ) : (
            <>
              <span>Submit Inquiry</span>
              <Send size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
