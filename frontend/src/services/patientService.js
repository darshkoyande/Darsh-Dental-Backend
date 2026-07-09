/**
 * patientService.js — Centralized Patient Data Access Layer
 *
 * All patient read/write operations are routed through this file.
 * Currently backed by browser localStorage.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  BACKEND SWAP GUIDE                                             │
 * │                                                                  │
 * │  When the Python backend is ready, DELETE this entire file and  │
 * │  replace it with a new patientService.js that imports Axios:    │
 * │                                                                  │
 * │    import axios from 'axios';                                   │
 * │    const API = 'https://your-server.com/api';                   │
 * │                                                                  │
 * │  Then re-export each function below using axios calls.          │
 * │  No other file in the app needs to change — they all import    │
 * │  from './services/patientService'.                              │
 * └──────────────────────────────────────────────────────────────────┘
 */

/* ══════════════════════════════════════════════════════════════════
 *  STORAGE KEY — single localStorage key for the unified array
 * ══════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'dc_patients';

/* ══════════════════════════════════════════════════════════════════
 *  SEED DATA — Default "OG" mock database patients
 *
 *  These are written to localStorage on first load (or if the key
 *  is missing). They mirror the records shown in the Patient
 *  Profiles table and used across the charting flow.
 * ══════════════════════════════════════════════════════════════════ */
export const SEED_PATIENTS = [
  {
    id: 'DC-2001',
    fullName: 'Rajivkumar',
    name: 'Rajivkumar',            // compat alias for PatientRecord / PatientDirectory
    age: 20,
    gender: 'Male',
    contactNumber: '+91 98765-00001',
    phone: '+91 98765-00001',       // compat alias
    email: 'rajivkumar@email.com',
    clinicalNotes: 'Routine check-up, oral hygiene counselling',
    lastVisit: '2026-05-12',
    nextAppointment: '2026-07-15',
    concerns: 'Routine check-up',
    allergies: [],
    treatments: [
      { date: '2026-05-12', procedure: 'Consultation & Cleaning', dentist: 'Dr. Mehra', status: 'Completed' },
      { date: '2026-01-15', procedure: 'Dental Filling — Tooth #14', dentist: 'Dr. Mehra', status: 'Completed' },
    ],
    insuranceProvider: 'Student Health Scheme',
    bloodGroup: 'A+',
    rollNo: '24202C0059',
    initials: 'RK',
    createdAt: '2026-05-12T10:00:00.000Z',
  },
  {
    id: 'DC-2002',
    fullName: 'Aarav Sharma',
    name: 'Aarav Sharma',
    age: 42,
    gender: 'Male',
    contactNumber: '+91 87654-00002',
    phone: '+91 87654-00002',
    email: 'aarav.sharma@email.com',
    clinicalNotes: 'Crown replacement follow-up, monitor occlusion',
    lastVisit: '2026-06-01',
    nextAppointment: '2026-07-20',
    concerns: 'Crown replacement follow-up',
    allergies: ['Penicillin'],
    treatments: [
      { date: '2026-06-01', procedure: 'Crown Assessment — Tooth #3', dentist: 'Dr. Mehra', status: 'Completed' },
      { date: '2026-04-10', procedure: 'Crown Preparation — Tooth #3', dentist: 'Dr. Mehra', status: 'Completed' },
    ],
    insuranceProvider: 'Star Health Insurance',
    bloodGroup: 'B+',
    rollNo: null,
    initials: 'AS',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'DC-2003',
    fullName: 'Priya Patel',
    name: 'Priya Patel',
    age: 29,
    gender: 'Female',
    contactNumber: '+91 76543-00003',
    phone: '+91 76543-00003',
    email: 'priya.patel@email.com',
    clinicalNotes: 'Wisdom tooth extraction scheduled, pre-surgical assessment complete',
    lastVisit: '2026-06-18',
    nextAppointment: '2026-06-28',
    concerns: 'Wisdom tooth extraction',
    allergies: [],
    treatments: [
      { date: '2026-06-18', procedure: 'Pre-surgical Consultation Assessment', dentist: 'Dr. Mehra', status: 'Completed' },
    ],
    insuranceProvider: 'HDFC ERGO Health',
    bloodGroup: 'O+',
    rollNo: null,
    initials: 'PP',
    createdAt: '2026-06-18T10:00:00.000Z',
  },
];

/* ══════════════════════════════════════════════════════════════════
 *  fetchPatientsFromStorage()
 *
 *  Reads the unified patient array from localStorage.
 *  Falls back to SEED_PATIENTS on first visit (and writes them).
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  BACKEND SWAP:                                               │
 *  │  Delete this function body and replace with:                 │
 *  │                                                              │
 *  │  export async function fetchPatientsFromStorage() {          │
 *  │    const res = await axios.get(`${API}/patients`);           │
 *  │    return res.data;                                          │
 *  │  }                                                           │
 *  └──────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════ */
export function fetchPatientsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* corrupted data — fall through to seed */
  }

  // First-time: write seed patients into storage
  savePatientsToStorage(SEED_PATIENTS);
  return [...SEED_PATIENTS];
}

/* ══════════════════════════════════════════════════════════════════
 *  savePatientsToStorage(patients)
 *
 *  Overwrites the full patient array in localStorage.
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  BACKEND SWAP:                                               │
 *  │  Delete this function entirely — the server manages state.   │
 *  └──────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════ */
export function savePatientsToStorage(patients) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  } catch {
    console.error('[patientService] Failed to write to localStorage');
  }
}

/* ══════════════════════════════════════════════════════════════════
 *  addPatientToStorage(patient)
 *
 *  Appends a new patient to the front of the unified array.
 *  Returns the updated array.
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  BACKEND SWAP:                                               │
 *  │  Delete this function body and replace with:                 │
 *  │                                                              │
 *  │  export async function addPatientToStorage(patient) {        │
 *  │    const res = await axios.post(`${API}/patients`, patient); │
 *  │    return res.data; // server returns updated array or new   │
 *  │  }                                                           │
 *  └──────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════ */
export function addPatientToStorage(patient) {
  const current = fetchPatientsFromStorage();
  const updated = [patient, ...current];
  savePatientsToStorage(updated);
  return updated;
}

/* ══════════════════════════════════════════════════════════════════
 *  removePatientFromStorage(patientId)
 *
 *  Removes a patient by ID from the unified array.
 *  Returns the updated array.
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  BACKEND SWAP:                                               │
 *  │  Delete this function body and replace with:                 │
 *  │                                                              │
 *  │  export async function removePatientFromStorage(patientId) { │
 *  │    await axios.delete(`${API}/patients/${patientId}`);       │
 *  │    return fetchPatientsFromStorage(); // re-fetch from server│
 *  │  }                                                           │
 *  └──────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════ */
export function removePatientFromStorage(patientId) {
  const current = fetchPatientsFromStorage();
  const updated = current.filter((p) => p.id !== patientId);
  savePatientsToStorage(updated);
  return updated;
}

/* ══════════════════════════════════════════════════════════════════
 *  getPatientById(patientId)
 *
 *  Finds and returns a single patient object by ID.
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  BACKEND SWAP:                                               │
 *  │  Delete this function body and replace with:                 │
 *  │                                                              │
 *  │  export async function getPatientById(patientId) {           │
 *  │    const res = await axios.get(`${API}/patients/${patientId}`);│
 *  │    return res.data;                                          │
 *  │  }                                                           │
 *  └──────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════ */
export function getPatientById(patientId) {
  const patients = fetchPatientsFromStorage();
  return patients.find((p) => p.id === patientId) || null;
}

/* ══════════════════════════════════════════════════════════════════
 *  updatePatientInStorage(patientId, updater)
 *
 *  Updates a specific patient's data by ID.
 *  `updater` is a function that receives the current patient and
 *  returns the modified patient object.
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  BACKEND SWAP:                                               │
 *  │  Delete this function body and replace with:                 │
 *  │                                                              │
 *  │  export async function updatePatientInStorage(id, data) {    │
 *  │    const res = await axios.patch(`${API}/patients/${id}`,    │
 *  │      data);                                                  │
 *  │    return res.data;                                          │
 *  │  }                                                           │
 *  └──────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════ */
export function updatePatientInStorage(patientId, updater) {
  const current = fetchPatientsFromStorage();
  const updated = current.map((p) => (p.id === patientId ? updater(p) : p));
  savePatientsToStorage(updated);
  return updated;
}
