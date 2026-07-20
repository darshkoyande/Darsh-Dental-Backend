import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { fetchPatientsFromStorage } from '../services/patientService';

const AppContext = createContext(null);

/**
 * AppProvider — Central application state context.
 *
 * Provides:
 *   currentUser   — { name, role, targetPatientId }
 *   isLoggedIn    — Boolean gate for login view
 *   login(user)   — Sets user and persists to localStorage
 *   logout()      — Clears session
 *   selectPatient — Binds a patient profile to the active session (dentist only)
 *   activePatient — Currently selected patient object (dentist only)
 *
 * localStorage keys:
 *   dc_currentUser    — Persisted user session
 *   dc_activePatient  — Persisted patient selection
 */

/** Map backend patient (snake_case) to the shape frontend components expect. */
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
  };
}

/* ── Patient Directory Data ──────────────────────
 * Legacy helpers kept for backward compatibility with
 * components that still import them. These read from
 * localStorage as a fallback.
 */
export function getPatientDirectory() {
  return fetchPatientsFromStorage();
}

// Legacy export for backward compatibility — evaluates lazily
export const PATIENT_DIRECTORY = fetchPatientsFromStorage();

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Silently fail — storage may be full or disabled
  }
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() =>
    loadFromStorage('dc_currentUser', null)
  );
  const [activePatient, setActivePatient] = useState(() =>
    loadFromStorage('dc_activePatient', null)
  );

  const isLoggedIn = currentUser !== null;
  const userRole = currentUser?.role || 'dentist';

  // Persist user changes
  useEffect(() => {
    saveToStorage('dc_currentUser', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToStorage('dc_activePatient', activePatient);
  }, [activePatient]);

  const login = useCallback((user) => {
    setCurrentUser(user);
    // Auto-select patient if logging in as patient
    if (user.role === 'patient') {
      // Try backend first, fall back to localStorage
      axios.get('/patients/')
        .then(({ data }) => {
          const mapped = (data || []).map(mapBackendPatient);
          const patientProfile = mapped.find(p => p.id === user.targetPatientId) || mapped[0];
          if (patientProfile) setActivePatient(patientProfile);
        })
        .catch(() => {
          const liveDir = fetchPatientsFromStorage();
          const patientProfile = liveDir.find(p => p.id === user.targetPatientId) || liveDir[0];
          setActivePatient(patientProfile);
        });
    } else {
      setActivePatient(null);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setActivePatient(null);
    // Clear all persisted data on logout
    localStorage.removeItem('dc_currentUser');
    localStorage.removeItem('dc_activePatient');
    localStorage.removeItem('dc_chatMessages');
    localStorage.removeItem('dc_teethStatus');
    localStorage.removeItem('dc_perioData');
  }, []);

  const selectPatient = useCallback(async (patientId) => {
    // Fetch full patient profile from backend
    try {
      const { data } = await axios.get(`/patients/${patientId}`);
      const mapped = mapBackendPatient(data);
      setActivePatient(mapped);
      setCurrentUser(prev => prev ? { ...prev, targetPatientId: patientId } : prev);
    } catch (err) {
      console.error('Failed to fetch patient from backend, falling back to localStorage:', err);
      // Fallback to localStorage
      const liveDirectory = fetchPatientsFromStorage();
      const patient = liveDirectory.find(p => p.id === patientId);
      if (patient) {
        setActivePatient(patient);
        setCurrentUser(prev => prev ? { ...prev, targetPatientId: patientId } : prev);
      }
    }
  }, []);

  const clearPatient = useCallback(() => {
    setActivePatient(null);
    setCurrentUser(prev => prev ? { ...prev, targetPatientId: '' } : prev);
  }, []);

  // Legacy compat: toggleRole and setRole for Navbar
  const toggleRole = useCallback(() => {
    if (currentUser) {
      if (currentUser.role === 'dentist') {
        login({ name: 'Rajivkumar', role: 'patient', targetPatientId: 'DC-2001' });
      } else {
        login({ name: 'Dr. Mehra', role: 'dentist', targetPatientId: '' });
      }
    }
  }, [currentUser, login]);

  return (
    <AppContext.Provider value={{
      currentUser,
      isLoggedIn,
      userRole,
      activePatient,
      login,
      logout,
      selectPatient,
      clearPatient,
      toggleRole,
    }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * useRole — Hook to access current user context.
 * Backward-compatible: still provides `userRole` and `toggleRole`.
 */
export function useRole() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useRole must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
