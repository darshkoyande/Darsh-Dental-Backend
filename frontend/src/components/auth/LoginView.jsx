import { useState } from 'react';
import {
  Activity,
  Stethoscope,
  HeartPulse,
  Eye,
  EyeOff,
  Lock,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import axios from 'axios';

/**
 * LoginView — Professional credentials form with Doctor / Patient tab toggle.
 *
 * Flow:
 *  1. User selects tab (Doctor | Patient) — pre-fills username hint only
 *  2. Enters username + password
 *  3. Sign In → POST /auth/login
 *     • Success  → login({ id, name, role, linked_patient_id, token })
 *     • Network  → fallback to mock login (offline/dev mode)
 *     • 401      → inline error message
 */

const TABS = [
  {
    key: 'doctor',
    label: 'Doctor Login',
    icon: Stethoscope,
    hint: 'dr_mehra',
    color: 'dental',
    gradientFrom: 'from-dental-500',
    gradientTo: 'to-dental-700',
    accent: 'border-dental-400 text-dental-600',
    tabActive: 'bg-dental-500 text-white shadow-glow-blue',
    tabInactive: 'text-slate-500 hover:text-dental-600',
  },
  {
    key: 'patient',
    label: 'Patient Login',
    icon: HeartPulse,
    hint: 'rajivkumar',
    color: 'emerald',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-700',
    accent: 'border-emerald-400 text-emerald-600',
    tabActive: 'bg-emerald-500 text-white shadow',
    tabInactive: 'text-slate-500 hover:text-emerald-600',
  },
];

export default function LoginView() {
  const { login } = useRole();
  const [activeTab, setActiveTab] = useState(0); // 0 = Doctor, 1 = Patient
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tab = TABS[activeTab];
  const TabIcon = tab.icon;

  function switchTab(idx) {
    setActiveTab(idx);
    setUsername('');
    setPassword('');
    setError('');
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/auth/login', { username, password });
      const { token, user } = res.data;
      login({
        id: user.id,
        name: user.name,
        role: user.role === 'doctor' ? 'dentist' : 'patient',
        targetPatientId: user.linked_patient_id ?? '',
        token,
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (!err.response) {
        // Network error — fall back to offline mock login
        const isMockDoctor =
          username === 'dr_mehra' && password === 'password123';
        const isMockPatient =
          username === 'rajivkumar' && password === 'password123';

        if (isMockDoctor) {
          login({ name: 'Dr. Anita Mehra', role: 'dentist', targetPatientId: '' });
        } else if (isMockPatient) {
          login({ name: 'Rajivkumar', role: 'patient', targetPatientId: 'DC-2001' });
        } else {
          setError('Backend unavailable. Try: dr_mehra / password123 or rajivkumar / password123');
        }
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 30%, #dbeafe 70%, #eef2ff 100%)',
      }}
    >
      <div className="w-full max-w-md animate-fade-in">

        {/* ── Brand Header ──────────────────────────────────── */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-gradient-to-br ${tab.gradientFrom} ${tab.gradientTo}
                        shadow-glow-blue mb-4 transition-all duration-300`}
          >
            <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            <span className="text-gradient">DentalClub</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Clinical Portal · Sign in to continue
          </p>
        </div>

        {/* ── Glass Card ────────────────────────────────────── */}
        <div className="glass-card p-8">

          {/* ── Tab Toggle ──────────────────────────────────── */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-7">
            {TABS.map((t, idx) => {
              const Icon = t.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={t.key}
                  id={`login-tab-${t.key}`}
                  type="button"
                  onClick={() => switchTab(idx)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
                               text-sm font-semibold transition-all duration-200
                               ${isActive ? t.tabActive : t.tabInactive}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Credentials Form ────────────────────────────── */}
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>

            {/* Username */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                placeholder={tab.hint}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200
                           text-sm text-slate-700 placeholder:text-slate-300
                           focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                           transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 border border-slate-200
                             text-sm text-slate-700 placeholder:text-slate-300
                             focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                             transition-all duration-200"
                />
                <button
                  type="button"
                  id="login-toggle-password"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                             hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="login-error"
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl
                           bg-red-50 border border-red-200 text-red-700 text-xs animate-fade-in"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         font-semibold text-sm text-white
                         bg-gradient-to-r ${tab.gradientFrom} ${tab.gradientTo}
                         hover:opacity-90 active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-sm
                         ${activeTab === 0 ? 'hover:shadow-glow-blue' : ''}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TabIcon className="w-4 h-4" />
              )}
              {loading ? 'Signing in…' : `Sign In as ${activeTab === 0 ? 'Doctor' : 'Patient'}`}
            </button>
          </form>

          {/* Hint */}
          <p className="mt-4 text-center text-[10px] text-slate-400">
            Demo credentials: <span className="font-mono">{tab.hint} / password123</span>
          </p>
        </div>

        {/* ── Security Footer ────────────────────────────────── */}
        <div className="mt-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                        bg-white/60 border border-slate-200 text-xs text-slate-400"
          >
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
