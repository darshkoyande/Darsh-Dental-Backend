from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any
from app import schemas, crud, database, stats
from app.schemas import WISDOM_TEETH

router = APIRouter(
    tags=["charts"]
)

@router.post("/patients/{patient_id}/charts", response_model=schemas.PerioChartResponse, status_code=status.HTTP_201_CREATED)
def create_chart_for_patient(patient_id: int, chart_in: schemas.PerioChartCreate, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # B4: If teeth are submitted, silently drop any wisdom tooth entry that
    # was not included in the payload (pediatric patients won't have them).
    # The WISDOM_TEETH validator on ToothDataCreate already forces status="Missing"
    # for wisdom entries that *are* submitted, so we only need to handle absence here.
    if chart_in.teeth:
        submitted_numbers = {t.tooth_number for t in chart_in.teeth}
        # Remove wisdom teeth that were not explicitly included in the payload
        chart_in.teeth = [
            t for t in chart_in.teeth
            if t.tooth_number not in WISDOM_TEETH or t.tooth_number in submitted_numbers
        ]

    db_chart = crud.create_chart(db, patient_db_id=patient_id, chart_in=chart_in)
    
    # Map DB teeth to schema response
    teeth_responses = [crud.map_tooth_db_to_response(t) for t in db_chart.teeth_data]
    
    return schemas.PerioChartResponse(
        id=db_chart.id,
        patient_id=db_chart.patient_id,
        status=db_chart.status,
        notes=db_chart.notes,
        created_at=db_chart.created_at,
        teeth_data=teeth_responses
    )

@router.get("/patients/{patient_id}/charts/latest", response_model=Dict[str, Any])
def read_latest_chart_and_stats(patient_id: int, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    db_chart = crud.get_latest_chart_for_patient(db, patient_db_id=patient_id)
    if not db_chart:
        # Automatically create a default chart with 32 empty/normal teeth for new patients
        default_chart_in = schemas.PerioChartCreate(
            status="In Plan",
            notes="Initial periodontal chart created."
        )
        db_chart = crud.create_chart(db, patient_db_id=patient_id, chart_in=default_chart_in)

    
    teeth_responses = [crud.map_tooth_db_to_response(t) for t in db_chart.teeth_data]
    chart_response = schemas.PerioChartResponse(
        id=db_chart.id,
        patient_id=db_chart.patient_id,
        status=db_chart.status,
        notes=db_chart.notes,
        created_at=db_chart.created_at,
        teeth_data=teeth_responses
    )
    
    # Calculate stats
    perio_stats = stats.calculate_perio_stats(db_chart.teeth_data, treatment_status=db_patient.treatment_status)
    
    return {
        "chart": chart_response,
        "stats": perio_stats
    }

@router.get("/charts/{chart_id}", response_model=schemas.PerioChartResponse)
def read_chart(chart_id: int, db: Session = Depends(database.get_db)):
    db_chart = crud.get_chart(db, chart_id=chart_id)
    if not db_chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periodontal chart not found"
        )
    teeth_responses = [crud.map_tooth_db_to_response(t) for t in db_chart.teeth_data]
    return schemas.PerioChartResponse(
        id=db_chart.id,
        patient_id=db_chart.patient_id,
        status=db_chart.status,
        notes=db_chart.notes,
        created_at=db_chart.created_at,
        teeth_data=teeth_responses
    )

@router.post("/charts/{chart_id}/teeth/{tooth_num}", response_model=schemas.ToothDataResponse)
def update_chart_tooth(chart_id: int, tooth_num: int, tooth_schema: schemas.ToothDataCreate, db: Session = Depends(database.get_db)):
    db_chart = crud.get_chart(db, chart_id=chart_id)
    if not db_chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periodontal chart not found"
        )
    
    # Validate FDI tooth number
    valid_fdi_teeth = set([
        18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
        48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
    ])
    if tooth_num not in valid_fdi_teeth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tooth number: {tooth_num}. Must be in FDI notation."
        )

    # B4: Wisdom teeth submitted by pediatric patients are silently forced
    # to status="Missing" by the ToothDataCreate model_validator before
    # reaching this endpoint — no additional handling needed here.

    updated_tooth = crud.update_tooth_data(db, chart_id=chart_id, tooth_number=tooth_num, tooth_schema=tooth_schema)
    return crud.map_tooth_db_to_response(updated_tooth)

@router.get("/charts/{chart_id}/stats", response_model=schemas.PerioStats)
def read_chart_stats(chart_id: int, db: Session = Depends(database.get_db)):
    db_chart = crud.get_chart(db, chart_id=chart_id)
    if not db_chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periodontal chart not found"
        )
    
    db_patient = crud.get_patient(db, db_chart.patient_id)
    treatment_status = db_patient.treatment_status if db_patient else "In Plan"
    
    return stats.calculate_perio_stats(db_chart.teeth_data, treatment_status=treatment_status)

@router.post("/charts/{chart_id}/ai-analysis", response_model=schemas.AIAnalysisResponse)
def run_ai_analysis(chart_id: int, db: Session = Depends(database.get_db)):
    db_chart = crud.get_chart(db, chart_id=chart_id)
    if not db_chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periodontal chart not found"
        )
    
    db_patient = crud.get_patient(db, db_chart.patient_id)
    treatment_status = db_patient.treatment_status if db_patient else "In Plan"
    
    # Calculate stats to base AI analysis on
    p_stats = stats.calculate_perio_stats(db_chart.teeth_data, treatment_status=treatment_status)
    
    # Dynamic logic based on stats
    key_findings = []
    recommended_treatment_plan = []
    
    if p_stats.missing_teeth > 0:
        key_findings.append(f"Patient exhibits {p_stats.missing_teeth} missing teeth (extracted or unerupted).")
    
    if p_stats.bleeding_sites_percentage > 30:
        key_findings.append(f"Severe generalized gingival inflammation indicated by bleeding on probing (BOP) at {p_stats.bleeding_sites_percentage}% of sites.")
        recommended_treatment_plan.append("Antiseptic mouthwash (e.g. Chlorhexidine 0.12%) twice daily for 2 weeks.")
    elif p_stats.bleeding_sites_percentage > 10:
        key_findings.append(f"Localized mild-to-moderate gingival inflammation indicated by BOP at {p_stats.bleeding_sites_percentage}% of sites.")
        recommended_treatment_plan.append("Targeted oral hygiene instructions highlighting bleeding areas.")
    
    # Deep pockets analysis
    if p_stats.deep_pockets_count > 20:
        severity_level = "Severe"
        diagnosis_summary = "Severe Generalized Stage III/IV Periodontitis with active inflammatory sites."
        risk_assessment = "HIGH. High risk of progressive alveolar bone loss and tooth mobility/loss if left untreated."
        key_findings.append(f"Significant bone loss risk: {p_stats.deep_pockets_count} pathological pocket depths >= 6mm identified.")
        recommended_treatment_plan.append("Full mouth Scaling and Root Planing (SRP) split into quadrants.")
        recommended_treatment_plan.append("Systemic antibiotics evaluation (e.g. Amoxicillin + Metronidazole).")
        recommended_treatment_plan.append("Re-evaluation in 4-6 weeks to identify sites for surgical pocket reduction.")
    elif p_stats.deep_pockets_count > 5:
        severity_level = "Moderate"
        diagnosis_summary = "Moderate Localized Stage II Periodontitis."
        risk_assessment = "MODERATE. Moderate risk of progression. Needs active periodontal intervention."
        key_findings.append(f"Moderate periodontal breakdown: {p_stats.deep_pockets_count} pocket depths >= 6mm identified.")
        recommended_treatment_plan.append("Scaling and Root Planing (SRP) of affected quadrants.")
        recommended_treatment_plan.append("3-month periodontal maintenance intervals.")
    else:
        if p_stats.bleeding_sites_percentage > 10:
            severity_level = "Mild"
            diagnosis_summary = "Gingivitis with localized early-stage attachment loss."
            risk_assessment = "LOW. Reversible condition with proper professional prophylaxis and patient compliance."
        else:
            severity_level = "Healthy"
            diagnosis_summary = "Healthy periodontal tissue."
            risk_assessment = "MINIMAL. Low risk. Continue regular cleanings."
            recommended_treatment_plan.append("Routine prophylaxis every 6 months.")

    if p_stats.mobility_cases_count > 0:
        key_findings.append(f"Mobility grade >= 1 noted on {p_stats.mobility_cases_count} teeth, suggesting compromised periodontal ligament support.")
        recommended_treatment_plan.append("Occlusal analysis and adjustment or splinting if secondary trauma is present.")
        
    if p_stats.furcation_cases_count > 0:
        key_findings.append(f"Furcation involvement (Grade >= 1) detected on {p_stats.furcation_cases_count} multi-rooted teeth.")
        recommended_treatment_plan.append("Use of specialized interdental aids (e.g. proxy brushes) to keep furcation areas clean.")

    # General recommendations
    recommended_treatment_plan.append("Strict oral hygiene instructions: modified Bass brushing technique, daily flossing.")
    recommended_treatment_plan.append("Smoking cessation counseling (if applicable).")
    
    return schemas.AIAnalysisResponse(
        analysis_timestamp=datetime.now(timezone.utc),
        diagnosis_summary=diagnosis_summary,
        severity_level=severity_level,
        risk_assessment=risk_assessment,
        recommended_treatment_plan=recommended_treatment_plan,
        key_findings=key_findings
    )
