import {
  ClipboardList,
  User,
  Phone,
  Calendar,
  FileText,
  Trash2,
  Inbox,
  Sparkles,
} from 'lucide-react';

/**
 * PatientDirectoryList — Displays locally-saved patients in a polished card list.
 *
 * Props:
 *   patients         — Array of patient objects to render.
 *   onRemovePatient  — (Optional) Callback to remove a patient by ID.
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND: GET /api/patients                 │
 * │  Replace the `patients` prop with data      │
 * │  fetched from the backend API endpoint.     │
 * └─────────────────────────────────────────────┘
 */

/**
 * Generates a two-letter avatar initial from a full name string.
 */
function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Formats an ISO date string to a human-readable short date.
 */
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Maps gender value to a badge color scheme.
 */
function genderBadge(gender) {
  switch (gender) {
    case 'Male':
      return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'Female':
      return 'bg-pink-50 text-pink-600 border-pink-100';
    default:
      return 'bg-violet-50 text-violet-600 border-violet-100';
  }
}

export default function PatientDirectoryList({ patients = [], onRemovePatient }) {
  return (
    <div className="glass-card p-6 animate-fade-in relative overflow-hidden">
      {/* ── Decorative accent ──────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-dental-500 to-dental-600 rounded-t-2xl" />

      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-glow-emerald">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Patient Directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Recently registered patients
            </p>
          </div>
        </div>
        <span className="badge badge-emerald font-bold">
          {patients.length} {patients.length === 1 ? 'Patient' : 'Patients'}
        </span>
      </div>

      {/* ── Empty State ────────────────────────── */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 mb-4">
            <Inbox className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-500 mb-1">No Patients Yet</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Use the form above to register your first patient. They'll appear here instantly.
          </p>
        </div>
      ) : (
        /* ── Patient Cards ───────────────────── */
        <div className="grid gap-3">
          {patients.map((patient, index) => (
            <div
              key={patient.id}
              className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white
                         hover:border-dental-200 hover:shadow-card-hover
                         transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 60}ms` }}
              id={`patient-card-${patient.id}`}
            >
              {/* ── Avatar ──────────────────────── */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-dental-400 to-dental-600
                              flex items-center justify-center text-white text-sm font-bold shadow-sm
                              group-hover:shadow-glow-blue transition-shadow flex-shrink-0 mt-0.5">
                {getInitials(patient.fullName)}
              </div>

              {/* ── Patient Info ────────────────── */}
              <div className="flex-1 min-w-0">
                {/* Row 1: Name + ID + Gender badge */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-dental-600 transition-colors">
                    {patient.fullName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{patient.id}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold
                                    border ${genderBadge(patient.gender)}`}>
                    {patient.gender}
                  </span>
                </div>

                {/* Row 2: Quick details */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Age: {patient.age}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {patient.contactNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDate(patient.createdAt)}
                  </span>
                </div>

                {/* Row 3: Clinical notes */}
                <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50/70 rounded-lg px-3 py-2 border border-slate-100">
                  <FileText className="w-3.5 h-3.5 text-dental-400 flex-shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed">{patient.clinicalNotes}</p>
                </div>
              </div>

              {/* ── Remove Button (optional) ────── */}
              {onRemovePatient && (
                <button
                  onClick={() => onRemovePatient(patient.id)}
                  className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50
                             transition-all duration-200 opacity-0 group-hover:opacity-100
                             active:scale-90 flex-shrink-0"
                  title={`Remove ${patient.fullName}`}
                  id={`remove-patient-${patient.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer hint ────────────────────────── */}
      {patients.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-slate-300" />
          <p className="text-[10px] text-slate-400 font-medium">
            Patient data is saved locally · Connect a backend API for persistent storage
          </p>
        </div>
      )}
    </div>
  );
}
