import PatientProfilesTable from '../components/patient/PatientProfilesTable';

/**
 * PatientsView — Full-page patient management view.
 *
 * Renders:
 *   1. PatientProfilesTable — Unified searchable table with creation form connected to FastAPI backend.
 */
export default function PatientsView() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ───────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Patient Profiles</h1>
        <p className="text-sm text-slate-400 mt-1">
          Register new patients, manage records, and review treatment histories.
        </p>
      </div>

      {/* ── Unified Patient Profiles Table ─────── */}
      <PatientProfilesTable />
    </div>
  );
}
