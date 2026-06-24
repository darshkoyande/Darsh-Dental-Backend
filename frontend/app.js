/* ══════════════════════════════════════════════════════════════
   LUMEN DENTAL – Periodontal Charting Frontend App
   Connects to FastAPI backend at http://127.0.0.1:8000
   ══════════════════════════════════════════════════════════════ */

const API_BASE = 'http://127.0.0.1:8000';

// ── State ────────────────────────────────────────────────────────
let state = {
  currentPatientId: 1, // Aarav Mehta's DB id initially
  patient: null,
  chartData: null,
  stats: null,
  aiData: null,
  selectedTooth: 16,
  activeView: 'CAL',    // CAL | Plaque | Suppuration
  activeTab: 'perio',
  currentModule: 'charting',  // charting | patients | schedule | imaging | reports
  patients: [],
  appointments: [],
  imagingRecords: [],
  clinicalReports: [],
};

// ── FDI Tooth Order ──────────────────────────────────────────────
const MAXILLA_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const MANDIBLE_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const RIGHT_SIDE_TEETH = new Set([18,17,16,15,14,13,12,11,48,47,46,45,44,43,42,41]);

// ── Utility ──────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function pdClass(val) {
  if (!val || val === 0) return 'pd-zero';
  if (val <= 3) return 'pd-healthy';
  if (val <= 5) return 'pd-initial';
  return 'pd-severe';
}

function pdColor(val) {
  if (!val || val === 0) return 'var(--text-muted)';
  if (val <= 3) return 'var(--healthy)';
  if (val <= 5) return 'var(--initial)';
  return 'var(--severe)';
}

function maxPD(tooth) {
  if (!tooth) return 0;
  const pds = ['pd_db','pd_b','pd_mb','pd_dl','pd_l','pd_ml'].map(k => tooth[k] || 0);
  return Math.max(...pds);
}

function getTeethMap(chartData) {
  const map = {};
  (chartData?.teeth_data || []).forEach(t => { map[t.tooth_number] = t; });
  return map;
}

function showToast(msg, duration = 3000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function showComingSoon(section) {
  showToast(`${section} module coming soon!`);
}

// ── Site accessor helpers ─────────────────────────────────────────
// Returns 3 buccal/facial site measurements in display order (distal→mesial toward midline)
function getBuccalSites(tooth, isRightSide) {
  if (!tooth) return [{pd:0,gm:0,cal:0,bop:false,plaque:false,pus:false},{pd:0,gm:0,cal:0,bop:false,plaque:false,pus:false},{pd:0,gm:0,cal:0,bop:false,plaque:false,pus:false}];
  const db = { pd: tooth.pd_db||0, gm: tooth.gm_db||0, cal: tooth.cal_db||0, bop: tooth.bop_db, plaque: tooth.plaque_db, pus: tooth.pus_db };
  const b  = { pd: tooth.pd_b||0,  gm: tooth.gm_b||0,  cal: tooth.cal_b||0,  bop: tooth.bop_b,  plaque: tooth.plaque_b,  pus: tooth.pus_b  };
  const mb = { pd: tooth.pd_mb||0, gm: tooth.gm_mb||0, cal: tooth.cal_mb||0, bop: tooth.bop_mb, plaque: tooth.plaque_mb, pus: tooth.pus_mb };
  // Right-side: distal is toward the lateral side, mesial is toward midline → display D, B, M left-to-right
  // Left-side: mesial is now on the left → display M, B, D left-to-right
  return isRightSide ? [db, b, mb] : [mb, b, db];
}

function getLingualSites(tooth, isRightSide) {
  if (!tooth) return [{pd:0,gm:0,cal:0,bop:false,plaque:false,pus:false},{pd:0,gm:0,cal:0,bop:false,plaque:false,pus:false},{pd:0,gm:0,cal:0,bop:false,plaque:false,pus:false}];
  const dl = { pd: tooth.pd_dl||0, gm: tooth.gm_dl||0, cal: tooth.cal_dl||0, bop: tooth.bop_dl, plaque: tooth.plaque_dl, pus: tooth.pus_dl };
  const l  = { pd: tooth.pd_l||0,  gm: tooth.gm_l||0,  cal: tooth.cal_l||0,  bop: tooth.bop_l,  plaque: tooth.plaque_l,  pus: tooth.pus_l  };
  const ml = { pd: tooth.pd_ml||0, gm: tooth.gm_ml||0, cal: tooth.cal_ml||0, bop: tooth.bop_ml, plaque: tooth.plaque_ml, pus: tooth.pus_ml };
  return isRightSide ? [dl, l, ml] : [ml, l, dl];
}

function getSiteLabels(isRightSide, type) {
  // type: 'B' (buccal) or 'L' (lingual)
  return isRightSide ? ['D', type, 'M'] : ['M', type, 'D'];
}

// ── API Calls ────────────────────────────────────────────────────
async function fetchPatient(id) {
  const r = await fetch(`${API_BASE}/patients/${id}`);
  if (!r.ok) throw new Error(`Patient fetch failed: ${r.status}`);
  return r.json();
}

async function fetchLatestChart(patientId) {
  const r = await fetch(`${API_BASE}/patients/${patientId}/charts/latest`);
  if (!r.ok) throw new Error(`Chart fetch failed: ${r.status}`);
  return r.json();
}

async function fetchAIAnalysis(chartId) {
  const r = await fetch(`${API_BASE}/charts/${chartId}/ai-analysis`, { method: 'POST' });
  if (!r.ok) throw new Error(`AI analysis failed: ${r.status}`);
  return r.json();
}

// ── NEW API CALLS FOR SCHEDULE, IMAGING, REPORTS ──────────────────
async function fetchAllPatients() {
  const r = await fetch(`${API_BASE}/patients/?skip=0&limit=100`);
  if (!r.ok) throw new Error(`Patients fetch failed: ${r.status}`);
  return r.json();
}

async function fetchPatientAppointments(patientId) {
  const r = await fetch(`${API_BASE}/schedule/patients/${patientId}/appointments`);
  if (!r.ok) throw new Error(`Appointments fetch failed: ${r.status}`);
  return r.json();
}

async function fetchPatientImagingRecords(patientId) {
  const r = await fetch(`${API_BASE}/imaging/patients/${patientId}/records`);
  if (!r.ok) throw new Error(`Imaging records fetch failed: ${r.status}`);
  return r.json();
}

async function fetchPatientReports(patientId) {
  const r = await fetch(`${API_BASE}/reports/patients/${patientId}/all`);
  if (!r.ok) throw new Error(`Reports fetch failed: ${r.status}`);
  return r.json();
}

async function createAppointment(appointment) {
  const r = await fetch(`${API_BASE}/schedule/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment)
  });
  if (!r.ok) throw new Error(`Create appointment failed: ${r.status}`);
  return r.json();
}

async function createImagingRecord(imaging) {
  const r = await fetch(`${API_BASE}/imaging/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(imaging)
  });
  if (!r.ok) throw new Error(`Create imaging record failed: ${r.status}`);
  return r.json();
}

async function createClinicalReport(report) {
  const r = await fetch(`${API_BASE}/reports/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
  if (!r.ok) throw new Error(`Create report failed: ${r.status}`);
  return r.json();
}

// ── TOOTH SVG ────────────────────────────────────────────────────
function toothSVG(status, mp, furcation, mobility, isSelected) {
  if (status === 'Missing') {
    return `<svg width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="8" y1="8" x2="30" y2="48" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>
      <line x1="30" y1="8" x2="8" y2="48" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>
    </svg>`;
  }

  let stroke = 'rgba(0,0,0,0.18)';
  let fill = 'rgba(0,0,0,0.02)';
  let glowFilter = '';

  if (mp >= 6) { stroke = '#cf222e'; fill = 'rgba(207,34,46,0.08)'; glowFilter = 'drop-shadow(0 0 4px rgba(207,34,46,0.25))'; }
  else if (mp >= 4) { stroke = '#bf8700'; fill = 'rgba(191,135,0,0.06)'; }
  else if (mp >= 1) { stroke = '#1a7f37'; fill = 'rgba(26,127,55,0.05)'; }

  if (isSelected) { stroke = '#24292f'; fill = 'rgba(36,41,47,0.06)'; glowFilter = 'drop-shadow(0 0 4px rgba(36,41,47,0.20))'; }

  const implantMark = status === 'Implant'
    ? `<line x1="19" y1="2" x2="19" y2="9" stroke="#57606a" stroke-width="2" stroke-linecap="round"/>
       <line x1="14" y1="5" x2="24" y2="5" stroke="#57606a" stroke-width="2" stroke-linecap="round"/>` : '';

  const crownMark = status === 'Crown'
    ? `<rect x="7" y="5" width="24" height="9" rx="2" fill="rgba(191,135,0,0.08)" stroke="#bf8700" stroke-width="1" opacity="0.8"/>` : '';

  // Furcation indicator (small triangle at root)
  const furcMark = furcation > 0
    ? `<text x="19" y="53" text-anchor="middle" font-size="7" fill="#bf8700" font-weight="700">${'F'.repeat(furcation)}</text>` : '';

  // Mobility indicator (small M at crown)
  const mobMark = mobility > 0
    ? `<text x="31" y="11" text-anchor="middle" font-size="7" fill="#57606a" font-weight="700">M${mobility}</text>` : '';

  return `<svg width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:${glowFilter}">
    <path d="M10 5 C7 5 4 8 4 15 C4 22 5.5 30 7.5 37 C9 43 11 51 13 54 C14 56 16 56 17 54 C18 50 19 45 19 43 C19 45 20 50 21 54 C22 56 24 56 25 54 C27 51 29 43 30.5 37 C32.5 30 34 22 34 15 C34 8 31 5 28 5 Q19 2 10 5Z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
    ${crownMark}
    ${implantMark}
    ${furcMark}
    ${mobMark}
  </svg>`;
}

// ── Render Patient Header ─────────────────────────────────────────
function renderPatientHeader(patient) {
  const initials = patient.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  $('user-avatar').textContent = patient.primary_doctor.split(' ').slice(1).map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'PS';

  $('patient-header').innerHTML = `
    <div class="patient-avatar">${initials}</div>

    <div class="patient-info">
      <div class="patient-name-row">
        <span class="patient-name">${patient.name}</span>
        <span class="status-badge ${patient.status === 'Active' ? 'active' : 'inactive'}">${patient.status}</span>
      </div>
      <div class="patient-meta">
        <span class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10M7 12h5"/></svg>
          ${patient.patient_id}
        </span>
        ${patient.abha_id ? `<span class="meta-item highlight">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9z"/></svg>
          ABHA ${patient.abha_id}
        </span>` : ''}
        <span class="meta-item">${patient.age} yrs · ${patient.gender}</span>
        <span class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${patient.primary_doctor}
        </span>
        ${patient.last_visit ? `<span class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Last visit ${patient.last_visit}
        </span>` : ''}
        ${patient.next_visit ? `<span class="meta-item highlight">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Next ${patient.next_visit}
        </span>` : ''}
      </div>
    </div>

    <div class="patient-actions">
      <button class="btn btn-ghost" onclick="showComingSoon('Print')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print
      </button>
      <button class="btn btn-ghost" onclick="showComingSoon('Export PDF')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Export PDF
      </button>
      <button class="btn btn-ghost" onclick="showComingSoon('Share')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </button>
      <button class="btn btn-primary" onclick="switchTab('ai')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
        AI Analysis
      </button>
    </div>
  `;
}

// ── Render Statistics Grid ────────────────────────────────────────
function renderStats(stats) {
  const cards = [
    {
      label: 'Total Teeth', value: stats.total_teeth, sub: `${32 - stats.missing_teeth} charted`,
      icon: '🦷', type: 'info',
      iconBg: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa'
    },
    {
      label: 'Missing', value: stats.missing_teeth, sub: 'extracted / unerupted',
      icon: '⚠️', type: 'warning',
      iconBg: 'rgba(245,158,11,0.15)', iconColor: '#f59e0b'
    },
    {
      label: 'Bleeding Sites', value: stats.bleeding_sites_count, sub: `${stats.bleeding_sites_percentage}% of sites`,
      icon: '🩸', type: 'danger',
      iconBg: 'rgba(239,68,68,0.15)', iconColor: '#ef4444'
    },
    {
      label: 'Avg Pocket Depth', value: `${stats.avg_pocket_depth}`, unit: 'mm',
      sub: 'healthy ≤ 3 mm',
      icon: '📏', type: stats.avg_pocket_depth >= 4 ? 'warning' : 'healthy',
      iconBg: 'rgba(245,158,11,0.15)', iconColor: '#f59e0b'
    },
    {
      label: 'Deep Pockets ≥6mm', value: stats.deep_pockets_count, sub: 'intervention sites',
      icon: '🚨', type: 'danger',
      iconBg: 'rgba(239,68,68,0.15)', iconColor: '#ef4444'
    },
    {
      label: 'Mobility Cases', value: stats.mobility_cases_count, sub: 'teeth with grade ≥ 1',
      icon: '🔀', type: 'warning',
      iconBg: 'rgba(245,158,11,0.15)', iconColor: '#f59e0b'
    },
    {
      label: 'Furcation Cases', value: stats.furcation_cases_count, sub: 'multi-rooted teeth',
      icon: '⚡', type: 'purple',
      iconBg: 'rgba(129,140,248,0.15)', iconColor: '#818cf8'
    },
    {
      label: 'Treatment Status', value: stats.treatment_status, sub: 'SRP scheduled',
      icon: '❤️', type: 'info',
      iconBg: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa',
      isText: true
    },
  ];

  $('stats-grid').innerHTML = cards.map((c, i) => `
    <div class="stat-card ${c.type} fade-in" style="animation-delay:${i * 50}ms">
      <div class="stat-header">
        <span class="stat-label">${c.label}</span>
        <div class="stat-icon" style="background:${c.iconBg}; color:${c.iconColor}">${c.icon}</div>
      </div>
      <div class="stat-value ${c.isText ? 'stat-value-text' : ''}">
        ${c.value}${c.unit ? `<span class="unit">${c.unit}</span>` : ''}
      </div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');
}

// ── Render a single measurement cell ──────────────────────────────
function bopDotHTML(bleeding) {
  return `<span class="bop-dot ${bleeding ? 'bleeding' : 'no-bleed'}"></span>`;
}

function pdValHTML(val, view, site) {
  if (view === 'Plaque') {
    const has = site.plaque;
    return `<span class="site-val ${has ? 'pd-initial' : 'pd-zero'}">${has ? '●' : '○'}</span>`;
  }
  if (view === 'Suppuration') {
    const has = site.pus;
    return `<span class="site-val ${has ? 'pd-severe' : 'pd-zero'}">${has ? '●' : '○'}</span>`;
  }
  // CAL view (default)
  if (!val || val === 0) return `<span class="site-val pd-zero">—</span>`;
  return `<span class="site-val ${pdClass(val)}">${val}</span>`;
}

function gmValHTML(val) {
  if (!val || val === 0) return `<span class="site-val pd-zero"> </span>`;
  return `<span class="site-val gm-val">${val}</span>`;
}

function pdNumHTML(val) {
  if (!val || val === 0) return `<span class="site-val pd-zero">—</span>`;
  return `<span class="site-val ${pdClass(val)}">${val}</span>`;
}

// ── Render a tooth column ─────────────────────────────────────────
function renderToothColumn(toothNum, teethMap, isMaxilla) {
  const tooth = teethMap[toothNum];
  const isMissing = !tooth || tooth.status === 'Missing';
  const isRight = RIGHT_SIDE_TEETH.has(toothNum);
  const isSelected = state.selectedTooth === toothNum;
  const mp = maxPD(tooth);

  const bSites = getBuccalSites(tooth, isRight);  // 3 buccal sites
  const lSites = getLingualSites(tooth, isRight);  // 3 lingual sites
  const bLabels = getSiteLabels(isRight, 'B');
  const lLabels = getSiteLabels(isRight, 'L');

  const view = state.activeView; // CAL | Plaque | Suppuration

  // For Maxilla: Buccal on top → rows from outside in: BOP, CAL, GM, PD | TOOTH | PD, GM, CAL, BOP
  // For Mandible: Lingual on top → rows from outside in: BOP(L), CAL(L), GM(L), PD(L) | TOOTH | PD(B), GM(B), CAL(B), BOP(B)
  const topSites  = isMaxilla ? bSites : lSites;
  const botSites  = isMaxilla ? lSites : bSites;
  const topLabels = isMaxilla ? bLabels : lLabels;
  const botLabels = isMaxilla ? lLabels : bLabels;
  const topSectionLabel = isMaxilla ? 'Buccal' : 'Lingual';
  const botSectionLabel = isMaxilla ? 'Lingual' : 'Buccal';

  const mobility   = tooth?.mobility   || 0;
  const furcation  = tooth?.furcation  || 0;

  const toothStatusClass = isMissing ? 'missing' : '';
  const selectedClass    = isSelected ? 'selected' : '';

  return `
    <div class="tooth-col ${toothStatusClass} ${selectedClass}" onclick="selectTooth(${toothNum})" title="Tooth #${toothNum}">
      <!-- TOOTH NUMBER -->
      <div class="tooth-num-cell h-tooth-num">${toothNum}</div>

      <!-- TOP SECTION LABEL -->
      <div class="section-label-cell h-section-label">
        <span class="section-label-text ${isMaxilla ? 'buccal-section-label' : 'lingual-section-label'}">${topSectionLabel.toUpperCase()}</span>
      </div>

      <!-- SITE LABELS (D B M / M B D) -->
      <div class="sites-header-cell h-site-label">
        ${topLabels.map(l => `<span class="site-label-text ${isMaxilla ? 'buccal-label' : 'lingual-label'}">${l}</span>`).join('')}
      </div>

      <!-- TOP BOP -->
      <div class="sites-row h-bop">
        ${topSites.map(s => `<span class="site-val-wrap">${bopDotHTML(s.bop)}</span>`).join('')}
      </div>

      <!-- TOP CAL / View metric -->
      <div class="sites-row h-cal">
        ${topSites.map(s => `<span class="site-val-wrap">${pdValHTML(s.cal, view, s)}</span>`).join('')}
      </div>

      <!-- TOP GM -->
      <div class="sites-row h-gm">
        ${topSites.map(s => `<span class="site-val-wrap">${gmValHTML(s.gm)}</span>`).join('')}
      </div>

      <!-- TOP PD -->
      <div class="sites-row h-pd">
        ${topSites.map(s => `<span class="site-val-wrap">${pdNumHTML(s.pd)}</span>`).join('')}
      </div>

      <!-- TOOTH ICON -->
      <div class="tooth-icon-cell h-tooth">
        ${toothSVG(tooth?.status || 'Missing', mp, furcation, mobility, isSelected)}
      </div>

      <!-- BOTTOM PD -->
      <div class="sites-row h-pd">
        ${botSites.map(s => `<span class="site-val-wrap">${pdNumHTML(s.pd)}</span>`).join('')}
      </div>

      <!-- BOTTOM GM -->
      <div class="sites-row h-gm">
        ${botSites.map(s => `<span class="site-val-wrap">${gmValHTML(s.gm)}</span>`).join('')}
      </div>

      <!-- BOTTOM CAL / View metric -->
      <div class="sites-row h-cal">
        ${botSites.map(s => `<span class="site-val-wrap">${pdValHTML(s.cal, view, s)}</span>`).join('')}
      </div>

      <!-- BOTTOM BOP -->
      <div class="sites-row h-bop">
        ${botSites.map(s => `<span class="site-val-wrap">${bopDotHTML(s.bop)}</span>`).join('')}
      </div>

      <!-- BOTTOM SECTION LABEL -->
      <div class="section-label-cell h-section-label">
        <span class="section-label-text ${isMaxilla ? 'lingual-section-label' : 'buccal-section-label'}">${botSectionLabel.toUpperCase()}</span>
      </div>
    </div>
  `;
}

// ── Render the Row Label Column ───────────────────────────────────
function renderRowLabels(isMaxilla) {
  const topLabel = isMaxilla ? 'Buccal / Facial' : 'Lingual / Palatal';
  const botLabel = isMaxilla ? 'Lingual / Palatal' : 'Buccal / Facial';

  return `
    <div class="row-labels-col">
      <!-- tooth number -->
      <div class="row-label-cell h-tooth-num"></div>
      <!-- top section label -->
      <div class="row-label-cell h-section-label">
        <span class="row-label-main ${isMaxilla ? 'buccal-text' : 'lingual-text'}">${topLabel}</span>
        <span class="row-label-sub">6-SITE PROTOCOL</span>
      </div>
      <!-- site labels -->
      <div class="row-label-cell h-site-label"></div>
      <!-- BOP -->
      <div class="row-label-cell h-bop">
        <span class="row-label-main">Bleeding (BOP)</span>
      </div>
      <!-- CAL -->
      <div class="row-label-cell h-cal">
        <span class="row-label-main">CAL</span>
        <span class="row-label-sub">PD + GM</span>
      </div>
      <!-- GM -->
      <div class="row-label-cell h-gm">
        <span class="row-label-main">Gingival</span>
        <span class="row-label-sub">Margin (MM)</span>
      </div>
      <!-- PD top -->
      <div class="row-label-cell h-pd">
        <span class="row-label-main">Pocket Depth</span>
        <span class="row-label-sub">MM</span>
      </div>
      <!-- tooth -->
      <div class="row-label-cell h-tooth" style="justify-content:center;">
        <span class="row-label-main" style="font-size:9px;letter-spacing:1px;">TOOTH</span>
      </div>
      <!-- PD bottom -->
      <div class="row-label-cell h-pd">
        <span class="row-label-main">Pocket Depth</span>
        <span class="row-label-sub">MM</span>
      </div>
      <!-- GM bottom -->
      <div class="row-label-cell h-gm">
        <span class="row-label-main">Gingival</span>
        <span class="row-label-sub">Margin (MM)</span>
      </div>
      <!-- CAL bottom -->
      <div class="row-label-cell h-cal">
        <span class="row-label-main">CAL</span>
        <span class="row-label-sub">PD + GM</span>
      </div>
      <!-- BOP bottom -->
      <div class="row-label-cell h-bop">
        <span class="row-label-main">Bleeding (BOP)</span>
      </div>
      <!-- bottom section label -->
      <div class="row-label-cell h-section-label">
        <span class="row-label-main ${isMaxilla ? 'lingual-text' : 'buccal-text'}">${botLabel}</span>
        <span class="row-label-sub">6-SITE PROTOCOL</span>
      </div>
    </div>
  `;
}

// ── Render Jaw Section ────────────────────────────────────────────
function renderJaw(teethOrder, teethMap, isMaxilla, label) {
  const direction = isMaxilla ? 'PATIENT RIGHT → LEFT' : 'PATIENT RIGHT → LEFT';
  const html = `
    <div class="chart-jaw-section fade-in">
      <div class="jaw-header">
        <span class="jaw-label">${label}</span>
        <span class="jaw-direction">${direction}</span>
      </div>
      <div class="chart-scroll-area">
        <div class="chart-grid-wrap">
          ${renderRowLabels(isMaxilla)}
          <div class="teeth-cols">
            ${teethOrder.map(tn => renderToothColumn(tn, teethMap, isMaxilla)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  return html;
}

// ── Render Selected Tooth Detail Bar ──────────────────────────────
function renderToothDetail(teethMap) {
  const tooth = teethMap[state.selectedTooth];
  if (!tooth) return '';

  const mp = maxPD(tooth);
  const bopCount  = ['bop_db','bop_b','bop_mb','bop_dl','bop_l','bop_ml'].filter(k => tooth[k]).length;
  const plagCount = ['plaque_db','plaque_b','plaque_mb','plaque_dl','plaque_l','plaque_ml'].filter(k => tooth[k]).length;
  const pusCount  = ['pus_db','pus_b','pus_mb','pus_dl','pus_l','pus_ml'].filter(k => tooth[k]).length;

  const mobBtns = [0,1,2,3].map(v =>
    `<button class="site-ctrl-btn ${tooth.mobility===v?'active-ctrl':''}" onclick="event.stopPropagation(); showToast('Mobility update: coming soon')">${v}</button>`
  ).join('');
  const furcBtns = [0,1,2,3].map(v =>
    `<button class="site-ctrl-btn ${tooth.furcation===v?'active-ctrl':''}" onclick="event.stopPropagation(); showToast('Furcation update: coming soon')">${v}</button>`
  ).join('');

  return `
    <div class="selected-tooth-detail">
      <div>
        <div class="selected-detail-label">SELECTED</div>
        <div class="selected-tooth-num">#${state.selectedTooth}</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">MAX PD</div>
        <div class="selected-detail-value ${mp>=6?'red':mp>=4?'amber':''}">${mp} mm</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">RECESSION</div>
        <div class="selected-detail-value">${tooth.gm_b || 0} mm</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">MAX CAL</div>
        <div class="selected-detail-value ${mp>=6?'red':mp>=4?'amber':''}">${tooth.cal_b || 0} mm</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">BOP</div>
        <div class="selected-detail-value ${bopCount>0?'red':''}">${bopCount}/6</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">PLAQUE</div>
        <div class="selected-detail-value">${plagCount}/6</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">PUS</div>
        <div class="selected-detail-value ${pusCount>0?'red':''}">${pusCount}/6</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">Mobility (Miller)</div>
        <div class="site-control-btns">${mobBtns}</div>
      </div>
      <div class="selected-detail-group">
        <div class="selected-detail-label">Furcation (Glickman)</div>
        <div class="site-control-btns">${furcBtns}</div>
      </div>
      <div class="selected-detail-group" style="margin-left:auto">
        <div class="selected-detail-label">STATUS</div>
        <div style="display:flex;gap:6px;margin-top:4px;">
          ${['Missing','Implant','Crown'].map(s =>
            `<button class="site-ctrl-btn ${tooth.status===s?'active-ctrl':''}" onclick="event.stopPropagation(); showToast('Status update: coming soon')" style="width:auto;padding:0 8px;font-size:10px;">${s}</button>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Full Perio Chart Render ───────────────────────────────────────
function renderPerioChart(chartData, stats) {
  const teethMap = getTeethMap(chartData.chart);
  const chartId  = chartData.chart.id;
  const status   = chartData.chart.status;

  const html = `
    <!-- Toolbar -->
    <div class="chart-toolbar">
      <div class="chart-title-area">
        <div class="chart-title">Full Mouth Periodontal Chart</div>
        <div class="chart-subtitle">
          <span>FDI / ISO 3950 notation</span>
          <span>·</span>
          <span>6 sites per tooth (DB·B·MB / DL·L·ML)</span>
          <span>·</span>
          <span>Tab moves 0–9 enters depth · Click to toggle BOP</span>
        </div>
      </div>
      <div class="chart-toolbar-right">
        <div class="tooth-selector">
          Tooth <strong>#${state.selectedTooth}</strong>
          <span class="tooth-status-badge healthy">
            ${teethMap[state.selectedTooth]?.status === 'Missing' ? '✕ Missing' :
              teethMap[state.selectedTooth]?.status === 'Implant' ? '⚙ Implant' :
              teethMap[state.selectedTooth]?.status === 'Crown'   ? '♛ Crown' :
              '♥ Healthy'}
          </span>
        </div>
        <button class="toggle-btn" onclick="showToast('Clear all data: confirmation required')">✕ Clear</button>
        <button class="toggle-btn" onclick="showToast('Mark as Missing: click a tooth first')">✕ Missing</button>
        <button class="toggle-btn active-toggle" id="quickmode-btn" onclick="toggleQuickMode()">⚡ Quick mode</button>
      </div>
    </div>

    <!-- View Toggles -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <!-- Legend -->
      <div class="chart-legend">
        <div class="legend-item"><div class="legend-dot healthy"></div> 1–3 mm (Healthy)</div>
        <div class="legend-item"><div class="legend-dot initial"></div> 4–5 mm (Initial)</div>
        <div class="legend-item"><div class="legend-dot severe"></div> ≥6 mm (Severe)</div>
        <div class="legend-item"><div class="legend-dot bop"></div> BOP</div>
        <div class="legend-item"><div class="legend-dot plaque"></div> Plaque</div>
        <div class="legend-item"><div class="legend-dot pus"></div> Pus</div>
      </div>
      <div class="view-toggles">
        <button class="toggle-btn ${state.activeView==='CAL'?'active-toggle':''}" onclick="setView('CAL')">📐 CAL</button>
        <button class="toggle-btn ${state.activeView==='Plaque'?'active-toggle':''}" onclick="setView('Plaque')">🔵 Plaque</button>
        <button class="toggle-btn ${state.activeView==='Suppuration'?'active-toggle':''}" onclick="setView('Suppuration')">🔴 Suppuration</button>
      </div>
    </div>

    <!-- Maxilla (Upper) -->
    ${renderJaw(MAXILLA_TEETH, teethMap, true, 'Maxilla (Upper)')}

    <!-- Occlusal Midline -->
    <div class="midline-bar">— — — OCCLUSAL MIDLINE — — —</div>

    <!-- Mandible (Lower) -->
    ${renderJaw(MANDIBLE_TEETH, teethMap, false, 'Mandible (Lower)')}

    <!-- Selected Tooth Detail -->
    <div id="tooth-detail-bar">
      ${renderToothDetail(teethMap)}
    </div>
  `;

  $('perio-chart-container').innerHTML = html;
}

// ── Tooth Selection ───────────────────────────────────────────────
function selectTooth(toothNum) {
  state.selectedTooth = toothNum;
  if (state.chartData && state.stats) {
    renderPerioChart(state.chartData, state.stats);
  }
}

// ── View Toggle ───────────────────────────────────────────────────
function setView(view) {
  state.activeView = view;
  if (state.chartData && state.stats) {
    renderPerioChart(state.chartData, state.stats);
  }
}

function toggleQuickMode() {
  showToast('Quick mode: Tab key to jump between sites, 0-9 to enter depth');
}

// ── Render Visualization ──────────────────────────────────────────
function renderVisualization(stats, teethMap) {
  // Collect pocket depth distribution
  const allPDs = [];
  Object.values(teethMap).forEach(t => {
    if (t.status === 'Missing') return;
    ['pd_db','pd_b','pd_mb','pd_dl','pd_l','pd_ml'].forEach(k => {
      if (t[k]) allPDs.push(t[k]);
    });
  });

  const dist = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0};
  allPDs.forEach(pd => { if (dist[pd] !== undefined) dist[pd]++; });

  const maxCount = Math.max(...Object.values(dist));
  const barRows = Object.entries(dist).map(([mm, count]) => {
    const pct = maxCount > 0 ? (count / maxCount * 100) : 0;
    const color = mm <= 3 ? 'var(--healthy)' : mm <= 5 ? 'var(--initial)' : 'var(--severe)';
    return `<div class="bar-row">
      <span class="bar-label">${mm} mm</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${color};"></div></div>
      <span class="bar-val">${count}</span>
    </div>`;
  }).join('');

  // BOP Donut values
  const totalSites = allPDs.length;
  const bopCount   = stats.bleeding_sites_count;
  const nonBopCount = totalSites - bopCount;
  const bopAngle   = totalSites > 0 ? (bopCount / totalSites) * 340 : 0;
  const r = 46; cx = 60; cy = 60;
  const circumference = 2 * Math.PI * r;
  const bopDash   = (bopAngle / 360) * circumference;
  const noBopDash = circumference - bopDash;

  // Severity distribution (healthy / initial / severe teeth count)
  const teethArr = Object.values(teethMap).filter(t => t.status !== 'Missing');
  let sev_h = 0, sev_i = 0, sev_s = 0;
  teethArr.forEach(t => {
    const mp = maxPD(t);
    if (mp >= 6) sev_s++;
    else if (mp >= 4) sev_i++;
    else sev_h++;
  });
  const sevTotal = sev_h + sev_i + sev_s;

  $('viz-container').innerHTML = `
    <!-- Pocket Depth Distribution -->
    <div class="viz-card fade-in">
      <div class="viz-card-title">📊 Pocket Depth Distribution</div>
      <div class="bar-chart">${barRows}</div>
    </div>

    <!-- BOP Donut -->
    <div class="viz-card fade-in" style="animation-delay:100ms">
      <div class="viz-card-title">🩸 Bleeding on Probing (BOP)</div>
      <div class="donut-wrap">
        <div class="donut-chart">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <!-- bg track -->
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(0,0,0,0.03)" stroke-width="14"/>
            <!-- non-bleeding arc (gray) -->
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="14"
              stroke-dasharray="${noBopDash} ${circumference}" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <!-- bleeding arc (red) -->
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="#cf222e" stroke-width="14"
              stroke-dasharray="${bopDash} ${circumference}" stroke-dashoffset="${-noBopDash}" stroke-linecap="round"
              transform="rotate(-90 60 60)" style="filter:drop-shadow(0 0 4px rgba(207,34,46,0.25))"/>
          </svg>
          <div class="donut-center">
            <span class="donut-center-val" style="color:#cf222e">${stats.bleeding_sites_percentage}%</span>
            <span class="donut-center-label">BOP</span>
          </div>
        </div>
        <div class="donut-legend">
          <div class="donut-legend-item">
            <div class="donut-legend-color" style="background:#cf222e"></div>
            <span class="donut-legend-label">Bleeding</span>
            <span class="donut-legend-val">${bopCount} sites</span>
          </div>
          <div class="donut-legend-item">
            <div class="donut-legend-color" style="background:rgba(0,0,0,0.08)"></div>
            <span class="donut-legend-label">No Bleeding</span>
            <span class="donut-legend-val">${nonBopCount} sites</span>
          </div>
          <div class="donut-legend-item" style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border-subtle)">
            <div class="donut-legend-color" style="background:var(--initial)"></div>
            <span class="donut-legend-label">Target BOP</span>
            <span class="donut-legend-val">≤ 10%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Teeth Severity -->
    <div class="viz-card fade-in" style="animation-delay:150ms">
      <div class="viz-card-title">🦷 Teeth Severity Distribution</div>
      <div class="donut-wrap">
        <div class="donut-chart" style="width:120px;height:120px;">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(0,0,0,0.03)" stroke-width="14"/>
            ${buildSeverityArcs(sev_h, sev_i, sev_s, sevTotal)}
          </svg>
          <div class="donut-center">
            <span class="donut-center-val">${sevTotal}</span>
            <span class="donut-center-label">Active</span>
          </div>
        </div>
        <div class="donut-legend">
          <div class="donut-legend-item">
            <div class="donut-legend-color" style="background:var(--healthy)"></div>
            <span class="donut-legend-label">Healthy (≤3mm)</span>
            <span class="donut-legend-val">${sev_h}</span>
          </div>
          <div class="donut-legend-item">
            <div class="donut-legend-color" style="background:var(--initial)"></div>
            <span class="donut-legend-label">Initial (4-5mm)</span>
            <span class="donut-legend-val">${sev_i}</span>
          </div>
          <div class="donut-legend-item">
            <div class="donut-legend-color" style="background:var(--severe)"></div>
            <span class="donut-legend-label">Severe (≥6mm)</span>
            <span class="donut-legend-val">${sev_s}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Key Metrics Summary -->
    <div class="viz-card fade-in" style="animation-delay:200ms">
      <div class="viz-card-title">📈 Clinical Summary</div>
      <div class="bar-chart">
        <div class="bar-row">
          <span class="bar-label" style="width:110px">Avg PD</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(stats.avg_pocket_depth/10*100,100)}%;background:var(--initial)"></div></div>
          <span class="bar-val">${stats.avg_pocket_depth}mm</span>
        </div>
        <div class="bar-row">
          <span class="bar-label" style="width:110px">Deep Pockets</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(stats.deep_pockets_count/60*100,100)}%;background:var(--severe)"></div></div>
          <span class="bar-val">${stats.deep_pockets_count}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label" style="width:110px">BOP Sites</span>
          <div class="bar-track"><div class="bar-fill" style="width:${stats.bleeding_sites_percentage}%;background:#cf222e"></div></div>
          <span class="bar-val">${stats.bleeding_sites_percentage}%</span>
        </div>
        <div class="bar-row">
          <span class="bar-label" style="width:110px">Mobility</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(stats.mobility_cases_count/32*100,100)}%;background:var(--accent-purple)"></div></div>
          <span class="bar-val">${stats.mobility_cases_count} teeth</span>
        </div>
        <div class="bar-row">
          <span class="bar-label" style="width:110px">Furcation</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(stats.furcation_cases_count/32*100,100)}%;background:#818cf8"></div></div>
          <span class="bar-val">${stats.furcation_cases_count} teeth</span>
        </div>
      </div>
    </div>
  `;
}

function buildSeverityArcs(h, i, s, total) {
  if (total === 0) return '';
  const r = 46; const circ = 2 * Math.PI * r;
  const hPct = h / total; const iPct = i / total; const sPct = s / total;
  const hDash = hPct * circ; const iDash = iPct * circ; const sDash = sPct * circ;
  return `
    <circle cx="60" cy="60" r="46" fill="none" stroke="#1a7f37" stroke-width="14"
      stroke-dasharray="${hDash} ${circ}" stroke-dashoffset="${0}" stroke-linecap="round"
      transform="rotate(-90 60 60)"/>
    <circle cx="60" cy="60" r="46" fill="none" stroke="#bf8700" stroke-width="14"
      stroke-dasharray="${iDash} ${circ}" stroke-dashoffset="${-hDash}" stroke-linecap="round"
      transform="rotate(-90 60 60)"/>
    <circle cx="60" cy="60" r="46" fill="none" stroke="#cf222e" stroke-width="14"
      stroke-dasharray="${sDash} ${circ}" stroke-dashoffset="${-(hDash + iDash)}" stroke-linecap="round"
      transform="rotate(-90 60 60)" style="filter:drop-shadow(0 0 4px rgba(207,34,46,0.2))"/>
  `;
}

// ── Render AI Analysis ────────────────────────────────────────────
function renderAIAnalysis(ai) {
  const severityClass = ai.severity_level.toLowerCase();
  const riskClass = ai.risk_assessment.startsWith('HIGH') ? 'high' : ai.risk_assessment.startsWith('MODERATE') ? 'medium' : 'low';

  // Update AI badge
  const badge = $('ai-risk-badge');
  if (badge) {
    badge.textContent = ai.severity_level;
    badge.className = `badge-ai ${severityClass === 'severe' ? 'badge-high' : severityClass === 'moderate' ? 'badge-moderate' : 'badge-low'}`;
  }

  $('ai-container').innerHTML = `
    <!-- AI Header -->
    <div class="ai-header fade-in">
      <div class="ai-icon">🤖</div>
      <div class="ai-header-text">
        <div class="ai-header-title">Periodontal AI Diagnostic Analysis</div>
        <div class="ai-header-sub">Generated at ${new Date(ai.analysis_timestamp).toLocaleString()} · Based on full-mouth periodontal chart</div>
      </div>
      <span class="severity-badge ${severityClass}">${ai.severity_level} Risk</span>
    </div>

    <!-- AI Grid -->
    <div class="ai-grid">
      <!-- Diagnosis Summary -->
      <div class="ai-card fade-in" style="animation-delay:100ms">
        <div class="ai-card-title">🔬 Diagnosis Summary</div>
        <div class="ai-card-body">${ai.diagnosis_summary}</div>
      </div>

      <!-- Risk Assessment -->
      <div class="ai-card fade-in" style="animation-delay:150ms">
        <div class="ai-card-title">⚠️ Risk Assessment</div>
        <div class="ai-risk-level ${riskClass}" style="margin-bottom:8px">${ai.risk_assessment.split('.')[0]}</div>
        <div class="ai-card-body">${ai.risk_assessment.split('.').slice(1).join('.')}</div>
      </div>

      <!-- Key Findings -->
      <div class="ai-card fade-in" style="animation-delay:200ms">
        <div class="ai-card-title">📋 Key Clinical Findings</div>
        ${ai.key_findings.map(f => `
          <div class="ai-finding-item">
            <span class="ai-finding-bullet">▸</span>
            <span>${f}</span>
          </div>
        `).join('')}
      </div>

      <!-- Treatment Plan -->
      <div class="ai-card fade-in" style="animation-delay:250ms">
        <div class="ai-card-title">💊 Recommended Treatment Plan</div>
        ${ai.recommended_treatment_plan.map((t, i) => `
          <div class="ai-treatment-item">
            <span class="ai-treatment-num">${i + 1}</span>
            <span>${t}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="margin-top:12px; padding:12px 16px; background:rgba(0,0,0,0.02); border:1px solid rgba(0,0,0,0.08); border-radius:10px; font-size:11px; color:var(--text-muted);">
      ⚠️ This AI analysis is generated from clinical measurement data and is intended as a clinical decision support tool. Always verify findings with direct clinical examination. FHIR R4 + ABDM Compliant · Lumen Dental EMR
    </div>
  `;
}

// ── Module Switching ────────────────────────────────────────────
function switchModule(module) {
  state.currentModule = module;
  
  // Update nav buttons
  document.querySelectorAll('.nav-link').forEach((btn, idx) => {
    const modules = ['patients', 'schedule', 'charting', 'imaging', 'reports'];
    btn.classList.toggle('active', modules[idx] === module);
  });
  
  // Update module views
  const modules = ['patients', 'schedule', 'charting', 'imaging', 'reports'];
  modules.forEach(m => {
    const el = $(`module-${m}`);
    if (el) el.classList.toggle('active', m === module);
  });
  
  // Load data on demand
  if (module === 'patients' && state.patients.length === 0) {
    loadPatients();
  }
  if (module === 'schedule' && state.appointments.length === 0) {
    loadAppointments();
  }
  if (module === 'imaging' && state.imagingRecords.length === 0) {
    loadImagingRecords();
  }
  if (module === 'reports' && state.clinicalReports.length === 0) {
    loadClinicalReports();
  }
}

// ── Tab Switching (for charting module) ────────────────────────────
function switchTab(tab) {
  state.activeTab = tab;
  const tabs = ['perio','viz','ai'];
  tabs.forEach(t => {
    $(`tab-btn-${t}`)?.classList.toggle('active', t === tab);
    $(`content-${t}`)?.classList.toggle('active', t === tab);
  });

  // Load viz / AI on demand
  if (tab === 'viz' && state.chartData && state.stats) {
    const teethMap = getTeethMap(state.chartData.chart);
    renderVisualization(state.stats, teethMap);
  }
  if (tab === 'ai' && !state.aiData && state.chartData) {
    loadAIAnalysis(state.chartData.chart.id);
  }
}

async function loadAIAnalysis(chartId) {
  try {
    const ai = await fetchAIAnalysis(chartId);
    state.aiData = ai;
    renderAIAnalysis(ai);
  } catch (e) {
    $('ai-container').innerHTML = `<div class="error-state">⚠️ Could not run AI analysis: ${e.message}</div>`;
  }
}

// ── Module Data Loading ────────────────────────────────────────────
async function loadPatients() {
  try {
    state.patients = await fetchAllPatients();
    renderPatients();
  } catch (e) {
    $('patients-list').innerHTML = `<div class="error-state">⚠️ Could not load patients: ${e.message}</div>`;
  }
}

function renderPatients() {
  if (state.patients.length === 0) {
    $('patients-list').innerHTML = `<div class="empty-state">
      <div style="font-size:24px;margin-bottom:8px">👥</div>
      <div>No patients found</div>
    </div>`;
    return;
  }
  
  $('patients-list').innerHTML = `<div class="list-items">
    ${state.patients.map(p => `
      <div class="list-item patient-item" onclick="selectPatient(${p.id})">
        <div class="item-header">
          <span class="patient-name-short">${p.name}</span>
          <span class="status-badge ${p.status === 'Active' ? 'active' : 'inactive'}">${p.status}</span>
        </div>
        <div class="item-meta">
          <span>${p.patient_id}</span>
          <span>${p.age} yrs · ${p.gender}</span>
          <span>${p.primary_doctor}</span>
        </div>
      </div>
    `).join('')}
  </div>`;
}

async function loadAppointments() {
  try {
    state.appointments = await fetchPatientAppointments(state.currentPatientId);
    renderAppointments();
  } catch (e) {
    $('appointments-list').innerHTML = `<div class="error-state">⚠️ Could not load appointments: ${e.message}</div>`;
  }
}

function renderAppointments() {
  if (state.appointments.length === 0) {
    $('appointments-list').innerHTML = `<div class="empty-state">
      <div style="font-size:24px;margin-bottom:8px">📅</div>
      <div>No appointments scheduled</div>
    </div>`;
    return;
  }
  
  $('appointments-list').innerHTML = `<div class="list-items">
    ${state.appointments.map(a => `
      <div class="list-item appointment-item">
        <div class="item-header">
          <span class="appointment-type">${a.appointment_type}</span>
          <span class="status-badge ${a.status === 'Completed' ? 'active' : a.status === 'Cancelled' ? 'inactive' : ''}">${a.status}</span>
        </div>
        <div class="item-meta">
          <span>📅 ${new Date(a.appointment_date).toLocaleString()}</span>
          <span>👨‍⚕️ ${a.dentist_name}</span>
          <span>⏱️ ${a.duration_minutes} mins</span>
        </div>
        ${a.notes ? `<div class="item-notes">${a.notes}</div>` : ''}
      </div>
    `).join('')}
  </div>`;
}

async function loadImagingRecords() {
  try {
    state.imagingRecords = await fetchPatientImagingRecords(state.currentPatientId);
    renderImagingRecords();
  } catch (e) {
    $('imaging-list').innerHTML = `<div class="error-state">⚠️ Could not load imaging records: ${e.message}</div>`;
  }
}

function renderImagingRecords() {
  if (state.imagingRecords.length === 0) {
    $('imaging-list').innerHTML = `<div class="empty-state">
      <div style="font-size:24px;margin-bottom:8px">📸</div>
      <div>No imaging records available</div>
    </div>`;
    return;
  }
  
  $('imaging-list').innerHTML = `<div class="list-items">
    ${state.imagingRecords.map(img => `
      <div class="list-item imaging-item">
        <div class="item-header">
          <span class="imaging-type">${img.imaging_type}</span>
          <span class="date-badge">${new Date(img.date_taken).toLocaleDateString()}</span>
        </div>
        <div class="item-meta">
          ${img.tooth_numbers ? `<span>🦷 Teeth: ${img.tooth_numbers}</span>` : ''}
          ${img.findings ? `<span>Findings: ${img.findings}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

async function loadClinicalReports() {
  try {
    state.clinicalReports = await fetchPatientReports(state.currentPatientId);
    renderClinicalReports();
  } catch (e) {
    $('reports-list').innerHTML = `<div class="error-state">⚠️ Could not load reports: ${e.message}</div>`;
  }
}

function renderClinicalReports() {
  if (state.clinicalReports.length === 0) {
    $('reports-list').innerHTML = `<div class="empty-state">
      <div style="font-size:24px;margin-bottom:8px">📋</div>
      <div>No reports available</div>
    </div>`;
    return;
  }
  
  $('reports-list').innerHTML = `<div class="list-items">
    ${state.clinicalReports.map(r => `
      <div class="list-item report-item">
        <div class="item-header">
          <span class="report-type">${r.report_type}</span>
          <span class="status-badge ${r.status === 'Approved' || r.status === 'Signed' ? 'active' : 'inactive'}">${r.status}</span>
        </div>
        <div class="item-meta">
          <span>👨‍⚕️ ${r.generated_by}</span>
          <span>📅 ${new Date(r.generated_date).toLocaleDateString()}</span>
          ${r.summary ? `<span>${r.summary.substring(0, 50)}...</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── Form Handlers ────────────────────────────────────────────────
function openPatientForm() {
  showToast('Patient form coming soon!');
}

function openAppointmentForm() {
  showToast('Appointment form coming soon!');
}

function openImagingForm() {
  showToast('Imaging upload form coming soon!');
}

function openReportForm() {
  showToast('Report generation form coming soon!');
}

async function selectPatient(patientId) {
  try {
    state.currentPatientId = patientId;
    showToast(`Loading patient details...`);
    
    // Clear old patient-specific data to trigger reload
    state.appointments = [];
    state.imagingRecords = [];
    state.clinicalReports = [];
    state.aiData = null; // Clear AI data to force re-fetch
    
    // Load patient and chart data
    const [patient, chartStats] = await Promise.all([
      fetchPatient(patientId),
      fetchLatestChart(patientId),
    ]);
    
    state.patient = patient;
    state.chartData = chartStats;
    state.stats = chartStats.stats;
    
    renderPatientHeader(patient);
    renderStats(chartStats.stats);
    renderPerioChart(chartStats, chartStats.stats);
    
    // Switch to charting module
    switchModule('charting');
    showToast(`Active patient: ${patient.name}`);
  } catch (e) {
    console.error('Error selecting patient:', e);
    showToast(`⚠️ Error loading patient: ${e.message}`);
  }
}

// ── Tab Switching (for charting module) ────────────────────────

// ── App Initialization ────────────────────────────────────────────
async function init() {
  try {
    // Load patient and chart data in parallel
    const [patient, chartStats] = await Promise.all([
      fetchPatient(state.currentPatientId),
      fetchLatestChart(state.currentPatientId),
    ]);

    state.patient   = patient;
    state.chartData = chartStats;
    state.stats     = chartStats.stats;

    renderPatientHeader(patient);
    renderStats(chartStats.stats);
    renderPerioChart(chartStats, chartStats.stats);

    // Pre-load AI in background
    loadAIAnalysis(chartStats.chart.id).then(() => {
      // Update AI risk badge
    });

    showToast('✅ Periodontal chart loaded successfully');

  } catch (e) {
    console.error('Init error:', e);
    $('patient-header').innerHTML = `
      <div class="error-state" style="flex:1">
        ⚠️ Could not connect to backend at ${API_BASE}. Make sure the server is running: <code>python run.py</code>
        <br><br>
        <button class="btn btn-primary" onclick="init()" style="display:inline-flex;margin-top:12px">🔄 Retry</button>
      </div>`;
    $('stats-grid').innerHTML = '';
  }
}

function togglePatientForm() {
    const form = document.getElementById('patient-form-container');
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

async function handlePatientSubmit(event) {
    event.preventDefault();
    
    // Quick payload mapping to your backend SQLAlchemy fields
    const payload = {
        name: document.getElementById('patient-name').value,
        age: parseInt(document.getElementById('patient-age').value),
        gender: document.getElementById('patient-gender').value,
        primary_doctor: document.getElementById('patient-doctor').value,
        status: "Active"
    };

    try {
        const response = await fetch(`${API_BASE}/patients/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Failed to save patient');
        }
        
        const newPatient = await response.json();
        
        // Refresh patient list & hide form
        await loadPatients();
        togglePatientForm();
        
        // Automatically select and chart for the newly added patient
        await selectPatient(newPatient.id);
        
        // Reset the form
        document.getElementById('add-patient-form').reset();
    } catch (err) {
        console.error("Failed to add patient:", err);
        showToast(`⚠️ Failed to add patient: ${err.message}`);
    }
}

// ── Role Login ───────────────────────────────────────────────────
function loginAs(role) {
  state.userRole = role; // 'dentist' | 'patient'

  const overlay = document.getElementById('login-screen');
  overlay.classList.add('fade-out');

  // After fade-out animation completes, remove overlay and start app
  overlay.addEventListener('animationend', () => {
    overlay.style.display = 'none';

    // Update profile dropdown to reflect the selected role
    updateProfileMenu(role);

    // Patient role: lock to read-only by hiding write controls
    if (role === 'patient') {
      document.querySelectorAll('.btn-primary, .btn-ghost, #quickmode-btn').forEach(el => {
        el.style.opacity = '0.4';
        el.style.pointerEvents = 'none';
      });
    }
    init();
  }, { once: true });
}

// ── Profile Dropdown ─────────────────────────────────────────────
function updateProfileMenu(role) {
  const isDentist = role === 'dentist';
  $('profile-btn-name').textContent  = isDentist ? 'Dr. Mehra' : 'Darsh';
  $('profile-btn-role').textContent  = isDentist ? 'Dentist' : 'Patient';
  $('profile-dropdown-name').textContent = isDentist ? 'Dr. Anita Mehra' : 'Darsh';
  $('profile-dropdown-sub').textContent  = isDentist ? 'BDS, MDS Prosthodontics' : 'Roll No: 24202C0045';
  $('switch-role-label').textContent = isDentist ? 'Switch to Patient View' : 'Switch to Dentist View';
  // Avatar initials
  $('user-avatar').textContent = isDentist ? 'AM' : 'D';
}

function toggleProfileMenu() {
  const btn      = $('profile-btn');
  const dropdown = $('profile-dropdown');
  const isOpen   = dropdown.classList.contains('open');
  closeProfileMenu();
  if (!isOpen) {
    dropdown.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

function closeProfileMenu() {
  $('profile-dropdown').classList.remove('open');
  $('profile-btn').classList.remove('open');
  $('profile-btn').setAttribute('aria-expanded', 'false');
}

function switchRoleFromMenu() {
  closeProfileMenu();
  const currentRole = state.userRole || 'dentist';
  const nextRole    = currentRole === 'dentist' ? 'patient' : 'dentist';
  state.userRole    = nextRole;
  updateProfileMenu(nextRole);

  // Apply / remove read-only lock
  document.querySelectorAll('.btn-primary, .btn-ghost, #quickmode-btn').forEach(el => {
    el.style.opacity       = nextRole === 'patient' ? '0.4' : '';
    el.style.pointerEvents = nextRole === 'patient' ? 'none' : '';
  });

  showToast(`Switched to ${nextRole === 'dentist' ? 'Dentist' : 'Patient'} View`);
}

function signOut() {
  closeProfileMenu();
  // Reset state
  state.userRole = null;
  // Show login overlay again
  const overlay = $('login-screen');
  overlay.style.display = '';
  overlay.classList.remove('fade-out');
  // Restore any read-only locks removed
  document.querySelectorAll('.btn-primary, .btn-ghost, #quickmode-btn').forEach(el => {
    el.style.opacity = '';
    el.style.pointerEvents = '';
  });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrap = $('profile-menu-wrap');
  if (wrap && !wrap.contains(e.target)) {
    closeProfileMenu();
  }
});

// Start the app (called after role selection)
