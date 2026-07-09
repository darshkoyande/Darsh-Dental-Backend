import { Activity, Stethoscope, HeartPulse, ArrowRight, Shield, Lock } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

/**
 * LoginView — Role selection gateway.
 *
 * Presents two login options:
 *   1. Dentist (Dr. Mehra) → routes to clinical directory
 *   2. Patient (Rajivkumar) → routes to personalized read-only dashboard
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND: POST /api/auth/login              │
 * │  Replace mock login with actual credentials │
 * │  form + JWT session token exchange.         │
 * └─────────────────────────────────────────────┘
 */

export default function LoginView() {
  const { login } = useRole();

  function handleDentistLogin() {
    login({
      name: 'Dr. Mehra',
      role: 'dentist',
      targetPatientId: '',
    });
  }

  function handlePatientLogin() {
    login({
      name: 'Rajivkumar',
      role: 'patient',
      targetPatientId: 'DC-2001',
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 30%, #dbeafe 70%, #eef2ff 100%)' }}>
      <div className="w-full max-w-lg animate-fade-in">

        {/* ── Brand Header ──────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-gradient-to-br from-dental-500 to-dental-700 shadow-glow-blue mb-4">
            <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            <span className="text-gradient">DentalClub</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Interactive Clinical Dashboard · Select your role to continue
          </p>
        </div>

        {/* ── Role Selection Cards ──────────────── */}
        <div className="space-y-4">

          {/* Dentist Login */}
          <button
            onClick={handleDentistLogin}
            id="login-dentist"
            className="w-full group glass-card p-6 text-left cursor-pointer
                       hover:border-dental-300 hover:shadow-glow-blue active:scale-[0.98]
                       transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-dental-500 to-dental-600
                              text-white shadow-sm group-hover:shadow-glow-blue transition-shadow">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 group-hover:text-dental-600 transition-colors">
                  Login as Dentist
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Dr. Anita Mehra · BDS, MDS Prosthodontics
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Full access to patient directory, charting, treatment plans, and messaging
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-dental-500
                                     group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Patient Login */}
          <button
            onClick={handlePatientLogin}
            id="login-patient"
            className="w-full group glass-card p-6 text-left cursor-pointer
                       hover:border-emerald-300 hover:shadow-glow-emerald active:scale-[0.98]
                       transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600
                              text-white shadow-sm group-hover:shadow-glow-emerald transition-shadow">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                  Login as Patient
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Rajivkumar · Roll No: 24202C0059
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Read-only dental health map, appointment history, and secure messaging
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500
                                     group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* ── Security Footer ──────────────────── */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                          bg-white/60 border border-slate-200 text-xs text-slate-400">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted · HIPAA compliant</span>
            <Shield className="w-3 h-3" />
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            © 2026 DentalClub · Clinical Portal v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
