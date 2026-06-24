import os
# Configure environment variable before importing database / app
os.environ["DATABASE_URL"] = "sqlite:///./test_dental.db"

import pytest
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app.main import app
from app import models, schemas, crud

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create tables in test database
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Clean test tables
    db.query(models.ToothData).delete()
    db.query(models.PerioChart).delete()
    db.query(models.Patient).delete()
    db.query(models.AuditLog).delete()
    db.commit()

    # Seed patient
    test_patient = models.Patient(
        patient_id="PT-TEST-01",
        name="Test Patient",
        status="Active",
        abha_id="99-8888-7777-6666",
        age=50,
        gender="Female",
        primary_doctor="Dr. Priya Sharma",
        last_visit="01 Jan 2026",
        next_visit="01 Jul 2026",
        treatment_status="In Plan"
    )
    db.add(test_patient)
    db.commit()
    db.refresh(test_patient)

    # Seed chart
    test_chart = models.PerioChart(
        patient_id=test_patient.id,
        status="In Plan",
        notes="Test clinical notes"
    )
    db.add(test_chart)
    db.commit()
    db.refresh(test_chart)

    # 180 sites (30 teeth * 6 sites)
    # We need:
    # 38 deep pockets (PD >= 6)
    # 59 bleeding sites (BOP = True)
    # Avg pocket depth = 4.4 mm -> sum of pocket depths must be 790 (790 / 180 = 4.3888...)
    
    # Pocket depths pool:
    # 10 * 8 = 80
    # 10 * 7 = 70
    # 18 * 6 = 108
    # (38 deep pockets, sum = 258)
    # 40 * 5 = 200
    # 48 * 4 = 192
    # 32 * 3 = 96
    # 22 * 2 = 44
    # (142 normal pockets, sum = 532)
    # Total sum = 258 + 532 = 790.
    pd_values = ([8] * 10) + ([7] * 10) + ([6] * 18) + ([5] * 40) + ([4] * 48) + ([3] * 32) + ([2] * 22)
    bop_values = ([True] * 59) + ([False] * 121)
    
    fdi_teeth = [
        18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
        48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
    ]

    pool_idx = 0
    for tooth_num in fdi_teeth:
        if tooth_num in [28, 38]:
            t_data = models.ToothData(
                chart_id=test_chart.id,
                tooth_number=tooth_num,
                status="Missing"
            )
            db.add(t_data)
        else:
            # Set mobility and furcation for 5 teeth
            mob = 1 if tooth_num in [18, 16, 46, 36, 31] else 0
            furc = 1 if tooth_num in [17, 16, 46, 47, 36] else 0
            
            pds = pd_values[pool_idx : pool_idx + 6]
            bops = bop_values[pool_idx : pool_idx + 6]
            pool_idx += 6
            
            t_data = models.ToothData(
                chart_id=test_chart.id,
                tooth_number=tooth_num,
                status="Normal",
                mobility=mob,
                furcation=furc,
                # DB
                pd_db=pds[0], gm_db=0, cal_db=pds[0], bop_db=bops[0],
                # B
                pd_b=pds[1], gm_b=0, cal_b=pds[1], bop_b=bops[1],
                # MB
                pd_mb=pds[2], gm_mb=0, cal_mb=pds[2], bop_mb=bops[2],
                # DL
                pd_dl=pds[3], gm_dl=0, cal_dl=pds[3], bop_dl=bops[3],
                # L
                pd_l=pds[4], gm_l=0, cal_l=pds[4], bop_l=bops[4],
                # ML
                pd_ml=pds[5], gm_ml=0, cal_ml=pds[5], bop_ml=bops[5]
            )
            db.add(t_data)
            
    db.commit()
    db.close()
    
    yield
    
    # Teardown
    import os
    if os.path.exists("./test_dental.db"):
        try:
            os.remove("./test_dental.db")
        except PermissionError:
            pass

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"
    assert "FHIR R4" in response.json()["standards"]

def test_read_patients():
    response = client.get("/patients/")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    patient = response.json()[0]
    assert patient["name"] == "Test Patient"
    assert patient["patient_id"] == "PT-TEST-01"

def test_create_patient_auto_id_and_chart():
    # 1. Create a patient without specifying patient_id
    payload = {
        "name": "New Dynamic Patient",
        "age": 29,
        "gender": "Male",
        "primary_doctor": "Dr. Priya Sharma",
        "status": "Active"
    }
    response = client.post("/patients/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Dynamic Patient"
    assert data["patient_id"].startswith("PT-")
    patient_id = data["id"]
    
    # 2. Fetch latest chart and stats for this new patient (should auto-create a default chart)
    chart_res = client.get(f"/patients/{patient_id}/charts/latest")
    assert chart_res.status_code == 200
    chart_data = chart_res.json()
    assert "chart" in chart_data
    assert "stats" in chart_data
    assert chart_data["chart"]["notes"] == "Initial periodontal chart created."
    assert len(chart_data["chart"]["teeth_data"]) == 32


def test_read_patient_by_external_id():
    response = client.get("/patients/by-external/PT-TEST-01")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Patient"

def test_latest_chart_and_stats():
    # Fetch patient DB ID first
    patient_res = client.get("/patients/by-external/PT-TEST-01")
    patient_id = patient_res.json()["id"]
    
    response = client.get(f"/patients/{patient_id}/charts/latest")
    assert response.status_code == 200
    data = response.json()
    assert "chart" in data
    assert "stats" in data
    
    stats = data["stats"]
    assert stats["missing_teeth"] == 2
    assert stats["bleeding_sites_count"] == 59
    assert stats["avg_pocket_depth"] == 4.4
    assert stats["deep_pockets_count"] == 38
    assert stats["mobility_cases_count"] == 5
    assert stats["furcation_cases_count"] == 5
    assert stats["bleeding_sites_percentage"] == 32.8  # (59 / 180) * 100 = 32.777... rounds to 32.8%

def test_ai_analysis():
    # Fetch patient DB ID and latest chart
    patient_res = client.get("/patients/by-external/PT-TEST-01")
    patient_id = patient_res.json()["id"]
    chart_res = client.get(f"/patients/{patient_id}/charts/latest")
    chart_id = chart_res.json()["chart"]["id"]
    
    response = client.post(f"/charts/{chart_id}/ai-analysis")
    assert response.status_code == 200
    data = response.json()
    assert data["severity_level"] == "Severe"
    assert "Periodontitis" in data["diagnosis_summary"]
    assert "Scaling and Root Planing" in "".join(data["recommended_treatment_plan"])

def test_fhir_endpoints():
    # Test FHIR Patient Resource
    response = client.get("/fhir/Patient/1")
    assert response.status_code == 200
    assert response.json()["resourceType"] == "Patient"
    assert response.json()["name"][0]["text"] == "Test Patient"

    # Test FHIR DiagnosticReport Resource
    response = client.get("/fhir/DiagnosticReport/1")
    assert response.status_code == 200
    assert response.json()["resourceType"] == "Bundle"
    assert response.json()["entry"][0]["resource"]["resourceType"] == "DiagnosticReport"

def test_abdm_endpoints():
    # Verify ABHA
    response = client.post("/abdm/verify-abha", json={"abha_number": "12-3456-7890-1234"})
    assert response.status_code == 200
    assert response.json()["name"] == "Aarav Mehta"
    
    # Link context
    link_response = client.post("/abdm/link-care-context", json={
        "patient_id": "PT-TEST-01",
        "abha_number": "12-3456-7890-1234",
        "consent_id": "consent-xyz-987"
    })
    assert link_response.status_code == 200
    assert link_response.json()["status"] == "LINKED"

def test_audit_logs():
    # Query logs
    response = client.get("/audit-logs/")
    assert response.status_code == 200
    assert len(response.json()) > 0
    actions = [log["action"] for log in response.json()]
    assert "READ" in actions or "CREATE" in actions or "ABDM_LINK" in actions
