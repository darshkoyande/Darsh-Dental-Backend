import { useState, useEffect } from 'react';
import {
  Users, Search, ChevronRight, Calendar, Phone, Mail,
  AlertCircle, ArrowLeft, X, Trash2,
} from 'lucide-react';
import { useRole, getPatientDirectory } from '../../context/RoleContext';
import { removePatientFromStorage } from '../../services/patientService';

/**
 * PatientDirectory — Dentist-facing patient selection panel.
 *
 * Displays the 3 mock patient rows from the master directory.
 * When a row is clicked, binds that patient to global context,
 * allowing the ChartingGrid and downstream components to render
 * with "Active Charting Center for: [Patient Name]".
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND: GET /api/patients                 │
 * │  Replace PATIENT_DIRECTORY import with      │
 * │  useEffect fetch() to load patient rows     │
 * │  from the relational database.              │
 * └─────────────────────────────────────────────┘
 */

export default function PatientDirectory() {
  const { activePatient, selectPatient, clearPatient } = useRole();
  const [patients, setPatients] = useState(() => getPatientDirectory());

  // Sync directory list on mount
  useEffect(() => {
    setPatients(getPatientDirectory());
  }, []);

  const handleRemove = (patientId) => {
    const updated = removePatientFromStorage(patientId);
    setPatients(updated);
    if (activePatient?.id === patientId) {
      clearPatient();
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
                <span className="text-[10px] text-slate-400 font-mono">{activePatient.id}</span>
              </div>
              <p className="text-xs text-slate-500">
                Age: {activePatient.age} · Last Visit: {activePatient.lastVisit}
                {activePatient.rollNo && <> · Roll No: {activePatient.rollNo}</>}
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

      {/* ── Patient Cards ───────────────────── */}
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
                  <span className="text-[10px] text-slate-400 font-mono">{patient.id}</span>
                  {patient.rollNo && (
                    <span className="badge badge-blue text-[9px] px-1.5 py-0">
                      {patient.rollNo}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Age: {patient.age}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Last Visit: {patient.lastVisit}
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
              {/* Remove button (non-seed only) */}
              {!['DC-2001', 'DC-2002', 'DC-2003'].includes(patient.id) && (
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
              )}

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
      </div>


    </div>
  );
}
