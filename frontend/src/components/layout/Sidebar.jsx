import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';

/**
 * Sidebar — Fixed left-hand navigation pane.
 * Features brand logo, route links with active indicators, and utility actions.
 */

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview Dashboard' },
  { to: '/charting', icon: ClipboardList,    label: 'Charting Center' },
  { to: '/patients', icon: Users,            label: 'Patient Profiles' },
  { to: '/chat',     icon: MessageSquare,    label: 'Secure Chat' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { userRole } = useRole();

  const visibleItems = navItems.filter(({ to }) => {
    if (userRole === 'patient') {
      return to === '/' || to === '/chat';
    }
    return true;
  });

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white/90 backdrop-blur-xl border-r border-slate-100 
                  shadow-sidebar z-40 flex flex-col transition-all duration-300 ease-out
                  ${collapsed ? 'w-[72px]' : 'w-64'}`}
    >
      {/* ── Brand Header ─────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-50">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-dental-500 to-dental-700 
                        flex items-center justify-center shadow-glow-blue">
          <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-gradient leading-tight">DentalClub</h1>
            <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
              Clinical Portal
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation Links ─────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <p className={`text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 
                       ${collapsed ? 'text-center' : 'px-4'}`}>
          {collapsed ? '•' : 'Navigation'}
        </p>
        {visibleItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                         transition-all duration-200 ease-out group
                         ${isActive 
                           ? 'bg-gradient-to-r from-dental-500 to-dental-600 text-white shadow-glow-blue' 
                           : 'text-slate-500 hover:bg-dental-50 hover:text-dental-600'
                         }
                         ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200
                               ${!isActive ? 'group-hover:scale-110' : ''}`} />
              {!collapsed && <span className="animate-fade-in">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Bottom Utility Actions ────────────── */}
      <div className="px-3 py-4 border-t border-slate-50 space-y-1">
        <button
          className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium
                     text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200
                     ${collapsed ? 'justify-center px-0' : ''}`}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium
                     text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200
                     ${collapsed ? 'justify-center px-0' : ''}`}
          title="Help Center"
        >
          <HelpCircle className="w-4 h-4" />
          {!collapsed && <span>Help Center</span>}
        </button>
      </div>

      {/* ── Collapse Toggle ──────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200
                   shadow-sm flex items-center justify-center text-slate-400 hover:text-dental-500
                   hover:border-dental-300 transition-all duration-200 z-50"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
