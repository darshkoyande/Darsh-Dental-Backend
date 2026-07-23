"""
seed_diagnoses.py — Idempotent seeder for the DiagnosisRecord lookup table.

Reads the embedded CSV data and bulk-inserts all rows into `diagnosis_records`.
Safe to call on every server startup — existing records are not duplicated.
"""

import csv
import io
from sqlalchemy.orm import Session
from app import models

# ── Embedded CSV data from dental_dataset_100_records.csv ──────────────────────
CSV_DATA = """Diagnosis,Treatment,Medicine
Dental Caries,Dental Filling,Ibuprofen
Deep Dental Caries,Root Canal Treatment,Ibuprofen
Pulpitis,Root Canal Treatment,Amoxicillin
Periapical Abscess,Root Canal Treatment and Antibiotics,Amoxicillin
Tooth Sensitivity,Fluoride Treatment,Potassium Nitrate Gel
Gingivitis,Scaling and Polishing,Chlorhexidine
Periodontitis,Deep Cleaning,Amoxicillin
Dental Plaque,Professional Cleaning,Chlorhexidine
Dental Calculus,Scaling,Chlorhexidine
Bad Breath,Oral Hygiene Therapy,Chlorhexidine
Tooth Fracture,Dental Crown,Ibuprofen
Cracked Tooth,Crown or Root Canal,Ibuprofen
Chipped Tooth,Dental Bonding,Ibuprofen
Broken Tooth,Crown,Ibuprofen
Missing Tooth,Dental Implant,None
Tooth Loss,Bridge or Implant,None
Impacted Wisdom Tooth,Surgical Extraction,Ibuprofen
Partially Erupted Wisdom Tooth,Extraction,Ibuprofen
Dry Socket,Medicated Dressing,Ibuprofen
Dental Infection,Antibiotic Therapy,Amoxicillin
Root Infection,Root Canal Treatment,Amoxicillin
Enamel Erosion,Fluoride Therapy,Fluoride Gel
Tooth Wear,Dental Restoration,None
Bruxism,Night Guard,None
TMJ Disorder,Mouth Guard Therapy,Ibuprofen
Malocclusion,Orthodontic Treatment,None
Crowded Teeth,Braces,None
Spacing Between Teeth,Aligners,None
Overbite,Orthodontic Treatment,None
Underbite,Orthodontic Treatment,None
Crossbite,Braces,None
Open Bite,Orthodontic Treatment,None
Tooth Discoloration,Teeth Whitening,None
Stained Teeth,Professional Cleaning,None
Fluorosis,Veneers,None
Hypodontia,Dental Implant,None
Supernumerary Teeth,Extraction,Ibuprofen
Oral Ulcer,Topical Treatment,Benzocaine
Mouth Infection,Medication,Amoxicillin
Oral Candidiasis,Antifungal Therapy,Nystatin
Gum Recession,Gum Grafting,Ibuprofen
Loose Tooth,Periodontal Treatment,Amoxicillin
Tooth Mobility,Splinting,Ibuprofen
Retained Deciduous Tooth,Extraction,Ibuprofen
Dental Trauma,Restorative Treatment,Ibuprofen
Avulsed Tooth,Reimplantation,Ibuprofen
Tooth Luxation,Repositioning and Splinting,Ibuprofen
Jaw Pain,TMJ Therapy,Ibuprofen
Oral Swelling,Medication,Amoxicillin
Denture Problems,Denture Adjustment,None
Pediatric Caries,Dental Filling,Ibuprofen
Early Caries,Fluoride Treatment,Fluoride Gel
Severe Gingivitis,Scaling and Root Planing,Chlorhexidine
Advanced Periodontitis,Periodontal Surgery,Amoxicillin
Gum Abscess,Drainage and Antibiotics,Amoxicillin
Toothache,Diagnosis and Restoration,Ibuprofen
Erupted Wisdom Tooth Pain,Extraction,Ibuprofen
Root Exposure,Desensitizing Treatment,Potassium Nitrate Gel
Molar Decay,Dental Filling,Ibuprofen
Premolar Decay,Dental Filling,Ibuprofen
Incisor Fracture,Composite Restoration,Ibuprofen
Canine Fracture,Crown,Ibuprofen
Orthodontic Relapse,Retainer Therapy,None
Dental Attrition,Restoration,None
Dental Abrasion,Composite Filling,None
Dental Erosion,Fluoride Therapy,Fluoride Gel
Pulp Necrosis,Root Canal Treatment,Amoxicillin
Acute Pulpitis,Root Canal Treatment,Ibuprofen
Chronic Pulpitis,Root Canal Treatment,Ibuprofen
Pericoronitis,Extraction and Antibiotics,Amoxicillin
Gingival Enlargement,Gingivectomy,Ibuprofen
Bleeding Gums,Scaling,Chlorhexidine
Oral Lesion,Biopsy and Evaluation,None
White Spot Lesion,Remineralization Therapy,Fluoride Gel
Black Triangle Teeth,Dental Bonding,None
Denture Stomatitis,Antifungal Therapy,Nystatin
Implant Failure,Implant Revision,Amoxicillin
Implant Infection,Antibiotic Therapy,Amoxicillin
Crown Failure,Crown Replacement,None
Bridge Failure,Bridge Replacement,None
Orthodontic Pain,Orthodontic Adjustment,Ibuprofen
Root Resorption,Endodontic Treatment,Ibuprofen
Tooth Ankylosis,Surgical Management,Ibuprofen
Impacted Canine,Orthodontic Exposure,None
Jaw Infection,Antibiotic Therapy,Amoxicillin
Oral Dryness,Saliva Substitute Therapy,Artificial Saliva
Burning Mouth Syndrome,Symptomatic Treatment,Clonazepam
Mouth Trauma,Restorative Care,Ibuprofen
Lip Ulcer,Topical Treatment,Benzocaine
Cheek Bite Injury,Protective Therapy,Benzocaine
Tongue Ulcer,Topical Treatment,Benzocaine
Oral Pain,Pain Management,Ibuprofen
Dental Anxiety,Behavioral Management,None
Plaque-Induced Gingivitis,Scaling,Chlorhexidine
Localized Periodontitis,Deep Cleaning,Amoxicillin
Generalized Periodontitis,Periodontal Therapy,Amoxicillin
Recurrent Caries,Replacement Filling,Ibuprofen
Failed Root Canal,Root Canal Retreatment,Amoxicillin
"""


def seed_diagnoses(db: Session) -> None:
    """
    Idempotently insert all CSV rows into the diagnosis_records table.
    Skips any diagnosis that already exists (by unique diagnosis name).
    """
    # Fetch existing diagnosis names to avoid duplicates
    existing = {
        row.diagnosis
        for row in db.query(models.DiagnosisRecord.diagnosis).all()
    }

    reader = csv.DictReader(io.StringIO(CSV_DATA.strip()))
    new_records = []

    for row in reader:
        diagnosis = row["Diagnosis"].strip()
        treatment = row["Treatment"].strip()
        medicine = row["Medicine"].strip()

        if not diagnosis or diagnosis in existing:
            continue

        # Normalize "None" string from CSV to actual None
        medicine_value = None if medicine.lower() == "none" else medicine

        new_records.append(
            models.DiagnosisRecord(
                diagnosis=diagnosis,
                treatment=treatment,
                medicine=medicine_value,
            )
        )
        existing.add(diagnosis)  # prevent intra-batch dupes

    if new_records:
        db.add_all(new_records)
        db.commit()
        print(f"[seed_diagnoses] Inserted {len(new_records)} diagnosis records.")
    else:
        print("[seed_diagnoses] All diagnosis records already present — skipping.")
