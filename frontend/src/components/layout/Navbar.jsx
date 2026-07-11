import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  ChevronRight,
  User,
  LogOut,
  ArrowLeftRight,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import axios from 'axios';

/**
 * Navbar — Top dashboard bar.
 * Shows breadcrumb trail, search, dynamic notification bell (F3), and profile dropdown.
 *
 * F3: Notification bell is dynamically polled from GET /notifications/unread-count/{user_id}
 * every 10 seconds. Falls back to counting unread messages from localStorage if the
 * backend is unavailable. Clicking the bell navigates to /chat and marks all read.
 */

const routeLabels = {
  '/':         'Overview Dashboard',
  '/charting': 'Charting Center',
  '/patients': 'Patient Profiles',
  '/chat':     'Secure Chat',
};

const POLL_INTERVAL_MS = 10_000; // 10 seconds

/** Fallback: count unread from localStorage dc_chatMessages where sender is not current user */
function getLocalUnreadCount(currentUserId) {
  try {
    const raw = localStorage.getItem('dc_chatMessages');
    if (!raw) return 0;
    const messages = JSON.parse(raw);
    return Array.isArray(messages)
      ? messages.filter((m) => !m.isRead && m.senderId !== currentUserId).length
      : 0;
  } catch {
    return 0;
  }
}

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { currentUser, userRole, toggleRole, logout } = useRole();

  const [showProfile, setShowProfile] = useState(false);
  const [notifCount, setNotifCount]   = useState(0);
  const profileRef = useRef(null);

  const currentRoute = routeLabels[location.pathname] || 'Dashboard';
  const userName     = currentUser?.name || (userRole === 'dentist' ? 'Dr. Mehra' : 'Patient');
  const userId       = currentUser?.id ?? null;

  // ------------------------------------------------------------------
  // F3: Poll unread count every 10 s
  // ------------------------------------------------------------------
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setNotifCount(0);
      return;
    }
    try {
      const { data } = await axios.get(`/notifications/unread-count/${userId}`);
      setNotifCount(data.unread_count ?? 0);
    } catch {
      // Backend unavailable → fallback to localStorage count
      setNotifCount(getLocalUnreadCount(userId));
    }
  }, [userId]);

  useEffect(() => {
    fetchUnreadCount(); // Immediate first fetch
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  // ------------------------------------------------------------------
  // F3: Bell click → navigate to chat + mark all read
  // ------------------------------------------------------------------
  async function handleBellClick() {
    navigate('/chat');
    if (!userId) return;
    try {
      await axios.post(`/notifications/mark-read/${userId}`);
      setNotifCount(0);
    } catch {
      // Silently ignore if backend is down
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* ── Breadcrumb Trail ────────────────── */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 font-medium">DentalClub</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-semibold text-slate-700">{currentRoute}</span>

          {/* Role Indicator Badge */}
          <span className={`ml-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                           transition-all duration-300
                           ${userRole === 'dentist'
                             ? 'bg-dental-50 text-dental-600 border border-dental-200'
                             : 'bg-clinical-emerald-light text-emerald-700 border border-emerald-200'
                           }`}>
            {userRole === 'dentist'
              ? <><Stethoscope className="w-3 h-3" /> Dentist View</>
              : <><HeartPulse className="w-3 h-3" /> Patient View</>
            }
          </span>
        </div>

        {/* ── Right Actions ──────────────────── */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, records..."
              className="w-64 pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200
                         text-sm text-slate-600 placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                         transition-all duration-200"
            />
          </div>

          {/* Notification Bell — F3: dynamic count */}
          <button
            id="navbar-bell"
            onClick={handleBellClick}
            className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors duration-200 group"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-500 group-hover:text-dental-500 transition-colors" />
            {notifCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-clinical-red text-white
                           text-[10px] font-bold flex items-center justify-center animate-bounce-subtle
                           ring-2 ring-white"
              >
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              id="navbar-profile"
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50
                         transition-all duration-200 border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dental-400 to-dental-600
                              flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-700 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfile && (
              <div className="popover right-0 top-12 w-56 animate-slide-up">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">
                    {userName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {userRole === 'dentist'
                      ? 'BDS, MDS Prosthodontics'
                      : `Patient ID: ${currentUser?.targetPatientId || 'DC-2001'}`}
                  </p>
                </div>

                {/* Role Toggle */}
                <button
                  onClick={() => { toggleRole(); setShowProfile(false); }}
                  className="popover-item w-full text-dental-600 hover:bg-dental-50 mt-1"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    Switch to {userRole === 'dentist' ? 'Patient' : 'Dentist'} View
                  </span>
                </button>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => { logout(); setShowProfile(false); }}
                    className="popover-item w-full text-slate-500 hover:text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
