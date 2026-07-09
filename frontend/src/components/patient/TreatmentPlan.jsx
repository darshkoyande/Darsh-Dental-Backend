import { useState, useEffect, useCallback } from 'react';
import { useRole } from '../../context/RoleContext';
import {
  ClipboardCheck, Stethoscope, DollarSign, Layers, CalendarDays,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, ArrowRight, Info
} from 'lucide-react';

/**
 * TreatmentPlan — Structured treatment planning overview table.
 * Persistent in localStorage. Configured with interactive status cycles for dentists.
 *
 * ┌────────────────────────────────────────────────────────┐
 * │  BACKEND: PUT /api/treatment-plans/:id/procedures      │
 * │  Replace local state modifications with an API call    │
 * │  when database connection is ready.                    │
 * └────────────────────────────────────────────────────────┘
 */

const INITIAL_TREATMENT_PLANS = [
  {
    id: 'TP-001',
    patientName: 'Rajivkumar',
    patientId: 'DC-2001',
    globalStatus: 'In Progress',
    diagnosis: {
      primary: 'Mild Gingivitis',
      secondary: 'Occlusal Caries — Tooth #14',
      severity: 'Low',
      notes: 'Gingival inflammation in lower arch, tooth #14 cavity needs filling.',
    },
    procedures: [
      { name: 'Composite Filling', tooth: '#14', priority: 'Medium', status: 'In Progress' },
      { name: 'Prophylaxis & Oral Hygiene Instruction', tooth: 'Full Mouth', priority: 'Low', status: 'Completed' },
    ],
    costBreakdown: [
      { item: 'Prophylaxis', cost: 2000 },
      { item: 'Composite Filling (Tooth #14)', cost: 3000 },
    ],
    phases: [
      { phase: 'Phase 1 — Initial Therapy', description: 'Prophylaxis and oral hygiene instructions', status: 'Completed', duration: '1 week' },
      { phase: 'Phase 2 — Restorative', description: 'Composite filling on tooth #14', status: 'In Progress', duration: '1 week' },
    ],
    appointments: [
      { date: '12-May-2026', procedure: 'Prophylaxis & Assessment', status: 'Completed' },
      { date: '15-Jul-2026', procedure: 'Composite Filling — Tooth #14', status: 'Planned' },
    ],
  },
  {
    id: 'TP-002',
    patientName: 'Aarav Sharma',
    patientId: 'DC-2002',
    globalStatus: 'In Progress',
    diagnosis: {
      primary: 'Fractured Crown — Tooth #3',
      secondary: 'Mild Gingivitis',
      severity: 'Moderate',
      notes: 'Porcelain-fused-to-metal crown replacement required due to crack.',
    },
    procedures: [
      { name: 'Crown Removal', tooth: '#3', priority: 'High', status: 'Completed' },
      { name: 'Zirconia Crown Placement', tooth: '#3', priority: 'High', status: 'In Progress' },
    ],
    costBreakdown: [
      { item: 'Crown Removal', cost: 1500 },
      { item: 'Zirconia Crown Placement', cost: 12000 },
    ],
    phases: [
      { phase: 'Phase 1 — Removal', description: 'Old crown removal and temporary placement', status: 'Completed', duration: '1 visit' },
      { phase: 'Phase 2 — Cementation', description: 'Final crown fitting and cementation', status: 'In Progress', duration: '2 weeks' },
    ],
    appointments: [
      { date: '01-Jun-2026', procedure: 'Crown Removal & Temp Placement', status: 'Completed' },
      { date: '20-Jul-2026', procedure: 'Crown Cementation', status: 'Planned' },
    ],
  },
  {
    id: 'TP-003',
    patientName: 'Priya Patel',
    patientId: 'DC-2003',
    globalStatus: 'Planned',
    diagnosis: {
      primary: 'Impacted Third Molar — Tooth #32',
      secondary: null,
      severity: 'High',
      notes: 'Partially erupted with recurring pericoronitis episodes.',
    },
    procedures: [
      { name: 'Surgical Extraction', tooth: '#32', priority: 'High', status: 'Planned' },
    ],
    costBreakdown: [
      { item: 'Surgical Extraction (Tooth #32)', cost: 6000 },
    ],
    phases: [
      { phase: 'Phase 1 — Pre-surgical', description: 'Consent, prescription of pre-op meds', status: 'Planned', duration: '3 days' },
      { phase: 'Phase 2 — Surgical', description: 'Surgical extraction under local anesthesia', status: 'Planned', duration: '1 day' },
      { phase: 'Phase 3 — Post-op', description: 'Follow-up and suture removal at 1 week', status: 'Planned', duration: '1 week' },
    ],
    appointments: [
      { date: '18-Jun-2026', procedure: 'Pre-surgical Assessment', status: 'Completed' },
      { date: '28-Jun-2026', procedure: 'Surgical Extraction', status: 'Planned' },
    ],
  },
];

function getInitialPlans() {
  try {
    const stored = localStorage.getItem('dc_treatmentPlans');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return INITIAL_TREATMENT_PLANS;
}

function getStatusBadge(status) {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Planned':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'Completed':   return <CheckCircle2 className="w-3 h-3" />;
    case 'In Progress': return <Clock className="w-3 h-3" />;
    case 'Planned':     return <CalendarDays className="w-3 h-3" />;
    default:            return null;
  }
}

function getPriorityStyle(priority) {
  switch (priority) {
    case 'High':   return 'bg-red-50 text-red-700';
    case 'Medium': return 'bg-amber-50 text-amber-700';
    case 'Low':    return 'bg-slate-50 text-slate-600';
    default:       return 'bg-slate-50 text-slate-500';
  }
}

function getGlobalStatusStyle(status) {
  switch (status) {
    case 'Completed':
      return 'from-emerald-500 to-emerald-600 border-emerald-400';
    case 'In Progress':
      return 'from-amber-500 to-amber-600 border-amber-400';
    case 'Planned':
      return 'from-blue-500 to-blue-600 border-blue-400';
    default:
      return 'from-slate-500 to-slate-600 border-slate-400';
  }
}

export default function TreatmentPlan({ patientId = null }) {
  const { userRole } = useRole();
  const [plans, setPlans] = useState(getInitialPlans);
  const [expandedPlan, setExpandedPlan] = useState(null);

  // Sync expanded plan when patientId changes
  useEffect(() => {
    if (patientId) {
      const match = plans.find(p => p.patientId === patientId);
      if (match) setExpandedPlan(match.id);
    } else if (plans.length > 0) {
      setExpandedPlan(plans[0].id);
    }
  }, [patientId, plans]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dc_treatmentPlans', JSON.stringify(plans));
    } catch { /* ignore */ }
  }, [plans]);

  const displayPlans = patientId
    ? plans.filter(p => p.patientId === patientId)
    : plans;

  const handleStatusCycle = useCallback((planId, procedureIndex) => {
    if (userRole !== 'dentist') return;

    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const nextStatus = {
          'Planned': 'In Progress',
          'In Progress': 'Completed',
          'Completed': 'Planned'
        };

        const updatedProcedures = plan.procedures.map((proc, idx) => {
          if (idx === procedureIndex) {
            const next = nextStatus[proc.status] || 'Planned';
            return { ...proc, status: next };
          }
          return proc;
        });

        // Determine new overall global plan status
        const completedCount = updatedProcedures.filter(p => p.status === 'Completed').length;
        let newGlobal = 'Planned';
        if (completedCount === updatedProcedures.length) {
          newGlobal = 'Completed';
        } else if (completedCount > 0 || updatedProcedures.some(p => p.status === 'In Progress')) {
          newGlobal = 'In Progress';
        }

        // Also update corresponding phases and appointments for visual parity if matching
        const updatedPhases = plan.phases.map((phase, idx) => {
          if (idx < completedCount) {
            return { ...phase, status: 'Completed' };
          } else if (idx === completedCount) {
            return { ...phase, status: newGlobal };
          }
          return { ...phase, status: 'Planned' };
        });

        const updatedAppointments = plan.appointments.map((apt, idx) => {
          if (idx < completedCount) {
            return { ...apt, status: 'Completed' };
          } else if (idx === completedCount) {
            return { ...apt, status: newGlobal };
          }
          return { ...apt, status: 'Planned' };
        });

        return {
          ...plan,
          procedures: updatedProcedures,
          globalStatus: newGlobal,
          phases: updatedPhases,
          appointments: updatedAppointments
        };
      }
      return plan;
    }));
  }, [userRole]);

  const isDentist = userRole === 'dentist';

  return (
    <div className="glass-card p-6">
      {/* ── Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-dental-500" />
            {patientId ? 'Patient Treatment Plan' : 'Active Treatment Plans'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {patientId
              ? `Authorized treatment sequence details`
              : `${plans.length} total treatment schemes in play`}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {['Planned', 'In Progress', 'Completed'].map(s => (
            <span key={s} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusBadge(s)}`}>
              {getStatusIcon(s)}
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Plan Cards ──────────────────────── */}
      <div className="space-y-3">
        {displayPlans.map((plan) => {
          const isExpanded = expandedPlan === plan.id;
          const totalCost = plan.costBreakdown.reduce((sum, item) => sum + item.cost, 0);
          const completedCount = plan.procedures.filter(p => p.status === 'Completed').length;

          return (
            <div
              key={plan.id}
              className={`rounded-xl border transition-all duration-300 overflow-hidden
                ${isExpanded ? 'border-dental-200 shadow-card-hover' : 'border-slate-100 shadow-card hover:shadow-card-hover'}`}
            >
              {/* Card Header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGlobalStatusStyle(plan.globalStatus)}
                    flex items-center justify-center text-white shadow-sm`}>
                    {plan.globalStatus === 'Completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : plan.globalStatus === 'In Progress' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <CalendarDays className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-dental-600 transition-colors">
                        {plan.patientName}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">{plan.id}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {plan.diagnosis.primary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Progress indicator */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          plan.globalStatus === 'Completed' ? 'bg-emerald-500'
                            : plan.globalStatus === 'In Progress' ? 'bg-amber-500'
                            : 'bg-blue-400'
                        }`}
                        style={{ width: `${(completedCount / plan.procedures.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {completedCount}/{plan.procedures.length} Done
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusBadge(plan.globalStatus)}`}>
                    {getStatusIcon(plan.globalStatus)}
                    {plan.globalStatus}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-dental-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-dental-500 transition-colors" />
                  )}
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-5 pb-5 animate-slide-up">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* ── Diagnosis Details ──────── */}
                    <div className="rounded-xl border border-slate-100 p-4 bg-white">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-dental-500" />
                        Diagnosis Details
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Primary</p>
                          <p className="text-sm font-medium text-slate-700">{plan.diagnosis.primary}</p>
                        </div>
                        {plan.diagnosis.secondary && (
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Secondary</p>
                            <p className="text-sm font-medium text-slate-700">{plan.diagnosis.secondary}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Severity:</span>
                          <span className={`badge ${
                            plan.diagnosis.severity === 'High' ? 'badge-red' :
                            plan.diagnosis.severity === 'Moderate' ? 'badge-amber' : 'badge-emerald'
                          }`}>{plan.diagnosis.severity}</span>
                        </div>
                        {plan.diagnosis.notes && (
                          <div className="mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-600 flex items-start gap-1.5">
                              <AlertCircle className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              {plan.diagnosis.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Recommended Procedures ───── */}
                    <div className="rounded-xl border border-slate-100 p-4 bg-white">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5 text-dental-500" />
                        Recommended Procedures
                      </h4>
                      {isDentist && (
                        <p className="text-[9px] text-slate-400 mb-2 flex items-center gap-1">
                          <Info className="w-3 h-3 text-dental-500" />
                          Dentist Workflow: Click status badges below to cycle and update.
                        </p>
                      )}
                      <div className="space-y-2">
                        {plan.procedures.map((proc, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px]
                                ${proc.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                  proc.status === 'In Progress' ? 'bg-amber-100 text-amber-600' :
                                  'bg-blue-100 text-blue-600'}`}>
                                {proc.status === 'Completed' ? '✓' : idx + 1}
                              </span>
                              <div>
                                <p className={`text-xs font-medium ${proc.status === 'Completed' ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                  {proc.name}
                                </p>
                                <p className="text-[10px] text-slate-400">Tooth: {proc.tooth}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getPriorityStyle(proc.priority)}`}>
                                {proc.priority}
                              </span>
                              <button
                                disabled={!isDentist}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusCycle(plan.id, idx);
                                }}
                                className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-150
                                  ${getStatusBadge(proc.status)}
                                  ${isDentist ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-sm hover:border-dental-300' : 'cursor-default'}`}
                                title={isDentist ? 'Click to cycle status' : undefined}
                              >
                                {getStatusIcon(proc.status)}
                                {proc.status}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* ── Cost Estimation ──────────── */}
                    <div className="rounded-xl border border-slate-100 p-4 bg-white">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-dental-500" />
                        Estimated Cost
                      </h4>
                      <div className="space-y-1.5">
                        {plan.costBreakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                            <span className="text-slate-600">{item.item}</span>
                            <span className="font-semibold text-slate-800">₹{item.cost.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-slate-200">
                          <span className="font-bold text-slate-800">Total Estimated</span>
                          <span className="font-bold text-dental-600 text-base">₹{totalCost.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Treatment Phases ──────────── */}
                    <div className="rounded-xl border border-slate-100 p-4 bg-white">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-dental-500" />
                        Treatment Phases
                      </h4>
                      <div className="space-y-2">
                        {plan.phases.map((phase, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                                ${phase.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                  phase.status === 'In Progress' ? 'bg-amber-500 text-white' :
                                  'bg-slate-200 text-slate-500'}`}>
                                {phase.status === 'Completed' ? '✓' : idx + 1}
                              </div>
                              {idx < plan.phases.length - 1 && (
                                <div className={`w-px h-6 ${
                                  phase.status === 'Completed' ? 'bg-emerald-300' : 'bg-slate-200'
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-700">{phase.phase}</p>
                                <span className="text-[10px] text-slate-400">{phase.duration}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{phase.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Appointments Timeline ───── */}
                    <div className="rounded-xl border border-slate-100 p-4 bg-white lg:col-span-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-dental-500" />
                        Scheduled Appointments
                      </h4>
                      <div className="flex items-start gap-0 overflow-x-auto pb-2 scrollbar-thin">
                        {plan.appointments.map((apt, idx) => (
                          <div key={idx} className="flex items-center shrink-0">
                            <div className="flex flex-col items-center px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors min-w-[140px]">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2
                                ${apt.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                  apt.status === 'In Progress' ? 'bg-amber-500 text-white' :
                                  'bg-blue-100 text-blue-600'}`}>
                                {apt.status === 'Completed' ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : apt.status === 'In Progress' ? (
                                  <Clock className="w-4 h-4" />
                                ) : (
                                  <CalendarDays className="w-4 h-4" />
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-slate-700 text-center">{apt.date}</p>
                              <p className="text-[10px] text-slate-500 text-center mt-0.5 leading-tight">{apt.procedure}</p>
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold mt-1.5 border ${getStatusBadge(apt.status)}`}>
                                {apt.status}
                              </span>
                            </div>
                            {idx < plan.appointments.length - 1 && (
                              <ArrowRight className={`w-4 h-4 shrink-0 mx-2 ${
                                apt.status === 'Completed' ? 'text-emerald-400' : 'text-slate-300'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
