import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Dashboard from './views/Dashboard';
import ChartingView from './views/ChartingView';
import PatientsView from './views/PatientsView';
import ChatView from './views/ChatView';
import LoginView from './components/auth/LoginView';
import { useRole } from './context/RoleContext';

/**
 * ProtectedRoute — F2: Wraps a route that requires the "dentist" role.
 * Patients who navigate directly to a doctor-only URL are redirected to /.
 *
 * @param {string} roleRequired - 'dentist' | 'patient' (currently only 'dentist' is used)
 * @param {ReactNode} element   - The component to render if allowed
 */
function ProtectedRoute({ roleRequired, element }) {
  const { userRole } = useRole();
  if (userRole !== roleRequired) {
    return <Navigate to="/" replace />;
  }
  return element;
}

/**
 * App — Root layout with login gate and authenticated shell.
 * If not logged in, shows LoginView. Otherwise shows Sidebar + Navbar + Routes.
 */
export default function App() {
  const { isLoggedIn } = useRole();

  if (!isLoggedIn) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar ──────────────────────────── */}
      <Sidebar />

      {/* ── Main Content Area ────────────────── */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Navbar />

        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {/* Doctor-only routes — patients are redirected to / */}
            <Route
              path="/charting"
              element={
                <ProtectedRoute roleRequired="dentist" element={<ChartingView />} />
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute roleRequired="dentist" element={<PatientsView />} />
              }
            />
            <Route path="/chat" element={<ChatView />} />
          </Routes>
        </main>

        {/* ── Footer ─────────────────────────── */}
        <footer className="px-6 py-3 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <p>© 2026 DentalClub · Clinical Portal v2.0</p>
            <p>Built with ♥ for modern dental practices</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
