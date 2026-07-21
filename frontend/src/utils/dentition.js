/**
 * dentition.js — Frontend Dentition Constants & Helpers
 *
 * Mirrors app/dentition.py so the frontend uses the SAME clinical
 * thresholds and tooth lists as the backend.
 *
 * Dentition stages (per clinical convention):
 *   PRIMARY   → age < 6   : 20 deciduous teeth (FDI 51–85 / Universal A–T)
 *   MIXED     → age 6–11  : 20 primary + 8 erupted permanent teeth (28 total)
 *   PERMANENT → age ≥ 12  : 32 permanent adult teeth (FDI 11–48)
 */

export const DentitionType = {
  PRIMARY:   'PRIMARY',
  MIXED:     'MIXED',
  PERMANENT: 'PERMANENT',
};

/**
 * Determine dentition type from patient age.
 * Matches resolve_dentition_type() in app/dentition.py exactly.
 */
export function resolveDentitionType(age) {
  if (age == null || age === undefined) return DentitionType.PERMANENT;
  if (age < 6)  return DentitionType.PRIMARY;
  if (age < 12) return DentitionType.MIXED;
  return DentitionType.PERMANENT;
}

// ── Universal letter labels for primary teeth (A–T) ─────────────────────────
// Order: A-E upper right, F-J upper left, K-O lower left, P-T lower right
// Maps FDI primary tooth number → Universal letter label
export const FDI_TO_UNIVERSAL = {
  55: 'A', 54: 'B', 53: 'C', 52: 'D', 51: 'E',
  61: 'F', 62: 'G', 63: 'H', 64: 'I', 65: 'J',
  75: 'K', 74: 'L', 73: 'M', 72: 'N', 71: 'O',
  81: 'P', 82: 'Q', 83: 'R', 84: 'S', 85: 'T',
};

// ── Permanent Teeth (FDI 11–48) ──────────────────────────────────────────────
// Display order: upper right-to-left → upper left-to-right | lower right-to-left → lower left-to-right
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// ── Primary Teeth (FDI 51–85) ────────────────────────────────────────────────
// Display order: upper right-to-left then left-to-right | lower right-to-left then left-to-right
export const PRIMARY_UPPER   = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PRIMARY_LOWER   = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

// ── Mixed Dentition: Primary teeth + 8 early permanent teeth ─────────────────
// The 8 permanent teeth that erupt first: first molars (16,26,36,46) + central incisors (11,21,31,41)
const MIXED_EXTRA_UPPER = [16, 11, 21, 26]; // sorted by display position
const MIXED_EXTRA_LOWER = [46, 41, 31, 36];

// Mixed upper arch: primary teeth with permanent first molars and central incisors inserted
// Display: [18-placeholder?] No — we merge and sort for correct arch order
// Upper: 16 | 55 54 53 52 51 61 62 63 64 65 | 26
// Lower: 46 | 85 84 83 82 81 71 72 73 74 75 | 36 (+ 41/31 incisors)
export const MIXED_UPPER = buildMixedArch(PRIMARY_UPPER, MIXED_EXTRA_UPPER, 'upper');
export const MIXED_LOWER = buildMixedArch(PRIMARY_LOWER, MIXED_EXTRA_LOWER, 'lower');

function buildMixedArch(primaryTeeth, extraPermanent, arch) {
  // For mixed, we insert the early-erupting permanent teeth at the correct positions.
  // Upper arch display order (right → left): 16, [primary upper right A-E], [primary upper left F-J], 26 + central incisors
  // We'll represent each slot as an object: { fdi, label, isPrimary, arch }

  // Start with primary teeth
  const slots = primaryTeeth.map(fdi => ({
    fdi,
    label: FDI_TO_UNIVERSAL[fdi] || String(fdi),
    isPrimary: true,
  }));

  // Build permanent extra slots
  const permanentSlots = extraPermanent.map(fdi => ({
    fdi,
    label: String(fdi),
    isPrimary: false,
  }));

  if (arch === 'upper') {
    // Insert 16 at start (rightmost), 26 at end (leftmost)
    // Insert 11 between primary index 4 (51→E) and 5 (61→F)
    // Insert 21 between primary index 4 and 5 as well (right of 11)
    // Order: 16, 55,54,53,52,51, 11,21, 61,62,63,64,65, 26
    const [p16, p11, p21, p26] = [
      permanentSlots.find(s => s.fdi === 16),
      permanentSlots.find(s => s.fdi === 11),
      permanentSlots.find(s => s.fdi === 21),
      permanentSlots.find(s => s.fdi === 26),
    ];
    return [p16, ...slots.slice(0, 5), p11, p21, ...slots.slice(5), p26].filter(Boolean);
  } else {
    // Lower order: 46, 85,84,83,82,81, 41,31, 71,72,73,74,75, 36
    const [p46, p41, p31, p36] = [
      permanentSlots.find(s => s.fdi === 46),
      permanentSlots.find(s => s.fdi === 41),
      permanentSlots.find(s => s.fdi === 31),
      permanentSlots.find(s => s.fdi === 36),
    ];
    return [p46, ...slots.slice(0, 5), p41, p31, ...slots.slice(5), p36].filter(Boolean);
  }
}

/**
 * Build the full tooth slot list for a given dentition type.
 * Each slot: { fdi, label, isPrimary, isUpper }
 * For PERMANENT, fdi uses FDI 11-48 notation (not the old 1-32 sequential numbering).
 */
export function getTeethForDentition(dentitionType) {
  switch (dentitionType) {
    case DentitionType.PRIMARY:
      return {
        upper: PRIMARY_UPPER.map(fdi => ({ fdi, label: FDI_TO_UNIVERSAL[fdi], isPrimary: true })),
        lower: PRIMARY_LOWER.map(fdi => ({ fdi, label: FDI_TO_UNIVERSAL[fdi], isPrimary: true })),
        totalCount: 20,
        typeName: 'Primary Dentition',
      };

    case DentitionType.MIXED:
      return {
        upper: MIXED_UPPER,
        lower: MIXED_LOWER,
        totalCount: 28,
        typeName: 'Mixed Dentition',
      };

    case DentitionType.PERMANENT:
    default:
      return {
        upper: PERMANENT_UPPER.map(fdi => ({ fdi, label: String(fdi), isPrimary: false })),
        lower: PERMANENT_LOWER.map(fdi => ({ fdi, label: String(fdi), isPrimary: false })),
        totalCount: 32,
        typeName: 'Permanent Dentition',
      };
  }
}

/**
 * Build the initial status map for a given dentition type.
 * Keys are FDI tooth numbers (as strings for reliable map keys).
 */
export function buildInitialTeethStatus(teethData) {
  const status = {};
  teethData.upper.forEach(t => { status[t.fdi] = 'Healthy'; });
  teethData.lower.forEach(t => { status[t.fdi] = 'Healthy'; });
  return status;
}

/**
 * Determine if a tooth number is an anterior (front) tooth for SVG shape selection.
 * Works for both FDI permanent (11-28 range) and primary (51-65 range).
 */
export function isAnteriorTooth(fdi, isPrimary) {
  if (isPrimary) {
    // Primary anterior: central & lateral incisors + canines in each quadrant
    // Q5: 51,52,53 | Q6: 61,62,63 | Q7: 71,72,73 | Q8: 81,82,83
    const rem = fdi % 10;
    return rem >= 1 && rem <= 3;
  }
  // Permanent anterior: FDI 11,12,13,21,22,23,31,32,33,41,42,43
  const rem = fdi % 10;
  return rem >= 1 && rem <= 3;
}
