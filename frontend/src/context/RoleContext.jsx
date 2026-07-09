import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND ENDPOINT: POST /api/auth/login     │
 * │  Replace login() body with fetch() call     │
 * │  when backend session management is ready.  │
 * └─────────────────────────────────────────────┘
 */

/* ── Patient Directory Data ──────────────────────
 * Now dynamically sourced from the shared patientService.
 * This ensures patients added via the form are also
 * visible in the charting flow's PatientDirectory selector.
 *
 * ┌──────────────────────────────────────────────────┐
 * │  BACKEND SWAP:                                   │
 * │  When patientService switches to Axios, this     │
 * │  getter will automatically use the network data. │
 * └──────────────────────────────────────────────────┘
 */
export function getPatientDirectory() {
  return fetchPatientsFromStorage();
}

// Legacy export for backward compatibility — evaluates lazily
// Components should prefer getPatientDirectory() for live data
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
    /**
     * ┌───────────────────────────────────────────┐
     * │  BACKEND: POST /api/auth/login            │
     * │  Body: { name, role }                     │
     * │  Response: { token, user }                │
     * │  Replace setCurrentUser with API call.    │
     * └───────────────────────────────────────────┘
     */
    setCurrentUser(user);
    // Auto-select patient if logging in as patient
    if (user.role === 'patient') {
      const liveDir = fetchPatientsFromStorage();
      const patientProfile = liveDir.find(p => p.id === user.targetPatientId) || liveDir[0];
      setActivePatient(patientProfile);
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

  const selectPatient = useCallback((patientId) => {
    /**
     * ┌───────────────────────────────────────────┐
     * │  BACKEND: GET /api/patients/:id           │
     * │  Replace with fetch() to load full        │
     * │  patient profile from database.           │
     * └───────────────────────────────────────────┘
     */
    // Use live data from patientService so newly added patients are selectable
    const liveDirectory = fetchPatientsFromStorage();
    const patient = liveDirectory.find(p => p.id === patientId);
    if (patient) {
      setActivePatient(patient);
      setCurrentUser(prev => prev ? { ...prev, targetPatientId: patientId } : prev);
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
