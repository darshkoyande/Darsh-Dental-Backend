import { useState, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import axios from 'axios';
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
} from 'lucide-react';

/**
 * PatientRecord — Patient profile table with expandable detail cards.
 *
 * Reads patient data from the FastAPI backend (GET /patients/).
 */

/** Map backend patient (snake_case) to frontend-compatible shape. */
function mapBackendPatient(p) {
  return {
    ...p,
    displayId: p.patient_id,
    fullName: p.name,
    lastVisit: p.last_visit || null,
    nextAppointment: p.next_visit || null,
    concerns: p.treatment_status || 'General',
    initials: p.name
      ? p.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : '?',
    phone: p.phone || '—',
    email: p.email || '—',
    insuranceProvider: p.insuranceProvider || '—',
    bloodGroup: p.bloodGroup || '—',
    allergies: p.allergies || [],
    treatments: p.treatments || [],
  };
}

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

export default function PatientRecord({ compact = false, patientId = null }) {
  const { userRole } = useRole();
  const [patients, setPatients] = useState([]);
  const [expandedId, setExpandedId] = useState(patientId || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch patients from backend on mount
  useEffect(() => {
    axios.get('/patients/')
      .then(({ data }) => setPatients((data || []).map(mapBackendPatient)))
      .catch((err) => console.error('PatientRecord fetch error:', err));
  }, []);

  // Expand selected patient by default when parent updates prop
  useEffect(() => {
    if (patientId) {
      setExpandedId(patientId);
    }
  }, [patientId]);

  // If patientId is specified, restrict list to that patient
  const displayPatients = patientId
    ? patients.filter((p) => p.id === patientId)
    : patients;

  const filtered = displayPatients.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.concerns || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddAllergy = (id, newAllergy) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (p.allergies.includes(newAllergy)) return p;
          return { ...p, allergies: [...p.allergies, newAllergy] };
        }
        return p;
      })
    );
  };

  const handleRemoveAllergy = (id, allergyName) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, allergies: p.allergies.filter((a) => a !== allergyName) };
        }
        return p;
      })
    );
  };

  return (
    <div className={compact ? '' : 'glass-card p-6'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-dental-500" />
            {patientId ? 'Active Patient Clinical Record' : 'Patient Profiles'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {patientId
              ? `Detailed medical file for Patient ID: ${patientId}`
              : `${patients.length} registered patients in the database`}
          </p>
        </div>

        {/* Search - only show if listing all patients */}
        {!patientId && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                         transition-all duration-200 w-48 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
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
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((patient) => {
              const isExpanded = expandedId === patient.id;
              return (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : patient.id)}
                  readOnly={userRole === 'patient'}
                  onAddAllergy={handleAddAllergy}
                  onRemoveAllergy={handleRemoveAllergy}
                />
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                  No patients found matching the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
}

/* ── Individual Patient Row ─────────────────── */
function PatientRow({ patient, isExpanded, onToggle, readOnly, onAddAllergy, onRemoveAllergy }) {
  return (
    <>
      <tr
        className={`cursor-pointer transition-colors duration-150 group
                    ${isExpanded ? 'bg-dental-50/50' : 'hover:bg-slate-50/50'}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-dental-400 to-dental-600
                            flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {patient.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p className="font-semibold text-slate-700 group-hover:text-dental-600 transition-colors flex items-center gap-1.5">
                {patient.name}
                {patient.rollNo && (
                  <span className="badge badge-blue text-[8px] py-0 px-1">
                    {patient.rollNo}
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-400">{patient.id}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell">{patient.age}</td>
        <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{formatDate(patient.lastVisit)}</td>
        <td className="px-4 py-3.5">
          <span className="badge badge-amber">{patient.concerns}</span>
        </td>
        <td className="px-4 py-3.5 text-slate-600 hidden lg:table-cell">{formatDate(patient.nextAppointment)}</td>
        <td className="px-4 py-3.5 text-right">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-dental-500 inline" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 inline group-hover:text-dental-500 transition-colors" />
          )}
        </td>
      </tr>

      {/* ── Expanded Detail Card ────────────── */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-0 bg-slate-50/30">
            <div className="py-4 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contact Info */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {patient.phone}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {patient.email}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      {patient.insuranceProvider}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Blood Group: {patient.bloodGroup}
                    </p>
                  </div>
                </div>

                {/* Allergies */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      Allergies & Alerts
                    </span>
                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const allergy = prompt("Enter new allergy name:");
                          if (allergy) {
                            onAddAllergy(patient.id, allergy);
                          }
                        }}
                        className="text-[10px] text-dental-500 hover:text-dental-600 font-bold bg-dental-50 px-2 py-0.5 rounded border border-dental-100 active:scale-95 transition-transform"
                      >
                        + Add
                      </button>
                    )}
                  </h4>
                  {patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((a) => (
                        <span
                          key={a}
                          className="badge badge-red flex items-center gap-1 group/badge pr-1"
                        >
                          {a}
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Remove allergy "${a}"?`)) {
                                  onRemoveAllergy(patient.id, a);
                                }
                              }}
                              className="text-red-500 hover:bg-red-100 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center font-bold"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      No known allergies
                    </p>
                  )}

                </div>

                {/* Treatment Summary */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-dental-500" />
                    Completed Clinical Visits
                  </h4>
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
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
