import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Upload,
  User,
  Phone,
  Building,
  Car,
  FileText,
  MapPin,
  Clock,
  Printer,
  Copy,
  ChevronRight,
} from 'lucide-react';
import {
  VISITOR_CATEGORIES,
  generatePassNumber,
  validateVisitorInput,
  validateMobile,
  formatIstTime,
  istBusinessDate,
} from '../../lib/visitorRegister';
import { registerVisitor, uploadVisitorPhoto } from './visitorService';

export default function VisitorRegistrationForm({ currentUser, onRegistrationSuccess, onNavigateToHistory }) {
  const [passNumber, setPassNumber] = useState(() => generatePassNumber());
  const [visitorName, setVisitorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [category, setCategory] = useState('Customer');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [personToMeet, setPersonToMeet] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Camera / Photo states
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [successRecord, setSuccessRecord] = useState(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Webcam is not supported on this browser. Please upload an image file.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Webcam start failed:', err);
      setCameraError(err.message || 'Camera access was denied or is unavailable.');
      setIsCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Capture frame from webcam
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setPhotoDataUrl(dataUrl);
    setFormErrors((prev) => ({ ...prev, photo_url: null }));
    stopCamera();
  };

  // File upload fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({ ...prev, photo_url: 'Selected file must be an image' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target.result);
      setFormErrors((prev) => ({ ...prev, photo_url: null }));
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    stopCamera();
  };

  // Real-time mobile validation indicator
  const mobileValidation = validateMobile(mobileNumber);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const formState = {
      pass_number: passNumber,
      visitor_name: visitorName,
      mobile_number: mobileNumber,
      category,
      company_name: companyName,
      address,
      person_to_meet: personToMeet,
      purpose_of_visit: purposeOfVisit,
      vehicle_number: vehicleNumber,
      photo_url: photoDataUrl,
      notes,
    };

    const validation = validateVisitorInput(formState);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      // Optional: try uploading photo to bucket, or keep base64 dataUrl
      let finalPhotoUrl = photoDataUrl;
      if (photoDataUrl && photoDataUrl.startsWith('data:')) {
        try {
          // Convert base64 dataUrl to blob
          const res = await fetch(photoDataUrl);
          const blob = await res.blob();
          const { url } = await uploadVisitorPhoto(blob, passNumber);
          if (url) {
            finalPhotoUrl = url;
          }
        } catch (uploadErr) {
          console.warn('Storage upload fallback to data URI:', uploadErr);
        }
      }

      const result = await registerVisitor(
        {
          ...formState,
          photo_url: finalPhotoUrl,
        },
        currentUser
      );

      if (result.success && result.data) {
        setSuccessRecord(result.data);
        if (onRegistrationSuccess) {
          onRegistrationSuccess(result.data);
        }
      } else {
        setFormErrors({
          general: result.error?.message || 'Failed to register visitor. Please verify your connection.',
        });
      }
    } catch (err) {
      console.error('Registration exception:', err);
      setFormErrors({ general: err.message || 'An unexpected error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setPassNumber(generatePassNumber());
    setVisitorName('');
    setMobileNumber('');
    setCategory('Customer');
    setCompanyName('');
    setAddress('');
    setPersonToMeet('');
    setPurposeOfVisit('');
    setVehicleNumber('');
    setNotes('');
    setPhotoDataUrl(null);
    setFormErrors({});
    setSuccessRecord(null);
    stopCamera();
  };

  const copyPassToClipboard = () => {
    if (successRecord?.pass_number) {
      navigator.clipboard?.writeText(successRecord.pass_number);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // SUCCESS SCREEN
  if (successRecord) {
    return (
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          padding: '2.5rem 1.5rem',
          maxWidth: '640px',
          margin: '0 auto',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <CheckCircle size={36} color="#16a34a" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          Visitor Registered Successfully!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Visitor pass has been issued and logged into Shubh Labh Visitor Management.
        </p>

        {/* Pass Card Preview */}
        <div
          style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '1.5rem',
            textAlign: 'left',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Visitor Pass
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'monospace', color: '#1e293b' }}>
                {successRecord.pass_number}
              </div>
            </div>
            <button
              onClick={copyPassToClipboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              <Copy size={13} />
              {copiedPass ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {successRecord.photo_url && (
              <img
                src={successRecord.photo_url}
                alt={successRecord.visitor_name}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '1px solid #e2e8f0',
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {successRecord.visitor_name}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                +91 {successRecord.mobile_number} • {successRecord.category}
              </div>
              {successRecord.company_name && (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {successRecord.company_name}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                Entry Time: {formatIstTime(successRecord.entry_time)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleResetForNext}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Register Another Visitor
          </button>

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View in Visitor History
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // REGISTRATION FORM
  return (
    <div
      style={{
        background: 'var(--bg-surface, #ffffff)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border, #e2e8f0)',
        padding: '1.5rem',
        maxWidth: '850px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
          New Visitor Registration
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem' }}>
          Capture visitor photograph, contact info, and generate gate pass for factory/office entry.
        </p>
      </div>

      {formErrors.general && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} />
          {formErrors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* CAMERA / PHOTO SECTION */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid var(--border, #e2e8f0)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary, #1e293b)',
                marginBottom: '0.75rem',
              }}
            >
              Visitor Photograph <span style={{ color: '#dc2626' }}>* (Required)</span>
            </label>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Photo Box / Camera Viewport */}
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '8px',
                  backgroundColor: '#000000',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: formErrors.photo_url ? '2px solid #ef4444' : '1px solid #cbd5e1',
                }}
              >
                {photoDataUrl ? (
                  <img
                    src={photoDataUrl}
                    alt="Captured Visitor"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                    <User size={48} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                    <span style={{ fontSize: '0.75rem', display: 'block' }}>No photo captured</span>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div style={{ flex: 1, minWidth: '240px' }}>
                {cameraError && (
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#b91c1c',
                      fontSize: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {cameraError}
                  </div>
                )}

                {!photoDataUrl && !isCameraActive && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={startCamera}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.65rem 1rem',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Camera size={16} />
                      Start Camera
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.65rem 1rem',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={16} />
                      Upload Photo File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Webcam or high-resolution camera photo ensures verified security log.
                    </span>
                  </div>
                )}

                {isCameraActive && !photoDataUrl && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.65rem 1.25rem',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Camera size={16} />
                      Take Photo
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      style={{
                        padding: '0.65rem 1rem',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {photoDataUrl && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={retakePhoto}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.5rem 0.85rem',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={14} />
                      Retake
                    </button>

                    <button
                      type="button"
                      onClick={removePhoto}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.5rem 0.85rem',
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                )}

                {formErrors.photo_url && (
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem' }}>
                    {formErrors.photo_url}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* MAIN FORM FIELDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Pass Number (Auto-assigned) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Pass Number
              </label>
              <input
                type="text"
                readOnly
                value={passNumber}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                }}
              />
            </div>

            {/* Visitor Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Visitor Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Kumar"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: formErrors.visitor_name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
              {formErrors.visitor_name && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{formErrors.visitor_name}</span>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Mobile Number (10 Digits) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9829012345"
                  maxLength={13}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: formErrors.mobile_number ? '1px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
              {formErrors.mobile_number ? (
                <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{formErrors.mobile_number}</span>
              ) : (
                mobileNumber && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: mobileValidation.isValid ? '#16a34a' : '#ea580c',
                    }}
                  >
                    {mobileValidation.isValid
                      ? '✓ Valid 10-digit number'
                      : mobileValidation.error || 'Enter 10 digits'}
                  </span>
                )
              )}
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Visitor Category <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                }}
              >
                {VISITOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Company / Firm */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Company / Firm Name
              </label>
              <input
                type="text"
                placeholder="e.g. Shree Ram Feeds"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Person to Meet */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Person to Meet / Employee
              </label>
              <input
                type="text"
                placeholder="e.g. Factory Manager / Mr. Nilesh"
                value={personToMeet}
                onChange={(e) => setPersonToMeet(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Vehicle Number
              </label>
              <input
                type="text"
                placeholder="e.g. RJ 14 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Address / City
              </label>
              <input
                type="text"
                placeholder="e.g. Jaipur, Rajasthan"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Purpose of Visit */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Purpose of Visit
            </label>
            <input
              type="text"
              placeholder="e.g. Raw material delivery inspection, Dealership inquiry, Meeting"
              value={purposeOfVisit}
              onChange={(e) => setPurposeOfVisit(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Additional Notes / Items Carried
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Carried sample bags, laptop, vehicle gate pass issued"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
          }}
        >
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.65rem 1.75rem',
              borderRadius: '8px',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Registering Visitor...
              </>
            ) : (
              'Save & Issue Pass'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
