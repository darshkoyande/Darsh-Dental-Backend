"""
app/dentition.py
~~~~~~~~~~~~~~~~
Dentition constants, enumerations, and helper utilities.

This module is the single source of truth for:
  - Tooth notation systems and valid identifier sets
  - ToothStatus and DentitionType enumerations
  - Age-based dentition resolution
  - Default chart tooth lists for each dentition type

It has NO database or FastAPI imports, so it can be used safely from
models, schemas, crud, routers, and test code without circular imports.
"""

from enum import Enum


# ── Enumerations ──────────────────────────────────────────────────────────────

class ToothStatus(str, Enum):
    """Clinical status of a single tooth slot in a patient's dentition chart."""
    PRESENT           = "PRESENT"            # Tooth is erupted and present
    PRIMARY           = "PRIMARY"            # Deciduous (baby) tooth, present
    ERUPTING          = "ERUPTING"           # Tooth is in the process of erupting
    EXTRACTED         = "EXTRACTED"          # Tooth has been surgically removed
    MISSING_CONGENITAL = "MISSING_CONGENITAL" # Tooth never developed (congenitally absent)
    IMPACTED          = "IMPACTED"           # Tooth failed to erupt, remains embedded


class DentitionType(str, Enum):
    """Broad classification of a patient's current dentition stage."""
    PRIMARY   = "PRIMARY"    # < 6 yrs: 20 deciduous teeth only
    MIXED     = "MIXED"      # 6-11 yrs: primary and permanent teeth coexist
    PERMANENT = "PERMANENT"  # ≥ 12 yrs: full permanent dentition


class NotationSystem(str, Enum):
    """Tooth identifier notation system."""
    FDI_PERMANENT   = "FDI_PERMANENT"   # FDI integers 11-48 (adult permanent)
    FDI_PRIMARY     = "FDI_PRIMARY"     # FDI integers 51-85 (primary/deciduous)
    UNIVERSAL_PRIMARY = "UNIVERSAL_PRIMARY"  # Universal letters A-T (primary)


# ── Valid Tooth Identifier Sets ───────────────────────────────────────────────

# FDI permanent teeth — 32 teeth across 4 quadrants
PERMANENT_FDI_TEETH: set[int] = {
    # Upper right (Q1): 11-18
    11, 12, 13, 14, 15, 16, 17, 18,
    # Upper left (Q2): 21-28
    21, 22, 23, 24, 25, 26, 27, 28,
    # Lower left (Q3): 31-38
    31, 32, 33, 34, 35, 36, 37, 38,
    # Lower right (Q4): 41-48
    41, 42, 43, 44, 45, 46, 47, 48,
}

# FDI primary teeth — 20 deciduous teeth across 4 quadrants
PRIMARY_FDI_TEETH: set[int] = {
    # Upper right (Q5): 51-55
    51, 52, 53, 54, 55,
    # Upper left (Q6): 61-65
    61, 62, 63, 64, 65,
    # Lower left (Q7): 71-75
    71, 72, 73, 74, 75,
    # Lower right (Q8): 81-85
    81, 82, 83, 84, 85,
}

# Universal letter-based primary teeth — A through T (20 teeth)
# A-E: upper right; F-J: upper left; K-O: lower left; P-T: lower right
PRIMARY_UNIVERSAL_TEETH: set[str] = set("ABCDEFGHIJKLMNOPQRST")

# Statuses that are only valid for primary (deciduous) teeth
PRIMARY_ONLY_STATUSES: set[ToothStatus] = {
    ToothStatus.PRIMARY,
    ToothStatus.ERUPTING,
}

# Notation systems that represent primary (deciduous) teeth
PRIMARY_NOTATION_SYSTEMS: set[NotationSystem] = {
    NotationSystem.FDI_PRIMARY,
    NotationSystem.UNIVERSAL_PRIMARY,
}

# ── Mixed Dentition: Teeth present at ages 6-11 ───────────────────────────────
# At the start of mixed dentition the four permanent first molars (16,26,36,46)
# and central incisors (11,21,31,41) erupt while most primary teeth remain.
# We initialise these 8 permanent slots in addition to all 20 primary slots.
MIXED_DENTITION_PERMANENT_TEETH: set[int] = {
    16, 26, 36, 46,   # First molars
    11, 21, 31, 41,   # Central incisors
}


# ── Ordered display lists (charting order, right-to-left upper then lower) ────

PERMANENT_FDI_ORDERED: list[int] = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,  # Maxilla
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,  # Mandible
]

PRIMARY_FDI_ORDERED: list[int] = [
    55, 54, 53, 52, 51, 61, 62, 63, 64, 65,  # Maxilla
    85, 84, 83, 82, 81, 71, 72, 73, 74, 75,  # Mandible
]

# For mixed dentition: primary teeth first, then the erupted permanent ones
MIXED_FDI_ORDERED: list[int] = PRIMARY_FDI_ORDERED + sorted(MIXED_DENTITION_PERMANENT_TEETH)


# ── Age-based resolution helpers ──────────────────────────────────────────────

def resolve_dentition_type(age: int) -> DentitionType:
    """
    Determine the expected dentition type from a patient's age.

    Boundaries follow clinical convention:
      0–5   → PRIMARY   (all primary teeth)
      6–11  → MIXED     (primary + some permanent)
      12+   → PERMANENT (full permanent dentition)
    """
    if age < 6:
        return DentitionType.PRIMARY
    elif age < 12:
        return DentitionType.MIXED
    else:
        return DentitionType.PERMANENT


def get_default_chart_teeth(dentition_type: DentitionType) -> list[int]:
    """
    Return the ordered list of FDI tooth identifiers (as integers) for the
    initial chart of a given dentition type.

    Primary teeth use FDI primary notation (51-85).
    Mixed dentition uses 20 primary + 8 erupted permanent teeth.
    Permanent dentition uses all 32 standard FDI adult teeth.
    """
    if dentition_type == DentitionType.PRIMARY:
        return list(PRIMARY_FDI_ORDERED)
    elif dentition_type == DentitionType.MIXED:
        return list(MIXED_FDI_ORDERED)
    else:
        return list(PERMANENT_FDI_ORDERED)


def classify_tooth_identifier(tooth_id: str) -> NotationSystem | None:
    """
    Infer the notation system from a tooth identifier string.

    Returns None if the identifier is not valid in any supported system.
    """
    # Try numeric FDI systems first
    try:
        fdi_int = int(tooth_id)
        if fdi_int in PERMANENT_FDI_TEETH:
            return NotationSystem.FDI_PERMANENT
        if fdi_int in PRIMARY_FDI_TEETH:
            return NotationSystem.FDI_PRIMARY
        return None
    except ValueError:
        pass
    # Try Universal letter system
    if tooth_id.upper() in PRIMARY_UNIVERSAL_TEETH:
        return NotationSystem.UNIVERSAL_PRIMARY
    return None


def get_default_status_for_notation(notation: NotationSystem) -> ToothStatus:
    """Return the appropriate default status for a given notation system."""
    if notation in PRIMARY_NOTATION_SYSTEMS:
        return ToothStatus.PRIMARY
    return ToothStatus.PRESENT
