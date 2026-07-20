import { useState, useCallback, useMemo, useEffect } from 'react';

import { useRole } from '../../context/RoleContext';

import { Activity, Droplets, TrendingDown, RotateCcw, Info } from 'lucide-react';
/**
 * PerioChart — Interactive Periodontal Charting Component.
 *
 * Allows rapid data entry for gum health metrics per tooth:
 * • Pocket Depth (1–9 mm) — 3 sites per tooth (mesial, mid, distal)
 * • Bleeding on Probing (BOP) — Toggle per site with 4 severity levels (0: None, 1: Mild, 2: Moderate, 3: Severe)
 * • Gum Recession (mm) — Single value per tooth
 *
 * Designed for instant state updates and zero input lag.
 */
const UPPER_TEETH = Array.from({ length: 16 }, (_, i) => i + 1);

const LOWER_TEETH = Array.from({ length: 16 }, (_, i) => i + 17);

/**
 * F4: Wisdom tooth positions (1-based sequential numbering):
 *   Upper: position 1 (FDI 18), position 16 (FDI 28)
 *   Lower: position 17 (FDI 48), position 32 (FDI 38)
 */
const WISDOM_TEETH_POSITIONS = new Set([1, 16, 17, 32]);

const SITES = ['Mesial', 'Mid', 'Distal'];
function getDefaultPerioData(patientId) {
  const data = {};
  for (let i = 1; i <= 32; i++) {
    data[i] = {
      pocketDepth: [3, 2, 3],     // mesial, mid, distal
      bop: [0, 0, 0],            // bleeding severity level: 0 (none), 1 (mild), 2 (mod), 3 (sev)
      recession: 0,
    };
  }
  
  if (patientId === 'DC-2001') {
    // Rajivkumar: mild gingivitis, shallow pocketing
    data[14] = { pocketDepth: [4, 4, 3], bop: [1, 0, 0], recession: 0 };
    data[24] = { pocketDepth: [3, 4, 3], bop: [0, 1, 0], recession: 0 };
  } else if (patientId === 'DC-2002') {
    // Aarav Sharma: moderate periodontitis
    data[3]  = { pocketDepth: [4, 5, 3], bop: [2, 1, 0], recession: 2 };
    data[14] = { pocketDepth: [6, 4, 5], bop: [3, 0, 2], recession: 3 };
    data[19] = { pocketDepth: [5, 6, 7], bop: [2, 3, 2], recession: 4 };
  } else if (patientId === 'DC-2003') {
    // Priya Patel: normal gum measurements
    data[32] = { pocketDepth: [5, 3, 3], bop: [1, 0, 0], recession: 0 };
  }
  // For any other patient (newly added), all teeth retain the clean
  // baseline set above. Perio data only changes when a dentist
  // explicitly records measurements for this patient.
  return data;

}
function getInitialPerioData(patientId) {
  try {
    const stored = localStorage.getItem(`dc_perioData_${patientId}`);
    if (stored) return JSON.parse(stored);
  } catch { /* fallthrough */ }
  return getDefaultPerioData(patientId);
}
function getPocketColor(depth) {
  if (depth <= 3) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (depth <= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';

}
function getPocketBarColor(depth) {
  if (depth <= 3) return 'bg-emerald-400';
  if (depth <= 5) return 'bg-amber-400';
  return 'bg-red-500';

}
function getRecessionColor(val) {
  if (val === 0) return 'text-slate-400';
  if (val <= 2) return 'text-amber-600';
  return 'text-red-600';

}
export default function PerioChart() {
  const { activePatient } = useRole();
  const patientId = activePatient?.id || 'default';
  const [perioData, setPerioData] = useState(() => getInitialPerioData(patientId));
  const [activeArch, setActiveArch] = useState('upper');
  const [hoveredTooth, setHoveredTooth] = useState(null);

  // Sync state when active patient changes
  useEffect(() => {
    setPerioData(getInitialPerioData(patientId));
  }, [patientId]);

  // F4: Pediatric view — hide wisdom teeth for patients aged 16 or younger
  const isPediatric = activePatient?.age != null && activePatient.age <= 16;
  const displayUpper = isPediatric
    ? UPPER_TEETH.filter((n) => !WISDOM_TEETH_POSITIONS.has(n))
    : UPPER_TEETH;
  const displayLower = isPediatric
    ? LOWER_TEETH.filter((n) => !WISDOM_TEETH_POSITIONS.has(n))
    : LOWER_TEETH;

  // Persist perio data to localStorage keyed by patientId
  useEffect(() => {
    try {
      localStorage.setItem(`dc_perioData_${patientId}`, JSON.stringify(perioData));
    } catch { /* ignore */ }
  }, [perioData, patientId]);
  const teeth = activeArch === 'upper' ? displayUpper : displayLower;
  const handlePocketChange = useCallback((toothNum, siteIdx, value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 9) return;
    setPerioData(prev => ({
      ...prev,
      [toothNum]: {
        ...prev[toothNum],
        pocketDepth: prev[toothNum].pocketDepth.map((v, i) => i === siteIdx ? num : v),
      },
    }));
  }, []);
  const handleBopToggle = useCallback((toothNum, siteIdx) => {
    setPerioData(prev => ({
      ...prev,
      [toothNum]: {
        ...prev[toothNum],
        bop: prev[toothNum].bop.map((v, i) => {
          if (i !== siteIdx) return v;
          // Support old schema booleans safely, otherwise cycle 0 -> 1 -> 2 -> 3 -> 0
          const currentSeverity = typeof v === 'boolean' ? (v ? 2 : 0) : v;
          return (currentSeverity + 1) % 4;
        }),
      },
    }));
  }, []);
  const handleRecessionChange = useCallback((toothNum, value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0 || num > 9) return;
    setPerioData(prev => ({
      ...prev,
      [toothNum]: {
        ...prev[toothNum],
        recession: num,
      },
    }));
  }, []);
  const handleReset = useCallback(() => {
    const defaults = getDefaultPerioData(patientId);
    setPerioData(defaults);
  }, [patientId]);
  // Summary stats
  const stats = useMemo(() => {
    let totalSites = 0;
    let deepPockets = 0;
    let bleedingSites = 0;
    let totalRecession = 0;
    teeth.forEach(num => {
      const d = perioData[num];
      d.pocketDepth.forEach((p, i) => {
        totalSites++;
        if (p >= 5) deepPockets++;
        // Count site as bleeding if severity level > 0 or if old data legacy true
        if (d.bop[i] && d.bop[i] !== 0) bleedingSites++;
      });
      totalRecession += d.recession;
    });
    return {
      totalSites,
      deepPockets,
      bleedingSites,
      avgRecession: teeth.length > 0 ? (totalRecession / teeth.length).toFixed(1) : '0.0',
      bopPercentage: totalSites > 0 ? Math.round((bleedingSites / totalSites) * 100) : 0,
    };
  }, [perioData, teeth]);
  return (
    <div className="glass-card p-6">
      {/* ── Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-dental-500" />
            Periodontal Chart
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record pocket depths, bleeding points, and recession values
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Arch Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveArch('upper')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${activeArch === 'upper'
                  ? 'bg-white text-dental-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upper Arch
            </button>
            <button
              onClick={() => setActiveArch('lower')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${activeArch === 'lower'
                  ? 'bg-white text-dental-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lower Arch
            </button>
          </div>
          {/* F4: Pediatric badge next to arch toggle */}
          {isPediatric && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                             bg-violet-100 border border-violet-200 text-violet-700
                             text-[10px] font-semibold">
              Pediatric Chart (28 teeth)
            </span>
          )}
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Reset chart data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* ── Summary Stat Pills ───────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-slate-600">
            Deep Pockets (≥5mm): <span className="font-bold text-red-600">{stats.deepPockets}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <Droplets className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-medium text-slate-600">
            BOP: <span className="font-bold text-red-600">{stats.bopPercentage}%</span>
            <span className="text-slate-400 ml-1">({stats.bleedingSites}/{stats.totalSites} sites)</span>
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-slate-600">
            Avg Recession: <span className="font-bold text-amber-600">{stats.avgRecession}mm</span>
          </span>
        </div>
      </div>
      {/* ── Legend ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span className="text-[10px] font-medium text-slate-500">1-3mm (Healthy)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-400" />
          <span className="text-[10px] font-medium text-slate-500">4-5mm (Moderate)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-[10px] font-medium text-slate-500">6-9mm (Severe)</span>
        </div>
        <div className="flex items-center gap-3 border-l pl-3 border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">BOP Severity:</span>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-slate-100 border border-slate-200 text-[9px] text-slate-400 font-bold">0</span>
            <span className="text-[10px] text-slate-500">None</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-red-50 border border-red-200 text-[9px] text-red-500 font-bold">1</span>
            <span className="text-[10px] text-slate-500">Mild</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-red-500 text-[9px] text-white font-bold">2</span>
            <span className="text-[10px] text-slate-500">Mod</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-flex items-center justify-center rounded bg-rose-800 text-[9px] text-white font-bold animate-pulse">3</span>
            <span className="text-[10px] text-slate-500">Sev</span>
          </div>
        </div>
      </div>
      {/* ── Perio Data Grid ──────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse" id="perio-chart-table">
          {/* Tooth numbers */}
          <thead>
            <tr className="bg-slate-50/80">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-left border-r border-slate-100 min-w-[100px]">
                Metric
              </th>
              {teeth.map(num => (
                <th
                  key={num}
                  className={`px-1 py-2 text-center min-w-[56px] transition-colors duration-150
                    ${hoveredTooth === num ? 'bg-dental-50' : ''}`}
                  onMouseEnter={() => setHoveredTooth(num)}
                  onMouseLeave={() => setHoveredTooth(null)}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold
                    ${hoveredTooth === num
                      ? 'bg-dental-500 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200'}`}>
                    {num}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {/* ── Pocket Depth Row (3 sites) ──── */}
            {SITES.map((site, siteIdx) => (
              <tr key={site} className="group">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      siteIdx === 0 ? 'bg-dental-400' :
                      siteIdx === 1 ? 'bg-dental-300' : 'bg-dental-200'
                    }`} />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      PD {site}
                    </span>
                  </div>
                </td>
                {teeth.map(num => {
                  const depth = perioData[num].pocketDepth[siteIdx];
                  const colorClass = getPocketColor(depth);
                  return (
                    <td
                      key={num}
                      className={`px-1 py-1.5 text-center transition-colors duration-150
                        ${hoveredTooth === num ? 'bg-dental-50/50' : ''}`}
                      onMouseEnter={() => setHoveredTooth(num)}
                      onMouseLeave={() => setHoveredTooth(null)}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={depth}
                          onChange={(e) => handlePocketChange(num, siteIdx, e.target.value)}
                          className={`w-9 h-7 text-center text-xs font-bold rounded-lg border
                            focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                            transition-all duration-150 perio-input ${colorClass}`}
                          aria-label={`Pocket depth ${site} for tooth ${num}`}
                        />
                        {/* Mini depth bar */}
                        <div className="w-7 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getPocketBarColor(depth)}`}
                            style={{ width: `${(depth / 9) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* ── BOP Row (3 sites) ───────────── */}
            {SITES.map((site, siteIdx) => (
              <tr key={`bop-${site}`} className={siteIdx === 0 ? 'border-t-2 border-slate-100' : ''}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      BOP {site}
                    </span>
                  </div>
                </td>
                {teeth.map(num => {
                  const rawBleeding = perioData[num].bop[siteIdx];
                  // Handle Boolean fallback natively
                  const bleedingLvl = typeof rawBleeding === 'boolean' ? (rawBleeding ? 2 : 0) : rawBleeding;

                  // Define contextual styles based on severity levels
                  let severityClasses = 'bg-white border-slate-200 text-slate-300 hover:border-red-300 hover:text-red-400';
                  let label = 'None';
                  
                  if (bleedingLvl === 1) {
                    severityClasses = 'bg-red-50 border-red-200 text-red-400 shadow-sm shadow-red-100';
                    label = 'Mild Bleeding';
                  } else if (bleedingLvl === 2) {
                    severityClasses = 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-200 scale-105';
                    label = 'Moderate Bleeding';
                  } else if (bleedingLvl === 3) {
                    severityClasses = 'bg-rose-800 border-rose-900 text-white shadow-md shadow-rose-300 scale-110 font-black';
                    label = 'Severe Bleeding';
                  }

                  return (
                    <td
                      key={num}
                      className={`px-1 py-1.5 text-center transition-colors duration-150
                        ${hoveredTooth === num ? 'bg-dental-50/50' : ''}`}
                      onMouseEnter={() => setHoveredTooth(num)}
                      onMouseLeave={() => setHoveredTooth(null)}
                    >
                      <button
                        onClick={() => handleBopToggle(num, siteIdx)}
                        className={`w-7 h-7 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center relative
                          ${severityClasses}`}
                        aria-label={`Bleeding severity level ${bleedingLvl} for ${site} site on tooth ${num}`}
                        title={`BOP Severity: ${label} (Click to change)`}
                      >
                        <Droplets className="w-3 h-3" />
                        {bleedingLvl > 0 && (
                          <span className="text-[7px] leading-none font-bold block absolute bottom-0.5">
                            {bleedingLvl}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* ── Recession Row ───────────────── */}
            <tr className="border-t-2 border-slate-100">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-slate-100">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Recession
                  </span>
                </div>
              </td>
              {teeth.map(num => {
                const rec = perioData[num].recession;
                return (
                  <td
                    key={num}
                    className={`px-1 py-1.5 text-center transition-colors duration-150
                      ${hoveredTooth === num ? 'bg-dental-50/50' : ''}`}
                    onMouseEnter={() => setHoveredTooth(num)}
                    onMouseLeave={() => setHoveredTooth(null)}
                  >
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={rec}
                      onChange={(e) => handleRecessionChange(num, e.target.value)}
                      className={`w-9 h-7 text-center text-xs font-bold rounded-lg border border-slate-200
                        bg-white focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                        transition-all duration-150 perio-input ${getRecessionColor(rec)}`}
                      aria-label={`Recession for tooth ${num}`}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {/* ── Footer hint ──────────────────────── */}
      <div className="flex items-center gap-2 mt-4 px-1">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-[10px] text-slate-400">
          Enter pocket depths (1-9mm) directly. Click blood drop icons to cycle through bleeding severity levels (0=None, 1=Mild, 2=Mod, 3=Sev). All values update instantly.
          Hover over a tooth column to highlight. Depths ≥5mm are flagged as concerning.
        </p>
      </div>
    </div>
  );
}