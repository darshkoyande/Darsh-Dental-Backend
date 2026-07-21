import { useState, useRef, useEffect } from 'react';
import { Check, AlertTriangle, X, Wrench } from 'lucide-react';

/**
 * Tooth — Individual reusable interactive tooth element.
 * 
 * Props:
 *   toothNumber  (number)   — FDI tooth number (11-48 permanent, 51-85 primary)
 *   label        (string)   — Display label: 'A'-'T' for primary, FDI number for others
 *   location     (string)   — 'Upper' or 'Lower'
 *   status       (string)   — 'Healthy' | 'Cavity' | 'Missing' | 'Treated'
 *   isPrimary    (boolean)  — True for deciduous (baby) teeth; renders smaller SVG
 *   onStatusChange (func)   — Callback: (toothNumber, newStatus) => void
 *   onToothClick   (func)   — Callback: (toothNumber) => void — Opens detail panel
 *   readOnly     (boolean)  — If true, disables status editing (patient view)
 */

const STATUS_CONFIG = {
  Healthy: {
    fill:     '#f8fafc',
    stroke:   '#10b981',
    bg:       'bg-emerald-50',
    text:     'text-emerald-700',
    border:   'border-emerald-200',
    icon:     Check,
    label:    'Healthy',
    glow:     'hover:shadow-glow-emerald',
  },
  Cavity: {
    fill:     '#fef3c7',
    stroke:   '#ef4444',
    bg:       'bg-amber-50',
    text:     'text-amber-700',
    border:   'border-amber-200',
    icon:     AlertTriangle,
    label:    'Cavity',
    glow:     'hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
  },
  Missing: {
    fill:     '#f1f5f9',
    stroke:   '#cbd5e1',
    bg:       'bg-slate-50',
    text:     'text-slate-400',
    border:   'border-slate-200',
    icon:     X,
    label:    'Missing',
    glow:     '',
  },
  Treated: {
    fill:     '#dbeafe',
    stroke:   '#3b82f6',
    bg:       'bg-blue-50',
    text:     'text-blue-700',
    border:   'border-blue-200',
    icon:     Wrench,
    label:    'Treated',
    glow:     'hover:shadow-glow-blue',
  },
};

/* ── Tooth SVG Paths ─────────────────────────── */
/**
 * Determine if tooth is an anterior (incisor/canine) shape.
 * Works for both FDI permanent (11-48) and primary (51-85) notation.
 */
function isAnterior(fdi, isPrimary) {
  const rem = fdi % 10;
  // Anterior teeth are positions 1, 2, 3 in any FDI quadrant (e.g. 11,12,13 / 51,52,53)
  return rem >= 1 && rem <= 3;
}

function ToothSVG({ fill, stroke, isMissing, anterior, isPrimary }) {
  const opacity = isMissing ? 0.35 : 1;
  const dashArray = isMissing ? '3 2' : 'none';

  // Primary (baby) teeth are scaled down — slightly smaller & rounder
  const scale = isPrimary ? 0.82 : 1;

  if (anterior) {
    // Incisor / Canine shape — narrower, tapered
    const w = Math.round(36 * scale);
    const h = Math.round(48 * scale);
    return (
      <svg width={w} height={h} viewBox="0 0 36 48" style={{ opacity }}>
        <path
          d="M10 4 C10 2, 14 0, 18 0 C22 0, 26 2, 26 4 L28 16 C29 22, 28 30, 26 36 C24 42, 22 46, 18 48 C14 46, 12 42, 10 36 C8 30, 7 22, 8 16 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={isPrimary ? '2.2' : '1.8'}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Root hint */}
        <path
          d="M16 36 C16 40, 17 44, 18 46 C19 44, 20 40, 20 36"
          fill="none"
          stroke={stroke}
          strokeWidth="0.8"
          opacity="0.3"
          strokeDasharray={dashArray}
        />
      </svg>
    );
  }

  // Molar / Premolar shape — wider, flat crown
  const w = Math.round(40 * scale);
  const h = Math.round(48 * scale);
  return (
    <svg width={w} height={h} viewBox="0 0 40 48" style={{ opacity }}>
      <path
        d="M8 6 C6 2, 12 0, 16 0 L24 0 C28 0, 34 2, 32 6 L34 14 C35 18, 36 24, 34 30 C32 36, 28 42, 24 46 C22 48, 18 48, 16 46 C12 42, 8 36, 6 30 C4 24, 5 18, 6 14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={isPrimary ? '2.2' : '1.8'}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crown ridges */}
      <path
        d="M14 8 L14 14 M20 6 L20 14 M26 8 L26 14"
        fill="none"
        stroke={stroke}
        strokeWidth="0.8"
        opacity="0.3"
        strokeLinecap="round"
      />
      {/* Roots hint */}
      <path
        d="M14 36 C13 40, 12 44, 13 46 M26 36 C27 40, 28 44, 27 46"
        fill="none"
        stroke={stroke}
        strokeWidth="0.8"
        opacity="0.25"
        strokeDasharray={dashArray}
      />
    </svg>
  );
}

export default function Tooth({ toothNumber, label, location, status = 'Healthy', isPrimary = false, onStatusChange, onToothClick, readOnly = false }) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Healthy'];
  // Use provided label, fall back to tooth number
  const displayLabel = label ?? String(toothNumber);
  const anterior = isAnterior(toothNumber, isPrimary);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleStatusSelect(newStatus) {
    setShowPopover(false);
    if (onStatusChange && newStatus !== status) {
      onStatusChange(toothNumber, newStatus);
    }
  }

  function handleClick(e) {
    // Left click opens detail panel; status popover via context menu-style interaction
    if (onToothClick) {
      onToothClick(toothNumber);
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    if (!readOnly) {
      setShowPopover(!showPopover);
    }
  }

  return (
    <div className={`tooth-container flex flex-col items-center ${showPopover ? 'z-[100]' : ''}`} ref={popoverRef}>
      {/* Tooth Number Label (top for upper, bottom for lower) */}
      {location === 'Upper' && (
        <span className={`text-[10px] font-bold mb-1 ${config.text} ${isPrimary ? 'italic' : ''}`}>
          {displayLabel}
        </span>
      )}

      {/* Tooth SVG Button */}
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={readOnly && status === 'Missing'}
        className={`relative p-1 rounded-lg border-2 transition-all duration-200
                    ${config.border} ${config.bg} ${config.glow}
                    ${readOnly ? 'cursor-pointer' : 'cursor-pointer active:scale-95'}
                    ${showPopover ? 'ring-2 ring-dental-300 ring-offset-1' : ''}`}
        title={`Tooth ${displayLabel}${isPrimary ? ' (primary)' : ''} — ${config.label} (${location} Arch) · Click for details${!readOnly ? ' · Right-click to change status' : ''}`}
      >
        <ToothSVG
          fill={config.fill}
          stroke={config.stroke}
          isMissing={status === 'Missing'}
          anterior={anterior}
          isPrimary={isPrimary}
        />

        {/* Status indicator dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
                         ${status === 'Healthy' ? 'bg-emerald-400' : ''}
                         ${status === 'Cavity'  ? 'bg-amber-400' : ''}
                         ${status === 'Missing' ? 'bg-slate-300' : ''}
                         ${status === 'Treated' ? 'bg-blue-400' : ''}`} />
      </button>

      {/* Tooth Number Label (bottom for lower) */}
      {location === 'Lower' && (
        <span className={`text-[10px] font-bold mt-1 ${config.text} ${isPrimary ? 'italic' : ''}`}>
          {displayLabel}
        </span>
      )}

      {/* ── Status Popover ──────────────────── */}
      {showPopover && !readOnly && (
        <div className={`absolute z-[100] popover ${location === 'Upper' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2`}>
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Set Status
          </p>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = key === status;
            return (
              <button
                key={key}
                onClick={() => handleStatusSelect(key)}
                className={`popover-item w-full ${cfg.text} ${isSelected ? cfg.bg + ' font-semibold' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
                {isSelected && (
                  <Check className="w-3 h-3 ml-auto text-dental-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
