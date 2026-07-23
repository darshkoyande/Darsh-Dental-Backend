import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import axios from 'axios';
import AddPatientForm from './AddPatientForm';

const API_URL = '/patients';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Shield,
  FileText,
  X,
  ClipboardList,
  MessageSquare,
  History,
  Trash2,
  Sparkles,
} from 'lucide-react';

/**
 * PatientProfilesTable — Unified patient directory table.
 *
 * Replaces the old PatientDirectoryList (card layout) and the standalone
 * PatientRecord table with a single, feature-rich table that includes:
 *   1. Real-time client-side search & filter
 *   2. Color-coded priority badges on key concerns
 *   3. Quick-action hover icons (Perio Chart, Secure Chat, View History)
 *   4. Expandable detail cards per row
 *
 * Props:
 *   patients          — The unified patient array (seed + newly added)
 *   onRemovePatient   — Callback to remove a patient by ID
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND: GET /api/patients                 │
 * │  Replace the `patients` prop with data      │
 * │  fetched via axios from the API endpoint.   │
 * └─────────────────────────────────────────────┘
 */

/* ── Priority badge classification ──────────── */
const PRIORITY_RULES = [
  {
    level: 'critical',
    keywords: ['extraction', 'emergency', 'pain', 'abscess', 'surgery', 'surgical'],
    classes: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  {
    level: 'follow-up',
    keywords: ['follow-up', 'follow up', 'crown', 'implant', 'replacement', 'orthodontic', 'braces'],
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
    label: 'Follow-up',
  },
  {
    level: 'routine',
    keywords: ['routine', 'check-up', 'checkup', 'cleaning', 'consultation', 'hygiene'],
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Routine',
  },
];

function classifyConcern(concerns) {
  if (!concerns) return PRIORITY_RULES[2]; // default: routine
  const lower = concerns.toLowerCase();
  for (const rule of PRIORITY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule;
  }
  return PRIORITY_RULES[2]; // fallback: routine
}

/* ── Format helpers ────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ══════════════════════════════════════════════ */
/*  MAIN COMPONENT                               */
/* ══════════════════════════════════════════════ */
export default function PatientProfilesTable({ patients: propPatients = [], onRemovePatient: propOnRemovePatient }) {
  const { userRole, selectPatient } = useRole();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [fullNameInput, setFullNameInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [genderInput, setGenderInput] = useState('');
  const [error, setError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchPatients = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_URL}/`);
      setPatients(response.data || []);
    } catch (err) {
      setError('Failed to fetch patients from FastAPI backend server.');
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleRemovePatient = async (patientId) => {
    try {
      setError(null);
      await axios.delete(`${API_URL}/${patientId}`);
      await fetchPatients();
    } catch (err) {
      setError('Failed to delete patient. Backend server error.');
      console.error('Error deleting patient:', err);
    }
  };

  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      setError('Please provide a full name.');
      return;
    }
    if (!ageInput || isNaN(Number(ageInput)) || Number(ageInput) <= 0) {
      setError('Please provide a valid age.');
      return;
    }
    if (!genderInput) {
      setError('Please select a gender.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: fullNameInput.trim(),
      age: parseInt(ageInput),
      gender: genderInput,
      primary_doctor: "Dr. Mehra", // Required fields from schema
      status: "Active",
      treatment_status: "In Plan"
    };

    try {
      const response = await axios.post(`${API_URL}/`, payload);
      if (response.status === 201 || response.status === 200) {
        setFormSuccess(true);
        setFullNameInput('');
        setAgeInput('');
        setGenderInput('');
        await fetchPatients();
        setTimeout(() => setFormSuccess(false), 3000);
      }
    } catch (err) {
      setError('Failed to create patient on FastAPI backend. Please check server status.');
      console.error('Error creating patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Filtered list (real-time search) ──────── */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase().trim();
    return patients.filter(
      (p) =>
        (p.fullName || p.name || '').toLowerCase().includes(q) ||
        String(p.patient_id || p.id || '').toLowerCase().includes(q) ||
        (p.concerns || p.treatment_status || '').toLowerCase().includes(q) ||
        (p.clinicalNotes || '').toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  /* ── Quick action handlers ─────────────────── */
  const handleOpenPerioChart = (e, patientId) => {
    e.stopPropagation();
    selectPatient(patientId);
    navigate('/charting');
  };

  const handleSecureChat = (e, patientId) => {
    e.stopPropagation();
    selectPatient(patientId);
    navigate('/chat');
  };

  const handleViewHistory = (e, patientId) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === patientId ? null : patientId));
  };

  return (
    <div className="glass-card p-6 animate-fade-in relative overflow-hidden">
      {/* ── Decorative accent ──────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-dental-400 via-dental-500 to-emerald-500 rounded-t-2xl" />

      {/* ── Header row ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-dental-500 to-dental-600 shadow-glow-blue">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Patient Profiles</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {patients.length} registered {patients.length === 1 ? 'patient' : 'patients'} in the database
            </p>
          </div>
        </div>

        {/* ── Search input ──────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="patient-search"
            type="text"
            placeholder="Search by name, ID, or concern…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                       transition-all duration-200 w-full sm:w-64 placeholder:text-slate-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
                         transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Global Connection/Error Banner ───────────────────── */}
      {error && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Create Patient Form ─────────────────── */}
      <div className="mb-6">
        <AddPatientForm
          onSavePatient={async (patientData) => {
            await axios.post(`${API_URL}/`, patientData);
            await fetchPatients();
          }}
        />
      </div>

      {/* ── Search results indicator ─────────── */}
      {searchQuery && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs text-slate-400">
            Showing <span className="font-bold text-slate-600">{filtered.length}</span> of{' '}
            <span className="font-bold text-slate-600">{patients.length}</span> patients
          </span>
          {filtered.length === 0 && (
            <span className="text-xs text-amber-500 font-medium">— no matches found</span>
          )}
        </div>
      )}

      {/* ── Table ───────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm" id="patient-profiles-table">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Age
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Last Visit
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Key Concerns
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Next Apt.
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((patient) => {
              const isExpanded = expandedId === patient.id;
              const priority = classifyConcern(patient.concerns);
              const displayName = patient.fullName || patient.name || 'Unknown';

              return (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  displayName={displayName}
                  priority={priority}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : patient.id)}
                  readOnly={userRole === 'patient'}
                  onOpenPerioChart={handleOpenPerioChart}
                  onSecureChat={handleSecureChat}
                  onViewHistory={handleViewHistory}
                  onRemove={handleRemovePatient}
                />
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-400">No patients found</p>
                    <p className="text-xs text-slate-300">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Add your first patient using the form above'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ────────────────────────────── */}
      {patients.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-slate-300" />
          <p className="text-[10px] text-slate-400 font-medium">
            Patient data synced with FastAPI local backend · Production database connected
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  PatientRow — Individual table row with hover actions + expand
 * ══════════════════════════════════════════════════════════════════ */
function PatientRow({
  patient,
  displayName,
  priority,
  isExpanded,
  onToggle,
  readOnly,
  onOpenPerioChart,
  onSecureChat,
  onViewHistory,
  onRemove,
}) {
  return (
    <>
      <tr
        className={`cursor-pointer transition-colors duration-150 group
                    ${isExpanded ? 'bg-dental-50/50' : 'hover:bg-slate-50/50'}`}
        onClick={onToggle}
        id={`patient-row-${patient.id}`}
      >
        {/* ── Patient name + avatar ────────────── */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-dental-400 to-dental-600
                          flex items-center justify-center text-white text-xs font-bold shadow-sm
                          group-hover:shadow-glow-blue transition-shadow flex-shrink-0"
            >
              {getInitials(displayName)}
            </div>
            <div>
              <p className="font-semibold text-slate-700 group-hover:text-dental-600 transition-colors flex items-center gap-1.5">
                {displayName}
                {patient.rollNo && (
                  <span className="badge badge-blue text-[8px] py-0 px-1">{patient.rollNo}</span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{patient.patient_id || patient.id}</p>
            </div>
          </div>
        </td>

        {/* ── Age ────────────────────────────────── */}
        <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell">{patient.age}</td>

        {/* ── Last Visit ──────────────────────────── */}
        <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">
          {formatDate(patient.lastVisit || patient.last_visit || patient.createdAt || patient.created_at)}
        </td>

        {/* ── Key Concerns + Priority Badge ──────── */}
        <td className="px-4 py-3.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                        ${priority.classes}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} animate-pulse-soft`} />
            {patient.concerns || patient.treatment_status || 'General'}
          </span>
        </td>

        {/* ── Next Appointment ───────────────────── */}
        <td className="px-4 py-3.5 text-slate-600 hidden lg:table-cell">
          {(patient.nextAppointment || patient.next_visit) ? formatDate(patient.nextAppointment || patient.next_visit) : '—'}
        </td>

        {/* ── Quick Actions + Expand ─────────────── */}
        <td className="px-4 py-3.5">
          <div className="flex items-center justify-end gap-1">
            {/* ── Quick-action hover icons ──────── */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Perio Chart */}
              <button
                onClick={(e) => onOpenPerioChart(e, patient.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-dental-600 hover:bg-dental-50
                           transition-all duration-150 active:scale-90"
                title="Open Perio Chart"
                id={`action-perio-${patient.id}`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
              </button>

              {/* Secure Chat */}
              <button
                onClick={(e) => onSecureChat(e, patient.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50
                           transition-all duration-150 active:scale-90"
                title="Secure Chat"
                id={`action-chat-${patient.id}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>

              {/* View History */}
              <button
                onClick={(e) => onViewHistory(e, patient.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50
                           transition-all duration-150 active:scale-90"
                title="View History"
                id={`action-history-${patient.id}`}
              >
                <History className="w-3.5 h-3.5" />
              </button>

              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(patient.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50
                             transition-all duration-150 active:scale-90"
                  title={`Remove ${displayName}`}
                  id={`action-remove-${patient.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Expand chevron (always visible) */}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-dental-500 ml-1 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-dental-500 transition-colors ml-1 flex-shrink-0" />
            )}
          </div>
        </td>
      </tr>

      {/* ── Expanded Detail Card ─────────────── */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-0 bg-slate-50/30">
            <ExpandedPatientDetail patient={patient} displayName={displayName} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  ExpandedPatientDetail — Clinical detail card (expanded row)
 * ══════════════════════════════════════════════════════════════════ */
function ExpandedPatientDetail({ patient, displayName }) {
  return (
    <div className="py-4 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── Contact Information ────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Contact Information
          </h4>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {patient.phone || patient.contactNumber || '—'}
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {patient.email || '—'}
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              {patient.insuranceProvider || 'Not specified'}
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Blood Group: {patient.bloodGroup || '—'}
            </p>
          </div>
        </div>

        {/* ── Allergies & Alerts ─────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            Allergies & Alerts
          </h4>
          {patient.allergies && patient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((a) => (
                <span key={a} className="badge badge-red">{a}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              No known allergies
            </p>
          )}
        </div>

        {/* ── Treatment History / Clinical Notes ── */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-dental-500" />
            {patient.treatments ? 'Clinical Visits' : 'Clinical Notes'}
          </h4>

          {patient.treatments && patient.treatments.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {patient.treatments.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs border-l-2 border-dental-200 pl-2.5 py-1">
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{t.procedure}</p>
                    <p className="text-slate-400">{formatDate(t.date)} · {t.dentist}</p>
                  </div>
                  <span className={`badge ${t.status === 'Completed' ? 'badge-emerald' : 'badge-amber'}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50/70 rounded-lg px-3 py-2 border border-slate-100">
              <FileText className="w-3.5 h-3.5 text-dental-400 flex-shrink-0 mt-0.5" />
              <p className="line-clamp-3 leading-relaxed">
                {patient.clinicalNotes || 'No clinical notes recorded.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
//added to clear cache//