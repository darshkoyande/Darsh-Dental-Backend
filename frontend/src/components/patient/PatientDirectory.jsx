import { useState, useEffect } from 'react';
import {
  Users, Search, ChevronRight, Calendar, Phone, Mail,
  AlertCircle, ArrowLeft, X, Trash2, Loader2,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import axios from 'axios';

/**
 * PatientDirectory — Dentist-facing patient selection panel.
 *
 * Fetches patient rows from the FastAPI backend (GET /patients/).
 * When a row is clicked, binds that patient to global context,
 * allowing the ChartingGrid and downstream components to render
 * with "Active Charting Center for: [Patient Name]".
 */

/** Map a backend patient object to the shape the frontend expects. */
function mapBackendPatient(p) {
  return {
    ...p,
    // The backend uses `patient_id` as the external ID and `id` as DB primary key.
    // The frontend directory historically uses `id` as the display ID (e.g. "DC-2001").
    // We keep `id` as the DB primary key for API calls, and show `patient_id` as label.
    displayId: p.patient_id,
    fullName: p.name,
    lastVisit: p.last_visit || null,
    nextAppointment: p.next_visit || null,
    concerns: p.treatment_status || 'General',
    initials: p.name
      ? p.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : '?',
  };
}

export default function PatientDirectory() {
  const { activePatient, selectPatient, clearPatient } = useRole();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = async () => {
    try {
      setError(null);
      setLoading(true);
      const { data } = await axios.get('/patients/');
      setPatients((data || []).map(mapBackendPatient));
    } catch (err) {
      setError('Failed to load patients from backend.');
      console.error('PatientDirectory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleRemove = async (patientId) => {
    try {
      await axios.delete(`/patients/${patientId}`);
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      if (activePatient?.id === patientId) {
        clearPatient();
      }
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  // If a patient is already selected, show the "return to directory" state
  if (activePatient) {
    return (
      <div className="glass-card p-4 mb-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dental-400 to-dental-600
                            flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {activePatient.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  Active Patient: <span className="text-gradient">{activePatient.name}</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">{activePatient.displayId || activePatient.patient_id || activePatient.id}</span>
              </div>
              <p className="text-xs text-slate-500">
                Age: {activePatient.age} · Last Visit: {activePatient.lastVisit || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={clearPatient}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                       text-slate-500 hover:text-dental-600 hover:bg-dental-50
                       border border-slate-200 hover:border-dental-300
                       transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change Patient
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 animate-fade-in">
      {/* ── Header ──────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-dental-500" />
            Patient Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a patient to begin clinical charting
          </p>
        </div>
        <span className="badge badge-blue">
          {patients.length} Patients
        </span>
      </div>

      {/* ── Error banner ────────────────────── */}
      {error && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Loading state ───────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading patients from server…
        </div>
      )}

      {/* ── Patient Cards ───────────────────── */}
      {!loading && (
        <div className="grid gap-3">
          {patients.map((patient) => (
            <div
              key={patient.id}
              id={`patient-card-${patient.id}`}
              className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl
                         border border-slate-100 bg-white text-left
                         hover:border-dental-300 hover:shadow-card-hover hover:bg-dental-50/30
                         transition-all duration-200"
            >
              {/* Clickable Area for Selection */}
              <div 
                onClick={() => selectPatient(patient.id)}
                className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
                title={`Select ${patient.name}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dental-400 to-dental-600
                                flex items-center justify-center text-white text-sm font-bold shadow-sm
                                group-hover:shadow-glow-blue transition-shadow">
                  {patient.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-dental-600 transition-colors">
                      {patient.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">{patient.displayId}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Age: {patient.age}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Last Visit: {patient.lastVisit || '—'}
                    </span>
                    {patient.concerns && (
                      <span className="badge badge-amber text-[9px] px-1.5 py-0">
                        {patient.concerns}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions/Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(patient.id);
                  }}
                  className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50
                             transition-all duration-150 active:scale-90"
                  title={`Remove ${patient.name}`}
                  id={`action-remove-dir-${patient.id}`}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>

                {/* Chevron Arrow */}
                <div 
                  onClick={() => selectPatient(patient.id)}
                  className="cursor-pointer p-1"
                  title={`Select ${patient.name}`}
                >
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-dental-500
                                           group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </div>
            </div>
          ))}

          {!loading && patients.length === 0 && !error && (
            <div className="text-center py-10 text-sm text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              No patients found. Register patients via the Patient Profiles page.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
