from datetime import datetime, date
from typing import List, Dict, Any
from app import models

# Standard Coding Systems
SYSTEM_SNOMED = "http://snomed.info/sct"
SYSTEM_LOINC = "http://details.loinc.org"
SYSTEM_ABDM = "https://ndhm.gov.in/abha"

# LOINC codes for perio measurements
CODE_PERIO_CHART = "73656-1"  # Periodontal charting dental system-wide observation
CODE_POCKET_DEPTH = "30164-8"
CODE_GINGIVAL_MARGIN = "30168-9"
CODE_CAL = "30165-5"
CODE_BOP = "30166-3"
CODE_PLAQUE = "30167-1"
CODE_SUPPURATION = "30169-7"

def get_fhir_patient(patient: models.Patient) -> Dict[str, Any]:
    # Calculate a mock birth year based on age
    birth_year = datetime.utcnow().year - patient.age
    birth_date = f"{birth_year}-01-01"

    identifiers = []
    if patient.abha_id:
        identifiers.append({
            "system": SYSTEM_ABDM,
            "value": patient.abha_id,
            "use": "official"
        })
    identifiers.append({
        "system": "http://lumendental.com/patients",
        "value": patient.patient_id,
        "use": "secondary"
    })

    return {
        "resourceType": "Patient",
        "id": f"pat-{patient.id}",
        "active": patient.status == "Active",
        "name": [
            {
                "use": "official",
                "text": patient.name,
                "family": patient.name.split()[-1] if len(patient.name.split()) > 1 else patient.name,
                "given": patient.name.split()[:-1] if len(patient.name.split()) > 1 else [patient.name]
            }
        ],
        "gender": patient.gender.lower() if patient.gender else "unknown",
        "birthDate": birth_date,
        "identifier": identifiers,
        "generalPractitioner": [
            {
                "display": patient.primary_doctor
            }
        ]
    }

def get_fhir_tooth_observation(tooth: models.ToothData, patient_id: int) -> Dict[str, Any]:
    sites = ["db", "b", "mb", "dl", "l", "ml"]
    components = []

    # Map measurements to components
    for site in sites:
        site_upper = site.upper()
        # Pocket Depth (PD)
        components.append({
            "code": {
                "coding": [{"system": SYSTEM_LOINC, "code": CODE_POCKET_DEPTH, "display": f"Pocket Depth {site_upper}"}]
            },
            "valueQuantity": {
                "value": getattr(tooth, f"pd_{site}"),
                "unit": "mm",
                "system": "http://unitsofmeasure.org",
                "code": "mm"
            }
        })
        
        # Gingival Margin (GM)
        components.append({
            "code": {
                "coding": [{"system": SYSTEM_LOINC, "code": CODE_GINGIVAL_MARGIN, "display": f"Gingival Margin {site_upper}"}]
            },
            "valueQuantity": {
                "value": getattr(tooth, f"gm_{site}"),
                "unit": "mm",
                "system": "http://unitsofmeasure.org",
                "code": "mm"
            }
        })

        # Clinical Attachment Level (CAL)
        components.append({
            "code": {
                "coding": [{"system": SYSTEM_LOINC, "code": CODE_CAL, "display": f"Clinical Attachment Level {site_upper}"}]
            },
            "valueQuantity": {
                "value": getattr(tooth, f"cal_{site}"),
                "unit": "mm",
                "system": "http://unitsofmeasure.org",
                "code": "mm"
            }
        })

        # Bleeding on Probing (BOP)
        components.append({
            "code": {
                "coding": [{"system": SYSTEM_LOINC, "code": CODE_BOP, "display": f"Bleeding on Probing {site_upper}"}]
            },
            "valueBoolean": bool(getattr(tooth, f"bop_{site}"))
        })

        # Plaque
        components.append({
            "code": {
                "coding": [{"system": SYSTEM_LOINC, "code": CODE_PLAQUE, "display": f"Dental Plaque {site_upper}"}]
            },
            "valueBoolean": bool(getattr(tooth, f"plaque_{site}"))
        })

        # Suppuration / Pus
        components.append({
            "code": {
                "coding": [{"system": SYSTEM_LOINC, "code": CODE_SUPPURATION, "display": f"Gingival Suppuration {site_upper}"}]
            },
            "valueBoolean": bool(getattr(tooth, f"pus_{site}"))
        })

    return {
        "resourceType": "Observation",
        "id": f"obs-tooth-{tooth.id}",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "exam",
                        "display": "Exam"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": SYSTEM_SNOMED,
                    "code": f"tooth-{tooth.tooth_number}",
                    "display": f"Tooth FDI #{tooth.tooth_number} - Status: {tooth.status}"
                }
            ],
            "text": f"Tooth {tooth.tooth_number} periodontal observations"
        },
        "subject": {
            "reference": f"Patient/pat-{patient_id}"
        },
        "bodySite": {
            "coding": [
                {
                    "system": SYSTEM_SNOMED,
                    "code": "181268008",
                    "display": "Periodontics structure"
                }
            ]
        },
        "component": components
    }

def get_fhir_diagnostic_report(chart: models.PerioChart, patient: models.Patient, teeth: List[models.ToothData]) -> Dict[str, Any]:
    # Construct individual observation resources
    observations = [get_fhir_tooth_observation(t, patient.id) for t in teeth]
    
    # Construct DiagnosticReport
    report = {
        "resourceType": "DiagnosticReport",
        "id": f"report-{chart.id}",
        "status": "final",
        "code": {
            "coding": [
                {
                    "system": SYSTEM_LOINC,
                    "code": CODE_PERIO_CHART,
                    "display": "Periodontal Charting Report"
                }
            ],
            "text": f"Periodontal Charting Diagnostic Report - Status: {chart.status}"
        },
        "subject": {
            "reference": f"Patient/pat-{patient.id}",
            "display": patient.name
        },
        "effectiveDateTime": chart.created_at.isoformat(),
        "issued": chart.created_at.isoformat(),
        "conclusion": chart.notes or "No notes provided.",
        "result": [{"reference": f"Observation/{obs['id']}"} for obs in observations]
    }

    # Bundle format containing report and all observations
    bundle = {
        "resourceType": "Bundle",
        "type": "document",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "entry": [
            {
                "fullUrl": f"http://lumendental.com/fhir/DiagnosticReport/{report['id']}",
                "resource": report
            }
        ]
    }

    for obs in observations:
        bundle["entry"].append({
            "fullUrl": f"http://lumendental.com/fhir/Observation/{obs['id']}",
            "resource": obs
        })

    return bundle
