import { useState, useRef, useEffect, useCallback } from 'react';
import { ClipboardList, Trash2, Clock, ArrowDown } from 'lucide-react';
import Tooth from './Tooth';
import ToothDetailPanel from './ToothDetailPanel';
import { useRole } from '../../context/RoleContext';
import { getPatientById } from '../../services/patientService';

/**
 * ChartingGrid — Complete 32-tooth adult dental map with Clinical Audit Log.
 * Includes a detailed Side Panel triggered on tooth click.
 * State persists to localStorage across browser refreshes.
 *
 * Props:
 *   readOnly (boolean) — If true, teeth cannot be edited (patient view).
 *
 * ┌─────────────────────────────────────────────┐
 * │  BACKEND: PUT /api/charts/tooth/:id         │
 * │  Updates individual tooth tracking states   │
 * │  inside SQL database tables. Replace local  │
 * │  setTeethStatus with API call.              │
 * └─────────────────────────────────────────────┘
 */

const UPPER_TEETH = Array.from({ length: 16 }, (_, i) => i + 1);   // 1–16
const LOWER_TEETH = Array.from({ length: 16 }, (_, i) => i + 17);  // 17–32

function getInitialTeethStatus(patientId) {
  try {
    const stored = localStorage.getItem(`dc_teethStatus_${patientId}`);
    if (stored) return JSON.parse(stored);
  } catch { /* fallthrough */ }

  try {
    const patient = getPatientById(patientId);
    if (patient && patient.teethState) return patient.teethState;
  } catch { /* fallthrough */ }

  const status = {};
  for (let i = 1; i <= 32; i++) {
    status[i] = 'Healthy';
  }
  
  if (patientId === 'DC-2001') {
    status[14] = 'Cavity';
  } else if (patientId === 'DC-2002') {
    status[3]  = 'Treated';
    status[19] = 'Missing';
  } else if (patientId === 'DC-2003') {
    status[32] = 'Cavity'; // Wisdom tooth
  }
  // For any other patient (newly added), all 32 teeth stay "Healthy".
  // Charting data only changes when a dentist explicitly interacts
  // with this patient's profile in the ChartingGrid.
  return status;
}

export default function ChartingGrid({ readOnly = false }) {
  const { activePatient } = useRole();
  const patientId = activePatient?.id || 'default';

  const [teethStatus, setTeethStatus] = useState(() => getInitialTeethStatus(patientId));
  const [auditLog, setAuditLog] = useState([
    {
      tooth: patientId === 'DC-2002' ? 3 : 14,
      status: 'Treated',
      timestamp: new Date(Date.now() - 86400000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    },
  ]);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const auditEndRef = useRef(null);

  // Persist teeth status to localStorage keyed by patientId
  useEffect(() => {
    try {
      localStorage.setItem(`dc_teethStatus_${patientId}`, JSON.stringify(teethStatus));
    } catch { /* ignore */ }
  }, [teethStatus, patientId]);

  // Auto-scroll audit log
  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditLog]);

  const handleStatusChange = useCallback((toothNumber, newStatus) => {
    setTeethStatus((prev) => ({
      ...prev,
      [toothNumber]: newStatus,
    }));

    const now = new Date();
    setAuditLog((prev) => [
      ...prev,
      {
        tooth: toothNumber,
        status: newStatus,
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
    ]);
  }, []);

  const handleToothClick = useCallback((toothNumber) => {
    setSelectedTooth(toothNumber);
  }, []);

  function clearAuditLog() {
    setAuditLog([]);
  }

  const statusColor = {
    Healthy: 'border-emerald-300 text-emerald-600',
    Cavity:  'border-amber-300 text-amber-600',
    Missing: 'border-slate-300 text-slate-400',
    Treated: 'border-blue-300 text-blue-600',
  };

  const counts = Object.values(teethStatus).reduce(
    (acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; },
    {}
  );

  const chartTitle = activePatient
    ? `Active Charting Center for: ${activePatient.name}`
    : 'Interactive Dental Chart';

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Main Charting Area ───────────────── */}
        <div className="flex-1 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-dental-500" />
                {chartTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {readOnly
                  ? 'Read-only view of your dental health'
                  : 'Click any tooth to view details · Right-click to update status'}
              </p>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {['Healthy', 'Cavity', 'Missing', 'Treated'].map((s) => (
                <span key={s} className={`badge ${
                  s === 'Healthy' ? 'badge-emerald' :
                  s === 'Cavity'  ? 'badge-amber' :
                  s === 'Missing' ? 'bg-slate-100 text-slate-400' :
                                    'badge-blue'
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                    s === 'Healthy' ? 'bg-emerald-500' :
                    s === 'Cavity'  ? 'bg-amber-500' :
                    s === 'Missing' ? 'bg-slate-300' :
                                      'bg-blue-500'
                  }`} />
                  {s} ({counts[s] || 0})
                </span>
              ))}
            </div>
          </div>

          {/* ── Upper Arch ─────────────────────── */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Upper Arch (Maxillary)
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex justify-center gap-1 sm:gap-1.5 flex-wrap">
              {UPPER_TEETH.map((num) => (
                <Tooth
                  key={num}
                  toothNumber={num}
                  location="Upper"
                  status={teethStatus[num]}
                  onStatusChange={handleStatusChange}
                  onToothClick={handleToothClick}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </div>

          {/* ── Dental Midline ─────────────────── */}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 border-t-2 border-dashed border-dental-200" />
            <span className="text-[10px] font-semibold text-dental-400 uppercase tracking-widest px-2">
              Occlusal Plane
            </span>
            <div className="flex-1 border-t-2 border-dashed border-dental-200" />
          </div>

          {/* ── Lower Arch ─────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Lower Arch (Mandibular)
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex justify-center gap-1 sm:gap-1.5 flex-wrap">
              {LOWER_TEETH.map((num) => (
                <Tooth
                  key={num}
                  toothNumber={num}
                  location="Lower"
                  status={teethStatus[num]}
                  onStatusChange={handleStatusChange}
                  onToothClick={handleToothClick}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Clinical Audit Log (Side Pane) ──── */}
        {!readOnly && (
          <div className="lg:w-72 glass-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-dental-500" />
                Clinical Audit Log
              </h3>
              {auditLog.length > 0 && (
                <button
                  onClick={clearAuditLog}
                  className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] scrollbar-thin space-y-0.5">
              {auditLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <ArrowDown className="w-6 h-6 mb-2 animate-pulse-soft" />
                  <p className="text-xs font-medium">No changes recorded</p>
                  <p className="text-[10px]">Click a tooth to start</p>
                </div>
              ) : (
                auditLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`audit-entry ${statusColor[entry.status]}`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-700">
                        Tooth #{entry.tooth}
                        <span className={`ml-1.5 ${
                          entry.status === 'Healthy' ? 'text-emerald-600' :
                          entry.status === 'Cavity'  ? 'text-amber-600' :
                          entry.status === 'Missing' ? 'text-slate-400' :
                                                       'text-blue-600'
                        }`}>
                          → {entry.status}
                        </span>
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {entry.date} at {entry.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={auditEndRef} />
            </div>

            {auditLog.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 text-center">
                  {auditLog.length} change{auditLog.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTooth !== null && (
        <ToothDetailPanel
          toothNumber={selectedTooth}
          status={teethStatus[selectedTooth]}
          onClose={() => setSelectedTooth(null)}
        />
      )}
    </>
  );
}
