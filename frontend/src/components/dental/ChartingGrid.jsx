import { useState, useRef, useEffect, useCallback } from 'react';
import { ClipboardList, Trash2, Clock, ArrowDown, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import Tooth from './Tooth';
import ToothDetailPanel from './ToothDetailPanel';
import { useRole } from '../../context/RoleContext';
import {
  resolveDentitionType,
  getTeethForDentition,
  buildInitialTeethStatus,
  DentitionType,
} from '../../utils/dentition';

/**
 * ChartingGrid — Age-aware interactive dental chart with Clinical Audit Log.
 *
 * Automatically selects the correct dentition type based on the active
 * patient's age:
 *   PRIMARY   (< 6 yrs)  — 20 deciduous teeth, labeled A–T (italic)
 *   MIXED     (6–11 yrs) — 28 teeth: 20 primary + 8 early permanent
 *   PERMANENT (≥ 12 yrs) — 32 full adult teeth (FDI 11–48)
 *
 * State persists to localStorage per patient (keyed by patientId + dentition).
 *
 * Props:
 *   readOnly (boolean) — If true, teeth cannot be edited (patient view).
 */

const getInitialTeethStatus = (patientId, teethData) => {
  try {
    const stored = localStorage.getItem(`dc_teethStatus_${patientId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate keys match the current dentition (e.g., don't use adult keys for a child)
      const expectedKeys = [
        ...teethData.upper.map(t => t.fdi),
        ...teethData.lower.map(t => t.fdi),
      ];
      const storedKeys = Object.keys(parsed).map(Number);
      const isCompatible = expectedKeys.every(k => storedKeys.includes(k));
      if (isCompatible) return parsed;
    }
  } catch { /* fallthrough */ }

  return buildInitialTeethStatus(teethData);
};

const getInitialAuditLog = () => [];

export default function ChartingGrid({ readOnly = false }) {
  const { activePatient } = useRole();
  const patientId = activePatient?.id || 'default';

  // ── Resolve dentition type from patient age ──────────────────────────────
  const dentitionType = resolveDentitionType(activePatient?.age);
  const teethData     = getTeethForDentition(dentitionType);
  const isPediatric   = dentitionType !== DentitionType.PERMANENT;

  // Badge appearance per dentition type
  const dentitionBadge = {
    [DentitionType.PRIMARY]:   { text: `Primary Dentition · ${teethData.totalCount} baby teeth`, color: 'bg-pink-100 border-pink-200 text-pink-700' },
    [DentitionType.MIXED]:     { text: `Mixed Dentition · ${teethData.totalCount} teeth`,        color: 'bg-violet-100 border-violet-200 text-violet-700' },
    [DentitionType.PERMANENT]: { text: `Permanent Dentition · ${teethData.totalCount} teeth`,    color: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
  }[dentitionType];

  const [teethStatus, setTeethStatus] = useState(() =>
    getInitialTeethStatus(patientId, teethData)
  );
  const [auditLog, setAuditLog]         = useState(getInitialAuditLog);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const auditEndRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Load patient chart from backend database on active patient change
  useEffect(() => {
    const fetchChartFromDatabase = async () => {
      if (!activePatient || activePatient.id === 'default') return;
      setIsLoading(true);
      const freshTeethData = getTeethForDentition(resolveDentitionType(activePatient?.age));
      try {
        const { data } = await axios.get(`/api/v1/patients/${patientId}/chart`);
        if (data && data.teeth && data.teeth.length > 0) {
          const loadedStatus = {};
          data.teeth.forEach(item => {
            loadedStatus[Number(item.tooth_identifier)] = item.status;
          });
          setTeethStatus(loadedStatus);
        } else {
          setTeethStatus(getInitialTeethStatus(patientId, freshTeethData));
        }
      } catch (err) {
        console.error('Failed to fetch dentition chart from server:', err);
        setTeethStatus(getInitialTeethStatus(patientId, freshTeethData));
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartFromDatabase();
    setAuditLog([]);
    setSelectedTooth(null);
  }, [patientId, activePatient]);

  // Sync teeth status to localStorage keyed by patientId as a backup
  useEffect(() => {
    try {
      localStorage.setItem(`dc_teethStatus_${patientId}`, JSON.stringify(teethStatus));
    } catch { /* ignore */ }
  }, [teethStatus, patientId]);

  // Auto-clear save status badge after 3 seconds
  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Function to save the full chart back to the database
  const saveChartToDatabase = async () => {
    if (!activePatient || activePatient.id === 'default') return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const allTeeth = [...teethData.upper, ...teethData.lower];
      const updates = allTeeth.map(t => {
        const toothId = String(t.fdi);
        const status = teethStatus[t.fdi] || 'Healthy';
        const notationSystem = t.isPrimary ? 'FDI_PRIMARY' : 'FDI_PERMANENT';
        return {
          tooth_identifier: toothId,
          notation_system: notationSystem,
          status: status,
          surfaces: null,
          notes: null
        };
      });

      await axios.post(`/api/v1/patients/${patientId}/chart/teeth`, { updates });
      setSaveStatus('success');
      
      const now = new Date();
      setAuditLog(prev => [
        ...prev,
        {
          system: true,
          message: 'Chart successfully saved to database',
          timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date:      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }
      ]);
    } catch (err) {
      console.error('Failed to save dentition chart:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-scroll audit log
  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditLog]);

  const handleStatusChange = useCallback((toothFdi, newStatus) => {
    setTeethStatus(prev => ({ ...prev, [toothFdi]: newStatus }));

    const now = new Date();
    setAuditLog(prev => [
      ...prev,
      {
        tooth:     toothFdi,
        status:    newStatus,
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date:      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
    ]);
  }, []);

  const handleToothClick = useCallback((toothFdi) => {
    setSelectedTooth(toothFdi);
  }, []);

  function clearAuditLog() { setAuditLog([]); }

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

  // Helper: find the label for a given FDI tooth number (for audit log)
  const allSlots = [...teethData.upper, ...teethData.lower];
  const getLabelForFdi = (fdi) => allSlots.find(s => s.fdi === fdi)?.label ?? String(fdi);

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
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-slate-400">
                  {readOnly
                    ? 'Read-only view of your dental health'
                    : 'Click any tooth to view details · Right-click to update status'}
                </p>
                {/* Dentition type badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                   border text-[10px] font-semibold ${dentitionBadge.color}`}>
                  {dentitionBadge.text}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
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

              {!readOnly && (
                <div className="flex items-center gap-2">
                  {saveStatus === 'success' && (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100 animate-fade-in shrink-0">
                      ✓ Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-100 animate-fade-in shrink-0">
                      ✗ Error saving
                    </span>
                  )}
                  <button
                    onClick={saveChartToDatabase}
                    disabled={isSaving || isLoading}
                    id="save-chart-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dental-500 text-white text-xs font-semibold
                               hover:bg-dental-600 active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-60 shrink-0"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Chart
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Primary dentition info banner */}
          {dentitionType === DentitionType.PRIMARY && (
            <div className="mb-4 p-3 rounded-xl bg-pink-50 border border-pink-100 flex items-center gap-2">
              <span className="text-lg">🍼</span>
              <p className="text-xs text-pink-700 font-medium">
                Primary (deciduous) dentition — Teeth labeled <strong>A through T</strong>.
                Letters shown in <em>italic</em>. Molars are teeth D, E, I, J (upper) and O, N, S, T (lower).
              </p>
            </div>
          )}

          {dentitionType === DentitionType.MIXED && (
            <div className="mb-4 p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-2">
              <span className="text-lg">🦷</span>
              <p className="text-xs text-violet-700 font-medium">
                Mixed dentition — Primary teeth <em>(italic, A–T)</em> coexist with early permanent teeth (first molars &amp; central incisors in FDI notation).
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-dental-500 mb-2" />
              <p className="text-sm font-medium">Loading patient chart...</p>
            </div>
          ) : (
            <>
              {/* ── Upper Arch ─────────────────────── */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Upper Arch (Maxillary)
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="flex justify-center gap-1 sm:gap-1.5 flex-wrap">
                  {teethData.upper.map((slot) => (
                    <Tooth
                      key={slot.fdi}
                      toothNumber={slot.fdi}
                      label={slot.label}
                      location="Upper"
                      status={teethStatus[slot.fdi] || 'Healthy'}
                      isPrimary={slot.isPrimary}
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
                  {teethData.lower.map((slot) => (
                    <Tooth
                      key={slot.fdi}
                      toothNumber={slot.fdi}
                      label={slot.label}
                      location="Lower"
                      status={teethStatus[slot.fdi] || 'Healthy'}
                      isPrimary={slot.isPrimary}
                      onStatusChange={handleStatusChange}
                      onToothClick={handleToothClick}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
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
                    className={`audit-entry ${entry.system ? 'border-blue-200 text-blue-600 bg-blue-50/50' : statusColor[entry.status]}`}
                  >
                    <div className="flex-1">
                      {entry.system ? (
                        <p className="font-semibold text-slate-700">{entry.message}</p>
                      ) : (
                        <p className="font-semibold text-slate-700">
                          Tooth {getLabelForFdi(entry.tooth)}
                          <span className={`ml-1.5 ${
                            entry.status === 'Healthy' ? 'text-emerald-600' :
                            entry.status === 'Cavity'  ? 'text-amber-600' :
                            entry.status === 'Missing' ? 'text-slate-400' :
                                                         'text-blue-600'
                          }`}>
                            → {entry.status}
                          </span>
                        </p>
                      )}
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
          label={getLabelForFdi(selectedTooth)}
          status={teethStatus[selectedTooth]}
          onClose={() => setSelectedTooth(null)}
        />
      )}
    </>
  );
}
