import React, { useState } from 'react';
import { 
  Briefcase, CheckCircle, AlertTriangle, MessageCircle, 
  MapPin, Building, ShieldCheck, RefreshCw, Send, Check 
} from 'lucide-react';
import { 
  submitWebsiteLead, 
  cleanPhoneNumber, 
  isValidIndianMobile, 
  isValidEmail, 
  RAJASTHAN_DISTRICTS, 
  TARGET_STATES, 
  BUSINESS_TYPES, 
  MONTHLY_VOLUMES, 
  INVESTMENT_RANGES, 
  GODOWN_CAPACITIES 
} from '../../../lib/leadService';
import '../leadsForms.css';

export default function BecomeDealerForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    firm_name: '',
    phone: '',
    whatsapp: '',
    sameAsPhone: true,
    email: '',
    state: 'Rajasthan',
    district: 'Jaipur',
    city_tehsil: '',
    pincode: '',
    business_type: 'Feed & Agro Retailer',
    experience_years: '3–5 Years',
    monthly_volume: '10–25 Tons (200–500 bags/mo)',
    investment_capacity: '₹5 – ₹10 Lakhs',
    godown_capacity: '500 – 1,500 sq ft (300–1,000 bags)',
    proposed_area: '',
    website_hp: ''
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
      newErrors.full_name = 'Please enter your full name.';
    }

    if (!formData.firm_name.trim()) {
      newErrors.firm_name = 'Please enter your business or firm name.';
    }

    const cleanedPhone = cleanPhoneNumber(formData.phone);
    if (!cleanedPhone) {
      newErrors.phone = 'Mobile phone number is required.';
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

    if (!formData.district.trim()) {
      newErrors.district = 'Please select or enter your district.';
    }

    if (!formData.city_tehsil.trim()) {
      newErrors.city_tehsil = 'Please enter your city, town or tehsil.';
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be 6 digits (e.g. 302001).';
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
        lead_type: 'dealer_application',
        full_name: formData.full_name,
        firm_name: formData.firm_name,
        phone: formData.phone,
        whatsapp: formData.sameAsPhone ? formData.phone : formData.whatsapp,
        email: formData.email,
        state: formData.state,
        district: formData.district,
        city_tehsil: formData.city_tehsil,
        pincode: formData.pincode,
        business_type: formData.business_type,
        experience_years: formData.experience_years,
        monthly_volume: formData.monthly_volume,
        investment_capacity: formData.investment_capacity,
        godown_capacity: formData.godown_capacity,
        proposed_area: formData.proposed_area,
        subject: `Dealership Application: ${formData.firm_name} (${formData.district})`,
        message: `Proposed Area: ${formData.proposed_area || 'Not specified'}. Monthly Volume: ${formData.monthly_volume}. Godown: ${formData.godown_capacity}.`,
        honeypot: formData.website_hp
      });

      setSubmittedLead(res.data || formData);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setSubmitError(err.message || 'Unable to submit your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      full_name: '',
      firm_name: '',
      phone: '',
      whatsapp: '',
      sameAsPhone: true,
      email: '',
      state: 'Rajasthan',
      district: 'Jaipur',
      city_tehsil: '',
      pincode: '',
      business_type: 'Feed & Agro Retailer',
      experience_years: '3–5 Years',
      monthly_volume: '10–25 Tons (200–500 bags/mo)',
      investment_capacity: '₹5 – ₹10 Lakhs',
      godown_capacity: '500 – 1,500 sq ft (300–1,000 bags)',
      proposed_area: '',
      website_hp: ''
    });
    setErrors({});
    setSubmitError(null);
    setSubmittedLead(null);
  };

  if (submittedLead) {
    const waText = encodeURIComponent(
      `Hello Shubh Labh Team, I have just submitted a Dealership Application for "${submittedLead.firm_name}" in district ${submittedLead.district}, ${submittedLead.state}. My name is ${submittedLead.full_name} (${submittedLead.phone}).`
    );

    return (
      <div className="lead-form-card">
        <div className="lead-success-card">
          <div className="lead-success-icon">
            <CheckCircle size={34} />
          </div>
          <h3 className="lead-success-title">Dealership Application Received!</h3>
          <p className="lead-success-desc">
            Thank you, <strong>{submittedLead.full_name}</strong> of <strong>{submittedLead.firm_name}</strong>. Your regional distribution proposal for <strong>{submittedLead.district}, {submittedLead.state}</strong> has been logged with our Commercial Sales Head. We will review your area and reach out within 24 hours.
          </p>

          <div className="lead-success-actions">
            <a
              href={`https://wa.me/919461924461?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-success-wa"
            >
              <MessageCircle size={16} />
              <span>Connect with Sales Head on WhatsApp</span>
            </a>
            <button type="button" onClick={handleReset} className="btn-reset-form">
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-form-card" id="dealer-application-form">
      <div className="lead-form-header">
        <span className="lead-form-eyebrow">
          <Briefcase size={14} /> AUTHORIZED DISTRIBUTION NETWORK
        </span>
        <h3 className="lead-form-title">Apply to Become an Authorized Dealer</h3>
        <p className="lead-form-subtitle">
          Join an expanding cattle feed network with protected sales territories, assured batch freshness, healthy retailer margins, and dedicated field veterinary support.
        </p>
      </div>

      {submitError && (
        <div className="lead-error-banner">
          <AlertTriangle size={18} />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Anti-bot Honeypot trap */}
        <div className="hp-trap-field" style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="dealer_hp_check">Leave empty</label>
          <input
            type="text"
            id="dealer_hp_check"
            name="website_hp"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website_hp}
            onChange={(e) => setFormData({ ...formData, website_hp: e.target.value })}
          />
        </div>

        {/* Section 1: Applicant & Firm */}
        <div className="lead-section-title-sm">
          <span className="step-dot">1</span>
          <span>Applicant & Business Profile</span>
        </div>

        <div className="lead-form-grid">
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-applicant-name">
              <span>Applicant Name *</span>
            </label>
            <input
              type="text"
              id="dealer-applicant-name"
              className={`lead-input ${errors.full_name ? 'has-error' : ''}`}
              placeholder="e.g. Mukesh Choudhary"
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
            <label className="lead-label" htmlFor="dealer-firm-name">
              <span>Firm / Agency / Shop Name *</span>
            </label>
            <input
              type="text"
              id="dealer-firm-name"
              className={`lead-input ${errors.firm_name ? 'has-error' : ''}`}
              placeholder="e.g. Kisan Agro Agency & Cattle Feed"
              value={formData.firm_name}
              onChange={(e) => {
                setFormData({ ...formData, firm_name: e.target.value });
                if (errors.firm_name) setErrors({ ...errors, firm_name: null });
              }}
              required
            />
            {errors.firm_name && <span className="lead-field-error">{errors.firm_name}</span>}
          </div>
        </div>

        <div className="lead-form-grid">
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-phone">
              <span>Mobile Number *</span>
            </label>
            <input
              type="tel"
              id="dealer-phone"
              className={`lead-input ${errors.phone ? 'has-error' : ''}`}
              placeholder="10-digit mobile number"
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
              <span>WhatsApp number is the same</span>
            </label>
          </div>

          {!formData.sameAsPhone ? (
            <div className="lead-form-group">
              <label className="lead-label" htmlFor="dealer-wa">
                <span>WhatsApp Number</span>
              </label>
              <input
                type="tel"
                id="dealer-wa"
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
          ) : (
            <div className="lead-form-group">
              <label className="lead-label" htmlFor="dealer-email">
                <span>Email Address <span className="optional">(Optional)</span></span>
              </label>
              <input
                type="email"
                id="dealer-email"
                className={`lead-input ${errors.email ? 'has-error' : ''}`}
                placeholder="e.g. agency@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
              />
              {errors.email && <span className="lead-field-error">{errors.email}</span>}
            </div>
          )}
        </div>

        {/* Section 2: Location & Territory */}
        <div className="lead-section-divider">
          <div className="lead-section-title-sm">
            <span className="step-dot">2</span>
            <span>Target Territory & Location</span>
          </div>
        </div>

        <div className="lead-form-grid">
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-state">
              <span>State *</span>
            </label>
            <select
              id="dealer-state"
              className="lead-select"
              value={formData.state}
              onChange={(e) => {
                const newState = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  state: newState,
                  district: newState === 'Rajasthan' ? 'Jaipur' : ''
                }));
              }}
            >
              {TARGET_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-district">
              <span>District *</span>
            </label>
            {formData.state === 'Rajasthan' ? (
              <select
                id="dealer-district"
                className={`lead-select ${errors.district ? 'has-error' : ''}`}
                value={formData.district}
                onChange={(e) => {
                  setFormData({ ...formData, district: e.target.value });
                  if (errors.district) setErrors({ ...errors, district: null });
                }}
              >
                {RAJASTHAN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="dealer-district"
                className={`lead-input ${errors.district ? 'has-error' : ''}`}
                placeholder="Enter district name"
                value={formData.district}
                onChange={(e) => {
                  setFormData({ ...formData, district: e.target.value });
                  if (errors.district) setErrors({ ...errors, district: null });
                }}
              />
            )}
            {errors.district && <span className="lead-field-error">{errors.district}</span>}
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-city">
              <span>City / Tehsil / Town *</span>
            </label>
            <input
              type="text"
              id="dealer-city"
              className={`lead-input ${errors.city_tehsil ? 'has-error' : ''}`}
              placeholder="e.g. Ringas, Sikar"
              value={formData.city_tehsil}
              onChange={(e) => {
                setFormData({ ...formData, city_tehsil: e.target.value });
                if (errors.city_tehsil) setErrors({ ...errors, city_tehsil: null });
              }}
              required
            />
            {errors.city_tehsil && <span className="lead-field-error">{errors.city_tehsil}</span>}
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-pincode">
              <span>Pincode <span className="optional">(Optional)</span></span>
            </label>
            <input
              type="text"
              id="dealer-pincode"
              className={`lead-input ${errors.pincode ? 'has-error' : ''}`}
              placeholder="6-digit pincode"
              value={formData.pincode}
              onChange={(e) => {
                setFormData({ ...formData, pincode: e.target.value });
                if (errors.pincode) setErrors({ ...errors, pincode: null });
              }}
              maxLength={6}
            />
            {errors.pincode && <span className="lead-field-error">{errors.pincode}</span>}
          </div>
        </div>

        {/* Section 3: Commercial Capacity */}
        <div className="lead-section-divider">
          <div className="lead-section-title-sm">
            <span className="step-dot">3</span>
            <span>Commercial & Infrastructure Capacity</span>
          </div>
        </div>

        <div className="lead-form-grid">
          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-btype">
              <span>Primary Business Nature</span>
            </label>
            <select
              id="dealer-btype"
              className="lead-select"
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
            >
              {BUSINESS_TYPES.map(bt => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-exp">
              <span>Experience in Agri / Feed Retailing</span>
            </label>
            <select
              id="dealer-exp"
              className="lead-select"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
            >
              <option value="New Entrepreneur">New Entrepreneur / Startup</option>
              <option value="1–2 Years">1–2 Years</option>
              <option value="3–5 Years">3–5 Years</option>
              <option value="5–10 Years">5–10 Years</option>
              <option value="10+ Years">10+ Years</option>
            </select>
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-volume">
              <span>Expected Monthly Sales Volume</span>
            </label>
            <select
              id="dealer-volume"
              className="lead-select"
              value={formData.monthly_volume}
              onChange={(e) => setFormData({ ...formData, monthly_volume: e.target.value })}
            >
              {MONTHLY_VOLUMES.map(vol => (
                <option key={vol} value={vol}>{vol}</option>
              ))}
            </select>
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-godown">
              <span>Godown / Storage Area</span>
            </label>
            <select
              id="dealer-godown"
              className="lead-select"
              value={formData.godown_capacity}
              onChange={(e) => setFormData({ ...formData, godown_capacity: e.target.value })}
            >
              {GODOWN_CAPACITIES.map(gc => (
                <option key={gc} value={gc}>{gc}</option>
              ))}
            </select>
          </div>

          <div className="lead-form-group">
            <label className="lead-label" htmlFor="dealer-capital">
              <span>Proposed Capital Budget</span>
            </label>
            <select
              id="dealer-capital"
              className="lead-select"
              value={formData.investment_capacity}
              onChange={(e) => setFormData({ ...formData, investment_capacity: e.target.value })}
            >
              {INVESTMENT_RANGES.map(ir => (
                <option key={ir} value={ir}>{ir}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="lead-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="lead-label" htmlFor="dealer-proposed-area">
            <span>Proposed Area of Operation / Remarks</span>
          </label>
          <textarea
            id="dealer-proposed-area"
            className="lead-textarea"
            rows={2}
            placeholder="List specific towns, villages, or mandi areas where you plan to retail Shubh Labh cattle feeds..."
            value={formData.proposed_area}
            onChange={(e) => setFormData({ ...formData, proposed_area: e.target.value })}
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
              <span>Submitting Dealership Proposal...</span>
            </>
          ) : (
            <>
              <span>Submit Dealership Proposal</span>
              <Send size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
