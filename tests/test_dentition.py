"""
tests/test_dentition.py
~~~~~~~~~~~~~~~~~~~~~~~
Automated tests for the flexible dentition tracking system.

Covers:
  1. Adult chart initialisation  (32 permanent teeth)
  2. Pediatric chart initialisation (20 primary teeth)
  3. Mixed dentition chart (8 yr old → mixed set)
  4. Update tooth status from PRESENT → EXTRACTED
  5. Invalid tooth identifier (e.g. "99") → 422
  6. PRIMARY status on a permanent tooth slot → 422
  7. Batch update of multiple teeth
  8. MISSING_CONGENITAL status stored and returned correctly

Test database: in-memory SQLite (separate from production and test_main.py).
"""

import os

# Redirect to a fresh in-memory test database before any app imports.
os.environ["DATABASE_URL"] = "sqlite:///./test_dentition.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.main import app
from app import models, crud
from app.dentition import (
    DentitionType,
    ToothStatus,
    NotationSystem,
    PRIMARY_FDI_ORDERED,
    PERMANENT_FDI_ORDERED,
    MIXED_FDI_ORDERED,
    resolve_dentition_type,
)

# ── Fixtures ──────────────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_dentition.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Create all tables and seed three patients with different ages."""
    Base.metadata.create_all(bind=test_engine)

    db = TestSessionLocal()

    # Wipe any leftover data from a previous run
    db.query(models.PatientToothRecord).delete()
    db.query(models.ToothData).delete()
    db.query(models.PerioChart).delete()
    db.query(models.Patient).delete()
    db.query(models.AuditLog).delete()
    db.commit()

    # ── Seed three patients ──
    adult = models.Patient(
        patient_id="DT-ADULT-01",
        name="Adult Patient",
        age=35,
        gender="Male",
        primary_doctor="Dr. Test",
        status="Active",
        treatment_status="In Plan",
    )
    pediatric = models.Patient(
        patient_id="DT-PEDI-01",
        name="Pediatric Patient",
        age=4,
        gender="Female",
        primary_doctor="Dr. Test",
        status="Active",
        treatment_status="In Plan",
    )
    mixed = models.Patient(
        patient_id="DT-MIXED-01",
        name="Mixed Patient",
        age=8,
        gender="Male",
        primary_doctor="Dr. Test",
        status="Active",
        treatment_status="In Plan",
    )

    db.add_all([adult, pediatric, mixed])
    db.commit()
    db.refresh(adult)
    db.refresh(pediatric)
    db.refresh(mixed)

    db.close()

    yield

    # Teardown — remove test DB file
    if os.path.exists("./test_dentition.db"):
        try:
            os.remove("./test_dentition.db")
        except PermissionError:
            pass  # Windows may hold a lock; acceptable to leave stale file


# Override the app's DB dependency with the test database session
from app.database import get_db

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_patient_db_id(patient_id_str: str) -> int:
    """Return the integer PK for a patient given its string external ID."""
    db = TestSessionLocal()
    try:
        p = db.query(models.Patient).filter(
            models.Patient.patient_id == patient_id_str
        ).first()
        return p.id
    finally:
        db.close()


# ── Test 1: Adult chart initialisation ───────────────────────────────────────

def test_adult_chart_initialization():
    """
    GET chart for a 35-yr-old patient.
    Expects 32 permanent FDI teeth, all with PRESENT status.
    """
    patient_db_id = _get_patient_db_id("DT-ADULT-01")
    response = client.get(f"/api/v1/patients/{patient_db_id}/chart")
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["dentition_type"] == DentitionType.PERMANENT.value
    assert data["total_teeth"] == 32
    assert data["age"] == 35

    teeth = data["teeth"]
    assert len(teeth) == 32

    # All teeth should have PRESENT status
    statuses = {t["status"] for t in teeth}
    assert statuses == {ToothStatus.PRESENT.value}

    # All notation systems should be FDI_PERMANENT
    notations = {t["notation_system"] for t in teeth}
    assert notations == {NotationSystem.FDI_PERMANENT.value}

    # Verify every expected FDI number is represented
    returned_ids = {int(t["tooth_identifier"]) for t in teeth}
    assert returned_ids == set(PERMANENT_FDI_ORDERED)


# ── Test 2: Pediatric chart initialisation ────────────────────────────────────

def test_pediatric_chart_initialization():
    """
    GET chart for a 4-yr-old patient.
    Expects 20 primary FDI teeth (51-85), all with PRIMARY status.
    """
    patient_db_id = _get_patient_db_id("DT-PEDI-01")
    response = client.get(f"/api/v1/patients/{patient_db_id}/chart")
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["dentition_type"] == DentitionType.PRIMARY.value
    assert data["total_teeth"] == 20
    assert data["age"] == 4

    teeth = data["teeth"]
    assert len(teeth) == 20

    # All teeth should have PRIMARY status
    statuses = {t["status"] for t in teeth}
    assert statuses == {ToothStatus.PRIMARY.value}

    # All notation systems should be FDI_PRIMARY
    notations = {t["notation_system"] for t in teeth}
    assert notations == {NotationSystem.FDI_PRIMARY.value}

    # Verify every expected primary FDI number is represented
    returned_ids = {int(t["tooth_identifier"]) for t in teeth}
    assert returned_ids == set(PRIMARY_FDI_ORDERED)


# ── Test 3: Mixed dentition chart ─────────────────────────────────────────────

def test_mixed_dentition_chart():
    """
    GET chart for an 8-yr-old patient.
    Expects 28 teeth (20 primary + 8 erupted permanent), MIXED dentition type.
    """
    patient_db_id = _get_patient_db_id("DT-MIXED-01")
    response = client.get(f"/api/v1/patients/{patient_db_id}/chart")
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["dentition_type"] == DentitionType.MIXED.value
    assert data["total_teeth"] == len(MIXED_FDI_ORDERED)
    assert data["age"] == 8

    teeth = data["teeth"]
    assert len(teeth) == len(MIXED_FDI_ORDERED)

    # Should have both notation systems present
    notations = {t["notation_system"] for t in teeth}
    assert NotationSystem.FDI_PRIMARY.value in notations
    assert NotationSystem.FDI_PERMANENT.value in notations

    # Returned identifiers should match the expected mixed set
    returned_ids = {int(t["tooth_identifier"]) for t in teeth}
    assert returned_ids == set(MIXED_FDI_ORDERED)


# ── Test 4: Update tooth from PRESENT → EXTRACTED ─────────────────────────────

def test_update_tooth_status_to_extracted():
    """
    PUT tooth 18 to EXTRACTED for the adult patient.
    Subsequent GET must return tooth 18 as EXTRACTED.
    """
    patient_db_id = _get_patient_db_id("DT-ADULT-01")

    update_payload = {
        "updates": [
            {
                "tooth_identifier": "18",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.EXTRACTED.value,
                "notes": "Upper right wisdom tooth extracted due to pericoronitis.",
            }
        ]
    }
    put_response = client.put(
        f"/api/v1/patients/{patient_db_id}/chart/teeth", json=update_payload
    )
    assert put_response.status_code == 200, put_response.text

    # Re-fetch the full chart and confirm
    get_response = client.get(f"/api/v1/patients/{patient_db_id}/chart")
    assert get_response.status_code == 200

    teeth = get_response.json()["teeth"]
    tooth_18 = next((t for t in teeth if t["tooth_identifier"] == "18"), None)
    assert tooth_18 is not None, "Tooth 18 not found in chart"
    assert tooth_18["status"] == ToothStatus.EXTRACTED.value
    assert tooth_18["notes"] == "Upper right wisdom tooth extracted due to pericoronitis."


# ── Test 5: Invalid permanent tooth identifier ────────────────────────────────

def test_invalid_permanent_identifier():
    """
    PUT with tooth identifier '99' (not a valid FDI permanent number).
    Expects HTTP 422 Unprocessable Entity.
    """
    patient_db_id = _get_patient_db_id("DT-ADULT-01")

    update_payload = {
        "updates": [
            {
                "tooth_identifier": "99",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.EXTRACTED.value,
            }
        ]
    }
    response = client.put(
        f"/api/v1/patients/{patient_db_id}/chart/teeth", json=update_payload
    )
    assert response.status_code == 422, (
        f"Expected 422 for invalid tooth '99', got {response.status_code}: {response.text}"
    )


# ── Test 6: PRIMARY status on a permanent tooth slot ─────────────────────────

def test_primary_status_on_permanent_tooth():
    """
    PUT PRIMARY status on FDI_PERMANENT tooth '21'.
    Should be rejected with HTTP 422 since PRIMARY is a deciduous-only status.
    """
    patient_db_id = _get_patient_db_id("DT-ADULT-01")

    update_payload = {
        "updates": [
            {
                "tooth_identifier": "21",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.PRIMARY.value,  # Invalid: PRIMARY on a permanent slot
            }
        ]
    }
    response = client.put(
        f"/api/v1/patients/{patient_db_id}/chart/teeth", json=update_payload
    )
    assert response.status_code == 422, (
        f"Expected 422 for PRIMARY status on permanent tooth, got {response.status_code}: {response.text}"
    )


# ── Test 7: Batch update ──────────────────────────────────────────────────────

def test_batch_update():
    """
    PUT multiple teeth in one request to the adult chart.
    All statuses must be reflected in the subsequent GET.
    """
    patient_db_id = _get_patient_db_id("DT-ADULT-01")

    update_payload = {
        "updates": [
            {
                "tooth_identifier": "36",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.IMPACTED.value,
            },
            {
                "tooth_identifier": "46",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.EXTRACTED.value,
            },
            {
                "tooth_identifier": "11",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.PRESENT.value,
                "surfaces": '{"buccal": "intact", "mesial": "filling"}',
            },
        ]
    }
    put_response = client.put(
        f"/api/v1/patients/{patient_db_id}/chart/teeth", json=update_payload
    )
    assert put_response.status_code == 200, put_response.text

    get_response = client.get(f"/api/v1/patients/{patient_db_id}/chart")
    assert get_response.status_code == 200

    teeth = {t["tooth_identifier"]: t for t in get_response.json()["teeth"]}

    assert teeth["36"]["status"] == ToothStatus.IMPACTED.value
    assert teeth["46"]["status"] == ToothStatus.EXTRACTED.value
    assert teeth["11"]["status"] == ToothStatus.PRESENT.value
    assert teeth["11"]["surfaces"] == '{"buccal": "intact", "mesial": "filling"}'


# ── Test 8: MISSING_CONGENITAL status ─────────────────────────────────────────

def test_congenital_missing_tooth():
    """
    Mark permanent tooth 22 as MISSING_CONGENITAL.
    Verify it is stored and returned with the correct status.
    """
    patient_db_id = _get_patient_db_id("DT-ADULT-01")

    update_payload = {
        "updates": [
            {
                "tooth_identifier": "22",
                "notation_system": NotationSystem.FDI_PERMANENT.value,
                "status": ToothStatus.MISSING_CONGENITAL.value,
                "notes": "Lateral incisor congenitally absent — confirmed on panoramic radiograph.",
            }
        ]
    }
    put_response = client.put(
        f"/api/v1/patients/{patient_db_id}/chart/teeth", json=update_payload
    )
    assert put_response.status_code == 200, put_response.text

    get_response = client.get(f"/api/v1/patients/{patient_db_id}/chart")
    assert get_response.status_code == 200

    teeth = {t["tooth_identifier"]: t for t in get_response.json()["teeth"]}
    assert "22" in teeth
    assert teeth["22"]["status"] == ToothStatus.MISSING_CONGENITAL.value
    assert "congenitally absent" in (teeth["22"]["notes"] or "")


# ── Bonus: 404 for unknown patient ────────────────────────────────────────────

def test_chart_not_found_for_unknown_patient():
    """GET chart for a non-existent patient ID returns 404."""
    response = client.get("/api/v1/patients/999999/chart")
    assert response.status_code == 404


# ── Bonus: dentition resolution unit tests ────────────────────────────────────

def test_dentition_type_resolution():
    """Unit test the resolve_dentition_type helper directly."""
    assert resolve_dentition_type(0)  == DentitionType.PRIMARY
    assert resolve_dentition_type(3)  == DentitionType.PRIMARY
    assert resolve_dentition_type(5)  == DentitionType.PRIMARY
    assert resolve_dentition_type(6)  == DentitionType.MIXED
    assert resolve_dentition_type(8)  == DentitionType.MIXED
    assert resolve_dentition_type(11) == DentitionType.MIXED
    assert resolve_dentition_type(12) == DentitionType.PERMANENT
    assert resolve_dentition_type(35) == DentitionType.PERMANENT
    assert resolve_dentition_type(70) == DentitionType.PERMANENT
