import { useState } from 'react';
import {
  Activity,
  Users,
  ClipboardList,
  CalendarClock,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import ChartingGrid from '../components/dental/ChartingGrid';
import PerioChart from '../components/dental/PerioChart';
import PatientRecord from '../components/patient/PatientRecord';
import TreatmentPlan from '../components/patient/TreatmentPlan';
import PatientDirectory from '../components/patient/PatientDirectory';
import AddPatientForm from '../components/patient/AddPatientForm';
import ChatBox from '../components/chat/ChatBox';
import axios from 'axios';

/**
 * Dashboard — Central view that adapts based on user role.
 * Dentist: Patient directory → clinical overview with stats, charting, treatment plans.
 * Patient: Personalized read-only dashboard with health summary and messaging.
 */

/* ── Mock dashboard metrics ──────────────────── */
const STATS = [
  { label: 'Total Patients',       value: '248',   change: '+12%', icon: Users,          color: 'from-dental-500 to-dental-600',     bg: 'bg-dental-50' },
  { label: 'Charts Updated',       value: '1,024', change: '+8%',  icon: ClipboardList,  color: 'from-emerald-500 to-emerald-600',   bg: 'bg-emerald-50' },
  { label: 'Appointments Today',   value: '14',    change: '3 left',icon: CalendarClock, color: 'from-amber-500 to-amber-600',       bg: 'bg-amber-50' },
  { label: 'Pending Follow-ups',   value: '7',     change: 'Urgent',icon: AlertCircle,   color: 'from-rose-500 to-rose-600',         bg: 'bg-rose-50' },
];



export default function Dashboard() {
  const { userRole } = useRole();

  if (userRole === 'patient') {
    return <PatientDashboard />;
  }

  return <DentistDashboard />;
}

/* ═══════════════════════════════════════════════
   DENTIST VIEW
   ═══════════════════════════════════════════════ */
function DentistDashboard() {
  const { activePatient, currentUser } = useRole();
  const [formKey, setFormKey] = useState(0); // bump to re-mount PatientDirectory after add

  const handleSavePatient = async (patientData) => {
    await axios.post('/patients/', patientData);
    // Bump key so PatientDirectory re-fetches after a new patient is added
    setFormKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Welcome Header ───────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {getGreeting()}, <span className="text-gradient">{currentUser?.name || 'Dr. Mehra'}</span> 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Here's your clinical overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <Link
          to="/charting"
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-dental-500 to-dental-600
                     text-white text-sm font-semibold shadow-sm hover:shadow-glow-blue transition-all duration-200
                     active:scale-95"
        >
          <Activity className="w-4 h-4" />
          Open Charting Center
        </Link>
      </div>

      {/* ── Stat Cards ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card p-5 group">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}
                        style={{ color: `var(--tw-gradient-from)` }} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Patient Directory (Always visible) ── */}
      <PatientDirectory key={formKey} />

      {/* ── Conditional: Clinical panels only show when patient is selected ── */}
      {activePatient ? (
        <>
          {/* ── Patient Records Overview ─────────── */}
          <PatientRecord patientId={activePatient.id} />

          {/* ── Treatment Plans ──────────────────── */}
          <TreatmentPlan patientId={activePatient.id} />

          {/* ── Charting Grid ────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-800">Clinical Charting</h2>
              <Link to="/charting" className="flex items-center gap-1 text-xs font-semibold text-dental-500 hover:text-dental-600 transition-colors">
                Full Charting Center <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ChartingGrid key={`chart-${activePatient.id}`} />
          </div>

          {/* ── Periodontal Chart ────────────────── */}
          <PerioChart key={`perio-${activePatient.id}`} />
        </>
      ) : (
        /* ── No patient selected: show Add Patient form ── */
        <AddPatientForm onSavePatient={handleSavePatient} />
      )}


    </div>
  );
}

/* ═══════════════════════════════════════════════
   PATIENT VIEW
   ═══════════════════════════════════════════════ */
function PatientDashboard() {
  const { currentUser, activePatient } = useRole();
  const patientName = currentUser?.name || 'Patient';
  const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Patient Welcome Card ─────────────── */}
      <div className="glass-card p-6 bg-gradient-to-r from-dental-50 to-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-dental-400 to-dental-600
                          flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Welcome back, <span className="text-gradient">{patientName}</span> 👋
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Patient ID: {activePatient?.id || 'DC-2001'}
              {activePatient?.rollNo && <> · Roll No: {activePatient.rollNo}</>}
              {activePatient?.bloodGroup && <> · Blood Group: {activePatient.bloodGroup}</>}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="badge badge-emerald">Next Visit: {activePatient?.nextAppointment || 'Jul 15, 2026'}</span>
              <span className="badge badge-blue">Insurance: Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Patient Summary Cards ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Last Visit
          </h3>
          <p className="text-lg font-bold text-slate-800">{activePatient?.lastVisit || 'N/A'}</p>
          <p className="text-xs text-slate-400 mt-1">{activePatient?.concerns || 'General check-up'}</p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Active Concerns
          </h3>
          <p className="text-lg font-bold text-amber-600">{activePatient?.concerns || 'None'}</p>
          <p className="text-xs text-slate-400 mt-1">Monitoring in progress</p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Allergies
          </h3>
          <div className="flex gap-2 mt-1">
            {(activePatient?.allergies && activePatient.allergies.length > 0) ? (
              activePatient.allergies.map(a => (
                <span key={a} className="badge badge-red">{a}</span>
              ))
            ) : (
              <span className="text-sm text-emerald-600 font-medium">No known allergies ✓</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Read-Only Charting Grid ───────────── */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Your Dental Health Map</h2>
        <ChartingGrid readOnly />
      </div>

      {/* ── Chat with Doctor ─────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Secure Portal Help Desk</h2>
        <ChatBox embedded />
      </div>
    </div>
  );
}

/* ── Helper ──────────────────────────────────── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}
