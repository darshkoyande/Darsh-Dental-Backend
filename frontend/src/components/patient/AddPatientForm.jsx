import { useState, useCallback } from 'react';
import {
  UserPlus,
  User,
  Hash,
  Phone,
  FileText,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Droplets,
} from 'lucide-react';

/**
 * AddPatientForm — Clinical patient intake form with field-level validation.
 *
 * Props:
 *   onSavePatient(patientData) — Callback to persist the new patient.
 *                                 Currently wired to local state; designed to be
 *                                 easily swapped for a backend API call.
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND: POST /api/patients                │
 * │  Replace the `onSavePatient` callback with  │
 * │  a fetch() call in the parent component.    │
 * └─────────────────────────────────────────────┘
 */

/* ── Initial empty form state ─────────────────── */
const EMPTY_FORM = {
  fullName: '',
  age: '',
  gender: '',
  contactNumber: '',
  bloodGroup: '',
  allergies: '',
  clinicalNotes: '',
};

/* ── Gender options ───────────────────────────── */
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function AddPatientForm({ onSavePatient }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /* ── Field change handler ───────────────────── */
  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change if field was previously invalid
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  /* ── Mark field as "touched" on blur ────────── */
  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Validate single field on blur
    const error = validateField(field, formData[field]);
    setErrors((prev) => (error ? { ...prev, [field]: error } : (() => { const n = { ...prev }; delete n[field]; return n; })()));
  }, [formData]);

  /* ── Single-field validation ────────────────── */
  const validateField = (field, value) => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required.';
        if (value.trim().length < 2) return 'Name must be at least 2 characters.';
        return null;
      case 'age':
        if (!value && value !== 0) return 'Age is required.';
        if (isNaN(Number(value)) || Number(value) < 1 || Number(value) > 120) return 'Enter a valid age (1–120).';
        return null;
      case 'gender':
        if (!value) return 'Please select a gender.';
        return null;
      case 'contactNumber':
        if (!value.trim()) return 'Contact number is required.';
        if (!/^[\d\s+\-()]{7,15}$/.test(value.trim())) return 'Enter a valid phone number.';
        return null;
      case 'bloodGroup':
        if (!value) return 'Please select a blood group.';
        return null;
      case 'clinicalNotes':
        if (!value.trim()) return 'Initial clinical notes are required.';
        return null;
      default:
        return null;
    }
  };

  /* ── Full-form validation ───────────────────── */
  const validateAll = () => {
    const newErrors = {};
    Object.keys(EMPTY_FORM).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    return newErrors;
  };

  /* ── Submit handler ─────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched to show any remaining errors
    const allTouched = {};
    Object.keys(EMPTY_FORM).forEach((f) => (allTouched[f] = true));
    setTouched(allTouched);

    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // Build patient object
    const newPatient = {
      id: `DC-${Date.now().toString().slice(-4)}`,
      fullName: formData.fullName.trim(),
      age: Number(formData.age),
      gender: formData.gender,
      contactNumber: formData.contactNumber.trim(),
      bloodGroup: formData.bloodGroup,
      allergies: formData.allergies ? formData.allergies.trim() : '',
      clinicalNotes: formData.clinicalNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    /**
     * ┌──────────────────────────────────────────────┐
     * │  BACKEND SWAP POINT                          │
     * │  Replace onSavePatient(newPatient) with:     │
     * │                                              │
     * │  const res = await fetch('/api/patients', {  │
     * │    method: 'POST',                           │
     * │    headers: { 'Content-Type': 'application/json' },│
     * │    body: JSON.stringify(newPatient),          │
     * │  });                                         │
     * │  const saved = await res.json();             │
     * └──────────────────────────────────────────────┘
     */
    try {
      await onSavePatient(newPatient);

      // Show success feedback
      setShowSuccess(true);
      setFormData(EMPTY_FORM);
      setErrors({});
      setTouched({});

      // Auto-dismiss success toast after 3s
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setErrors({ _form: 'Failed to save patient. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Helper: get field status classes ────────── */
  const fieldStatus = (field) => {
    if (errors[field] && touched[field]) return 'border-red-300 bg-red-50/30 focus:ring-red-300 focus:border-red-400';
    if (touched[field] && !errors[field] && formData[field]) return 'border-emerald-300 bg-emerald-50/20 focus:ring-emerald-300 focus:border-emerald-400';
    return 'border-slate-200 bg-slate-50/50 focus:ring-dental-300 focus:border-dental-400';
  };

  return (
    <div className="glass-card p-6 animate-fade-in relative overflow-hidden">
      {/* ── Decorative accent ──────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-dental-400 via-dental-500 to-dental-600 rounded-t-2xl" />

      {/* ── Success Banner ─────────────────────── */}
      {showSuccess && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200
                        text-emerald-700 text-sm font-medium animate-slide-up">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>Patient added successfully to the directory!</span>
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse-soft" />
        </div>
      )}

      {/* ── Form-level error ───────────────────── */}
      {errors._form && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200
                        text-red-700 text-sm font-medium animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{errors._form}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-dental-500 to-dental-600 shadow-glow-blue">
          <UserPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Add New Patient</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Register a new patient into the clinical directory
          </p>
        </div>
      </div>

      {/* ── Form ───────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate id="add-patient-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ─── Full Name ──────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="patient-fullname" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="patient-fullname"
              type="text"
              placeholder="e.g. Rajiv Kumar"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              onBlur={() => handleBlur('fullName')}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-700
                         placeholder:text-slate-300 focus:outline-none focus:ring-2
                         transition-all duration-200 ${fieldStatus('fullName')}`}
            />
            {errors.fullName && touched.fullName && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.fullName}
              </p>
            )}
          </div>

          {/* ─── Age ────────────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="patient-age" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              Age <span className="text-red-400">*</span>
            </label>
            <input
              id="patient-age"
              type="number"
              min="1"
              max="120"
              placeholder="e.g. 28"
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value)}
              onBlur={() => handleBlur('age')}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-700
                         placeholder:text-slate-300 focus:outline-none focus:ring-2
                         transition-all duration-200 ${fieldStatus('age')}`}
            />
            {errors.age && touched.age && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.age}
              </p>
            )}
          </div>

          {/* ─── Gender ─────────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="patient-gender" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              Gender <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                id="patient-gender"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                onBlur={() => handleBlur('gender')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm appearance-none cursor-pointer
                           focus:outline-none focus:ring-2 transition-all duration-200
                           ${formData.gender ? 'text-slate-700' : 'text-slate-300'}
                           ${fieldStatus('gender')}`}
              >
                <option value="" disabled>Select gender…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {errors.gender && touched.gender && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.gender}
              </p>
            )}
          </div>

          {/* ─── Contact Number ─────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="patient-contact" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Contact Number <span className="text-red-400">*</span>
            </label>
            <input
              id="patient-contact"
              type="tel"
              placeholder="e.g. +91 98765-43210"
              value={formData.contactNumber}
              onChange={(e) => handleChange('contactNumber', e.target.value)}
              onBlur={() => handleBlur('contactNumber')}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-700
                         placeholder:text-slate-300 focus:outline-none focus:ring-2
                         transition-all duration-200 ${fieldStatus('contactNumber')}`}
            />
            {errors.contactNumber && touched.contactNumber && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.contactNumber}
              </p>
            )}
          </div>

          {/* ─── Blood Group ─────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="patient-bloodgroup" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <Droplets className="w-3.5 h-3.5 text-slate-400" />
              Blood Group <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                id="patient-bloodgroup"
                value={formData.bloodGroup}
                onChange={(e) => handleChange('bloodGroup', e.target.value)}
                onBlur={() => handleBlur('bloodGroup')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm appearance-none cursor-pointer
                           focus:outline-none focus:ring-2 transition-all duration-200
                           ${formData.bloodGroup ? 'text-slate-700' : 'text-slate-300'}
                           ${fieldStatus('bloodGroup')}`}
              >
                <option value="" disabled>Select blood group…</option>
                {BLOOD_GROUP_OPTIONS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {errors.bloodGroup && touched.bloodGroup && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.bloodGroup}
              </p>
            )}
          </div>

          {/* ─── Allergies (optional, text input) ── */}
          <div className="space-y-1.5">
            <label htmlFor="patient-allergies" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              Known Allergies
            </label>
            <input
              id="patient-allergies"
              type="text"
              placeholder="e.g. Penicillin, Latex (comma-separated)"
              value={formData.allergies || ''}
              onChange={(e) => handleChange('allergies', e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-700
                         placeholder:text-slate-300 focus:outline-none focus:ring-2
                         transition-all duration-200 border-slate-200 bg-slate-50/50
                         focus:ring-dental-300 focus:border-dental-400`}
            />
          </div>

          {/* ─── Clinical Notes (full-width) ───── */}
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="patient-notes" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Initial Clinical Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              id="patient-notes"
              rows={4}
              placeholder="Enter initial observations, chief complaint, or referral notes…"
              value={formData.clinicalNotes}
              onChange={(e) => handleChange('clinicalNotes', e.target.value)}
              onBlur={() => handleBlur('clinicalNotes')}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-700 resize-none
                         placeholder:text-slate-300 focus:outline-none focus:ring-2
                         transition-all duration-200 scrollbar-thin ${fieldStatus('clinicalNotes')}`}
            />
            {errors.clinicalNotes && touched.clinicalNotes && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.clinicalNotes}
              </p>
            )}
          </div>
        </div>

        {/* ── Submit Button ──────────────────────── */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setFormData(EMPTY_FORM);
              setErrors({});
              setTouched({});
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500
                       border border-slate-200 hover:bg-slate-50 hover:text-slate-700
                       hover:border-slate-300 active:scale-[0.98]
                       transition-all duration-200"
            id="add-patient-clear"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-dental-500 to-dental-600 shadow-sm
                       hover:shadow-glow-blue hover:from-dental-600 hover:to-dental-700
                       active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed
                       transition-all duration-200"
            id="add-patient-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add Patient
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
