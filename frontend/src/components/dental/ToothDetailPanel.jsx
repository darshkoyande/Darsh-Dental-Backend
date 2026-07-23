import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useRole } from '../../context/RoleContext';
import {
  X, Clock, Stethoscope, FileImage, Camera, ChevronRight,
  CheckCircle2, Circle, Calendar, User, StickyNote,
  ImageIcon, Scan, FolderOpen, Upload, Plus, Loader2,
} from 'lucide-react';

/**
 * ToothDetailPanel — Slide-in side panel with clinical detail for a selected tooth.
 * Enhanced with a tabbed view: Treatment History | Diagnostic Attachments
 *
 * The Diagnostic Attachments tab now renders inline dummy radiograph previews
 * and supports uploading images from the local filesystem via FileReader().
 */

/* ── Mock Clinical Data per Tooth ────────────── */
const TOOTH_CLINICAL_DATA = {
  16: {
    lastUpdated: '12-Jan-2026',
    status: 'Treated',
    history: [
      {
        date: '10-Jan-2025',
        procedure: 'Dental Filling',
        dentist: 'Dr. Smith',
        notes: 'Composite filling for occlusal caries.',
        status: 'completed',
      },
      {
        date: '15-Feb-2025',
        procedure: 'Root Canal Treatment',
        dentist: 'Dr. Smith',
        notes: 'Three canals treated successfully.',
        status: 'completed',
      },
      {
        date: '05-Mar-2025',
        procedure: 'Crown Placement',
        dentist: 'Dr. Smith',
        notes: 'Material: Zirconia Crown. Status: Completed.',
        status: 'completed',
      },
    ],
    attachments: [
      { label: 'Pre-treatment X-Ray', type: 'xray', date: '10-Jan-2025', size: '2.4 MB' },
      { label: 'Post-treatment X-Ray', type: 'xray', date: '05-Mar-2025', size: '1.8 MB' },
      { label: 'Clinical Intraoral Photos', type: 'photo', date: '05-Mar-2025', size: '5.2 MB' },
    ],
  },
  3: {
    lastUpdated: '28-Nov-2025',
    status: 'Treated',
    history: [
      { date: '05-Sep-2025', procedure: 'Dental Cleaning', dentist: 'Dr. Mehra', notes: 'Full scaling and polishing completed.', status: 'completed' },
      { date: '28-Nov-2025', procedure: 'Crown Assessment', dentist: 'Dr. Mehra', notes: 'Crown integrity verified. Minor adjustment needed.', status: 'completed' },
    ],
    attachments: [
      { label: 'Pre-treatment X-Ray', type: 'xray', date: '05-Sep-2025', size: '2.1 MB' },
      { label: 'Clinical Intraoral Photos', type: 'photo', date: '28-Nov-2025', size: '3.6 MB' },
    ],
  },
  14: {
    lastUpdated: '20-Dec-2025',
    status: 'Cavity',
    history: [
      { date: '20-Dec-2025', procedure: 'Cavity Assessment', dentist: 'Dr. Kapoor', notes: 'Occlusal caries detected. Filling recommended.', status: 'in-progress' },
    ],
    attachments: [
      { label: 'Pre-treatment X-Ray', type: 'xray', date: '20-Dec-2025', size: '1.9 MB' },
    ],
  },
};

function getDefaultData(toothNumber, status) {
  return {
    lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status,
    history: [],
    attachments: [],
  };
}

function getStatusStyle(status) {
  switch (status) {
    case 'Treated':  return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Cavity':   return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Missing':  return 'bg-slate-50 text-slate-500 border-slate-200';
    default:         return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

function getTimelineColor(status) {
  switch (status) {
    case 'completed':   return { dot: 'bg-emerald-500' };
    case 'in-progress': return { dot: 'bg-amber-500 animate-pulse-soft' };
    default:            return { dot: 'bg-slate-400' };
  }
}

const ATTACHMENT_ICON_MAP = {
  xray: Scan,
  photo: Camera,
};

/* ── Inline SVG Dummy Radiograph ─────────────── */
function DummyRadiograph({ type }) {
  if (type === 'xray') {
    return (
      <svg viewBox="0 0 300 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="xrayBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="xrayGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="300" height="160" fill="url(#xrayBg)" rx="8" />
        <rect width="300" height="160" fill="url(#xrayGlow)" rx="8" />
        {/* Tooth shapes */}
        <g opacity="0.7">
          <rect x="90" y="40" width="16" height="50" rx="4" fill="#cbd5e1" opacity="0.8" />
          <rect x="112" y="35" width="16" height="55" rx="4" fill="#cbd5e1" opacity="0.9" />
          <rect x="134" y="30" width="18" height="60" rx="5" fill="#e2e8f0" opacity="0.95" />
          <rect x="158" y="35" width="16" height="55" rx="4" fill="#cbd5e1" opacity="0.9" />
          <rect x="180" y="40" width="16" height="50" rx="4" fill="#cbd5e1" opacity="0.8" />
          {/* Root shapes */}
          <rect x="92" y="88" width="4" height="28" rx="2" fill="#94a3b8" opacity="0.5" />
          <rect x="100" y="88" width="4" height="25" rx="2" fill="#94a3b8" opacity="0.5" />
          <rect x="114" y="88" width="5" height="30" rx="2" fill="#94a3b8" opacity="0.6" />
          <rect x="121" y="88" width="5" height="27" rx="2" fill="#94a3b8" opacity="0.6" />
          <rect x="137" y="88" width="5" height="35" rx="2" fill="#94a3b8" opacity="0.7" />
          <rect x="145" y="88" width="5" height="32" rx="2" fill="#94a3b8" opacity="0.7" />
          <rect x="161" y="88" width="5" height="30" rx="2" fill="#94a3b8" opacity="0.6" />
          <rect x="168" y="88" width="5" height="27" rx="2" fill="#94a3b8" opacity="0.6" />
          <rect x="183" y="88" width="4" height="28" rx="2" fill="#94a3b8" opacity="0.5" />
          <rect x="190" y="88" width="4" height="25" rx="2" fill="#94a3b8" opacity="0.5" />
        </g>
        {/* Jawline */}
        <path d="M60 135 Q150 100 240 135" stroke="#475569" strokeWidth="2" fill="none" opacity="0.4" />
        {/* Labels */}
        <text x="12" y="20" fill="#64748b" fontSize="9" fontFamily="monospace">DENTAL RADIOGRAPH</text>
        <text x="12" y="150" fill="#475569" fontSize="8" fontFamily="monospace">DICOM Preview</text>
        <text x="220" y="150" fill="#475569" fontSize="8" fontFamily="monospace">300×160</text>
      </svg>
    );
  }

  // Intraoral photo placeholder
  return (
    <svg viewBox="0 0 300 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="photoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#eff6ff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <rect width="300" height="160" fill="url(#photoBg)" rx="8" />
      {/* Camera icon */}
      <g transform="translate(125, 45)" opacity="0.4">
        <rect x="5" y="10" width="50" height="35" rx="6" fill="#6366f1" opacity="0.3" />
        <circle cx="30" cy="27" r="11" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.5" />
        <circle cx="30" cy="27" r="6" fill="#6366f1" opacity="0.2" />
        <rect x="20" y="5" width="20" height="8" rx="3" fill="#6366f1" opacity="0.3" />
      </g>
      <text x="12" y="20" fill="#6366f1" fontSize="9" fontFamily="monospace" opacity="0.5">CLINICAL PHOTO</text>
      <text x="100" y="130" fill="#6366f1" fontSize="10" fontFamily="sans-serif" opacity="0.4" textAnchor="middle">Intraoral View</text>
      <text x="220" y="150" fill="#94a3b8" fontSize="8" fontFamily="monospace">300×160</text>
    </svg>
  );
}

/* ── Saved Image Preview with fallback ───────── */
function DbAttachmentPreview({ img }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="h-40 overflow-hidden rounded-t-xl bg-slate-900 relative">
      {img.dataUrl && !hasError ? (
        <img
          src={img.dataUrl}
          alt={img.label}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <DummyRadiograph type={img.type} />
      )}
      <div className="absolute top-2 right-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold
                       bg-emerald-500 text-white shadow-sm">
          <Upload className="w-2.5 h-2.5" />
          Saved
        </span>
      </div>
    </div>
  );
}

export default function ToothDetailPanel({ toothNumber, label, status, onClose }) {
  // Display label falls back to the FDI tooth number if no label provided
  const displayLabel = label ?? `#${toothNumber}`;
  const clinicalData = TOOTH_CLINICAL_DATA[toothNumber] || getDefaultData(toothNumber, status);
  const [activeTab, setActiveTab] = useState('history');
  
  // Real database attachments
  const { activePatient } = useRole();
  const [dbAttachments, setDbAttachments] = useState([]);
  const [dbAttachmentsLoading, setDbAttachmentsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  const fetchDbAttachments = useCallback(async () => {
    if (!activePatient) return;
    setDbAttachmentsLoading(true);
    try {
      const { data } = await axios.get(`/imaging/patients/${activePatient.id}/records`);
      // Filter records that match this tooth number
      const toothRecords = (data || []).filter(rec => {
        if (!rec.tooth_numbers) return false;
        const teeth = rec.tooth_numbers.split(',').map(s => s.trim());
        return teeth.includes(String(toothNumber));
      }).map(rec => {
        const filename = rec.file_url ? rec.file_url.split(/[/\\]/).pop() : '';
        return {
          id: rec.id,
          label: rec.findings || 'Radiograph / Photo',
          type: rec.imaging_type?.toLowerCase().includes('x-ray') || rec.imaging_type?.toLowerCase().includes('cbct') ? 'xray' : 'photo',
          date: new Date(rec.date_taken).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          size: 'Saved',
          dataUrl: filename ? `/uploads/${filename}` : null,
          isDb: true
        };
      });
      setDbAttachments(toothRecords);
    } catch (err) {
      console.error('Failed to fetch imaging records:', err);
    } finally {
      setDbAttachmentsLoading(false);
    }
  }, [activePatient, toothNumber]);

  useEffect(() => {
    fetchDbAttachments();
  }, [fetchDbAttachments]);

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activePatient) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isImage = file.type.startsWith('image/') || 
                        lowerName.endsWith('.jpg') || 
                        lowerName.endsWith('.jpeg') || 
                        lowerName.endsWith('.png') || 
                        lowerName.endsWith('.webp') || 
                        lowerName.endsWith('.gif') || 
                        lowerName.endsWith('.bmp') || 
                        lowerName.endsWith('.tiff') || 
                        lowerName.endsWith('.dcm');
        if (!isImage) continue;

        const formData = new FormData();
        formData.append('patient_id', activePatient.id);
        formData.append('imaging_type', file.name.toLowerCase().includes('xray') || file.name.toLowerCase().includes('x-ray') ? 'X-Ray' : 'Intraoral Photo');
        formData.append('tooth_numbers', String(toothNumber));
        formData.append('findings', file.name.replace(/\.[^.]+$/, ''));
        formData.append('file', file);

        await axios.post('/imaging/records/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      // Refresh attachments from backend
      await fetchDbAttachments();
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploading(false);
      // Reset input value
      e.target.value = '';
    }
  }, [activePatient, toothNumber, fetchDbAttachments]);

  const totalAttachments = clinicalData.attachments.length + dbAttachments.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-2xl
                      flex flex-col animate-slide-panel overflow-hidden border-l border-slate-100">

        {/* ── Panel Header ─────────────────────── */}
        <div className="px-6 py-5 bg-gradient-to-r from-dental-500 to-dental-600 text-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Tooth {displayLabel}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selection Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
              border ${getStatusStyle(clinicalData.status)}`}>
              {clinicalData.status === 'Treated' && <CheckCircle2 className="w-3 h-3" />}
              {clinicalData.status === 'Cavity' && <Circle className="w-3 h-3" />}
              {clinicalData.status}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Clock className="w-3 h-3" />
              Last Updated: {clinicalData.lastUpdated}
            </span>
          </div>

          {/* ── Tab Switcher ───────────────────── */}
          <div className="flex mt-4 bg-white/15 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                ${activeTab === 'history'
                  ? 'bg-white text-dental-600 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <Clock className="w-3 h-3 inline mr-1.5" />
              Treatment History
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                ${activeTab === 'attachments'
                  ? 'bg-white text-dental-600 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <FolderOpen className="w-3 h-3 inline mr-1.5" />
              Diagnostic Attachments
            </button>
          </div>
        </div>

        {/* ── Panel Body (Scrollable) ──────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">

          {/* ═══ Treatment History Tab ═══════════ */}
          {activeTab === 'history' && (
            <div className="animate-fade-in">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-dental-500" />
                Treatment History
              </h3>

              {clinicalData.history.length === 0 ? (
                <div className="text-center py-8 text-slate-300">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No treatment history recorded</p>
                  <p className="text-[10px]">Treatments will appear here once logged</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-dental-300 via-dental-200 to-transparent" />
                  <div className="space-y-0">
                    {clinicalData.history.map((entry, idx) => {
                      const colors = getTimelineColor(entry.status);
                      return (
                        <div
                          key={idx}
                          className="relative pl-9 pb-5 last:pb-0 group animate-slide-up"
                          style={{ animationDelay: `${idx * 80}ms` }}
                        >
                          <div className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white
                            shadow-sm ${colors.dot} z-10 group-hover:scale-125 transition-transform`} />
                          <div className="rounded-xl border border-slate-100 p-4 shadow-card hover:shadow-card-hover transition-all duration-200 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-dental-600">
                                <Calendar className="w-3 h-3" />
                                {entry.date}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                entry.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {entry.status === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Circle className="w-2.5 h-2.5" />}
                                {entry.status === 'completed' ? 'Completed' : 'In Progress'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1.5">{entry.procedure}</h4>
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                              <User className="w-3 h-3" />
                              {entry.dentist}
                            </p>
                            <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                              <StickyNote className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              <p className="text-xs text-slate-600 leading-relaxed">{entry.notes}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Diagnostic Attachments Tab ══════ */}
          {activeTab === 'attachments' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-dental-500" />
                  Diagnostic Attachments
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {totalAttachments} file{totalAttachments !== 1 ? 's' : ''}
                </span>
              </div>

              {clinicalData.attachments.length === 0 && dbAttachments.length === 0 ? (
                <div className="text-center py-8 text-slate-300">
                  <FileImage className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No attachments</p>
                  <p className="text-[10px]">Diagnostic media will appear here once uploaded</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {/* Existing clinical attachments with dummy radiograph images */}
                  {clinicalData.attachments.map((att, idx) => {
                    const Icon = ATTACHMENT_ICON_MAP[att.type] || FileImage;
                    return (
                      <div
                        key={`existing-${idx}`}
                        className="group rounded-xl border border-slate-100 bg-white overflow-hidden
                                   hover:shadow-card-hover hover:border-dental-200 transition-all duration-200 cursor-pointer
                                   animate-slide-up"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Radiograph / Photo Preview */}
                        <div className="h-32 overflow-hidden rounded-t-xl">
                          <DummyRadiograph type={att.type} />
                        </div>

                        {/* Label + meta */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-700 group-hover:text-dental-600 transition-colors flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-slate-400" />
                              {att.label}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400">{att.date}</span>
                              {att.size && (
                                <>
                                  <span className="text-[10px] text-slate-300">·</span>
                                  <span className="text-[10px] text-slate-400">{att.size}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-dental-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Real database-persisted images */}
                  {dbAttachments.map((img, idx) => (
                    <div
                      key={img.id}
                      className="group rounded-xl border border-emerald-200 bg-white overflow-hidden
                                 hover:shadow-card-hover hover:border-emerald-300 transition-all duration-200 cursor-pointer
                                 animate-slide-up"
                      style={{ animationDelay: `${(clinicalData.attachments.length + idx) * 60}ms` }}
                    >
                      {/* Saved Image Preview with fallback */}
                      <DbAttachmentPreview img={img} />

                      {/* Label + meta */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                            {img.label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">{img.date}</span>
                            <span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400">{img.size}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Upload Record Button ──────────── */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
                id="attachment-upload-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                id="upload-record-btn"
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-gradient-to-r from-dental-500 to-dental-600 text-white text-sm font-semibold
                           shadow-sm hover:shadow-glow-blue active:scale-[0.98] transition-all duration-200
                           border border-dental-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    Upload Record
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Accepts JPEG, PNG, and other image formats
              </p>
            </div>
          )}
        </div>

        {/* ── Panel Footer ─────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              Tooth {displayLabel} · {clinicalData.history.length} treatment{clinicalData.history.length !== 1 ? 's' : ''} · {totalAttachments} file{totalAttachments !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-dental-500 text-white text-xs font-semibold
                hover:bg-dental-600 active:scale-95 transition-all duration-200 shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
