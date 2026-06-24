from app.database import SessionLocal, engine
from app import models, crud
import datetime

def seed_database():
    # Ensure tables are created first
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Clean existing database records
    db.query(models.ToothData).delete()
    db.query(models.PerioChart).delete()
    db.query(models.Patient).delete()
    db.query(models.AuditLog).delete()
    db.commit()
    
    print("Database cleaned.")

    # 2. Create Patient Aarav Mehta
    aarav = models.Patient(
        patient_id="PT-04821",
        name="Aarav Mehta",
        status="Active",
        abha_id="12-3456-7890-1234",
        age=47,
        gender="Male",
        primary_doctor="Dr. Priya Sharma, BDS, MDS (Perio)",
        last_visit="12 Mar 2026",
        next_visit="18 Jun 2026, 10:30 AM",
        treatment_status="In Plan"
    )
    db.add(aarav)
    db.commit()
    db.refresh(aarav)
    
    print(f"Patient Aarav Mehta created with DB ID {aarav.id}")

    # 3. Create Periodontal Chart
    chart = models.PerioChart(
        patient_id=aarav.id,
        status="In Plan",
        notes="Patient presents with generalized stage III/IV periodontitis. Heavy subgingival calculus and plaque deposits. Active bleeding on probing. SRP scheduled.",
        created_at=datetime.datetime(2026, 6, 12, 10, 30, 0)
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)

    # 4. Generate Teeth Data
    # Maxilla Teeth (18 to 11, 21 to 28)
    # Mandible Teeth (48 to 41, 31 to 38)
    
    # Missing teeth are 28 and 38
    
    # Exact Maxilla values mapped from screenshot (15 teeth, 90 sites)
    maxilla_data = {
        18: {
            "mobility": 1, "furcation": 0,
            "db": (6, 2, True), "b": (5, 2, False), "mb": (6, 3, True),
            "dl": (5, 0, False), "l": (6, 0, False), "ml": (8, 3, True)
        },
        17: {
            "mobility": 0, "furcation": 3,
            "db": (3, 0, False), "b": (4, 0, False), "mb": (3, 1, False),
            "dl": (5, 0, False), "l": (5, 0, False), "ml": (6, 1, False)
        },
        16: {
            "mobility": 1, "furcation": 3,
            "db": (5, 0, True), "b": (5, 0, True), "mb": (4, 0, False),
            "dl": (4, 0, True), "l": (5, 0, True), "ml": (9, 0, True)
        },
        15: {
            "mobility": 0, "furcation": 0,
            "db": (4, 0, True), "b": (5, 0, False), "mb": (8, 0, True),
            "dl": (4, 0, True), "l": (9, 0, True), "ml": (4, 0, False)
        },
        14: {
            "mobility": 0, "furcation": 0,
            "db": (5, 0, True), "b": (5, 0, False), "mb": (6, 1, True),
            "dl": (5, 0, False), "l": (7, 0, True), "ml": (10, 0, False)
        },
        13: {
            "mobility": 0, "furcation": 0,
            "db": (4, 0, False), "b": (4, 0, False), "mb": (2, 2, False),
            "dl": (5, 2, True), "l": (5, 2, False), "ml": (2, 2, False)
        },
        12: {
            "mobility": 0, "furcation": 0,
            "db": (5, 0, False), "b": (2, 0, False), "mb": (4, 0, False),
            "dl": (4, 0, False), "l": (3, 0, False), "ml": (2, 0, False)
        },
        11: {
            "mobility": 0, "furcation": 0,
            "db": (3, 0, False), "b": (3, 0, False), "mb": (7, 3, True),
            "dl": (3, 0, False), "l": (2, 0, False), "ml": (2, 0, False)
        },
        21: {
            "mobility": 0, "furcation": 0,
            "db": (5, 0, True), "b": (3, 0, False), "mb": (4, 0, False),
            "dl": (5, 0, True), "l": (5, 0, False), "ml": (8, 0, True)
        },
        22: {
            "mobility": 0, "furcation": 0,
            "db": (4, 1, True), "b": (3, 1, False), "mb": (2, 0, False),
            "dl": (3, 0, False), "l": (5, 0, False), "ml": (4, 1, False)
        },
        23: {
            "mobility": 0, "furcation": 0,
            "db": (4, 0, True), "b": (3, 0, False), "mb": (8, 2, True),
            "dl": (3, 0, False), "l": (2, 0, False), "ml": (3, 0, False)
        },
        24: {
            "mobility": 0, "furcation": 0,
            "db": (7, 1, True), "b": (10, 2, True), "mb": (6, 0, False),
            "dl": (4, 0, False), "l": (4, 0, False), "ml": (4, 0, False)
        },
        25: {
            "mobility": 0, "furcation": 0,
            "db": (4, 0, False), "b": (4, 0, False), "mb": (5, 0, False),
            "dl": (3, 0, False), "l": (5, 0, False), "ml": (5, 0, False)
        },
        26: {
            "mobility": 0, "furcation": 0,
            "db": (5, 0, True), "b": (6, 2, True), "mb": (5, 0, False),
            "dl": (5, 0, False), "l": (9, 2, True), "ml": (9, 2, True)
        },
        27: {
            "mobility": 0, "furcation": 0,
            "db": (10, 2, True), "b": (3, 0, False), "mb": (3, 0, False),
            "dl": (9, 0, True), "l": (9, 0, True), "ml": (6, 0, False)
        }
    }

    # Add Maxilla Teeth
    # 18 to 27
    for t_num in range(11, 29):
        # Swap FDI notations order to match maxilla left-to-right (18 to 28)
        pass
        
    fdi_maxilla = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
    
    for tooth_num in fdi_maxilla:
        if tooth_num == 28:
            # Missing Tooth
            t_data = models.ToothData(
                chart_id=chart.id,
                tooth_number=tooth_num,
                status="Missing"
            )
            db.add(t_data)
        else:
            data = maxilla_data[tooth_num]
            t_data = models.ToothData(
                chart_id=chart.id,
                tooth_number=tooth_num,
                status="Normal",
                mobility=data["mobility"],
                furcation=data["furcation"],
                # Sites DB, B, MB, DL, L, ML
                pd_db=data["db"][0], gm_db=data["db"][1], cal_db=data["db"][0] + data["db"][1], bop_db=data["db"][2],
                pd_b=data["b"][0], gm_b=data["b"][1], cal_b=data["b"][0] + data["b"][1], bop_b=data["b"][2],
                pd_mb=data["mb"][0], gm_mb=data["mb"][1], cal_mb=data["mb"][0] + data["mb"][1], bop_mb=data["mb"][2],
                pd_dl=data["dl"][0], gm_dl=data["dl"][1], cal_dl=data["dl"][0] + data["dl"][1], bop_dl=data["dl"][2],
                pd_l=data["l"][0], gm_l=data["l"][1], cal_l=data["l"][0] + data["l"][1], bop_l=data["l"][2],
                pd_ml=data["ml"][0], gm_ml=data["ml"][1], cal_ml=data["ml"][0] + data["ml"][1], bop_ml=data["ml"][2]
            )
            db.add(t_data)

    print("Maxilla teeth seeded.")

    # Mandible Teeth (48 to 41, 31 to 38)
    # Active Mandible teeth: 15 teeth. Total sites: 90.
    # We need exactly 15 deep pockets (PD >= 6).
    # We need exactly 27 bleeding sites (BOP = True).
    # The sum of pocket depths in Mandible must be exactly 351.
    # Set mobility & furcation on 3 teeth each to reach 5 total cases (Maxilla has 2 mobility, 2 furcation)
    # Wait, Maxilla actually has:
    # Mobility: #18 (1), #16 (1) -> 2 cases
    # Furcation: #17 (3), #16 (3) -> 2 cases
    # Let's add 3 mobility cases and 3 furcation cases in Mandible:
    # Mobility: #46 (1), #36 (2), #31 (1)
    # Furcation: #46 (2), #47 (3), #36 (3)
    
    # We need:
    # 10 sites with PD = 6, 5 sites with PD = 7 (sum = 95)
    # 31 sites with PD = 4 (sum = 124)
    # 44 sites with PD = 3 (sum = 132)
    # Total Mandible sites = 10 + 5 + 31 + 44 = 90. Total sum = 95 + 124 + 132 = 351.
    
    # Let's prepare arrays of values and pop them to assign to sites.
    pd_pool = ([7] * 5) + ([6] * 10) + ([4] * 31) + ([3] * 44) # 90 values
    bop_pool = ([True] * 27) + ([False] * 63) # 90 values
    
    # Shuffle or systematically distribute to make it look realistic (deterministic pattern for reproducibility)
    # We will distribute them by iterating teeth and sites.
    # Let's seed them.
    fdi_mandible = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
    
    pool_idx = 0
    for tooth_num in fdi_mandible:
        if tooth_num == 38:
            # Missing Tooth
            t_data = models.ToothData(
                chart_id=chart.id,
                tooth_number=tooth_num,
                status="Missing"
            )
            db.add(t_data)
        else:
            # Check mobility & furcation assignments
            mob = 0
            if tooth_num in [46, 31]:
                mob = 1
            elif tooth_num == 36:
                mob = 2
                
            furc = 0
            if tooth_num == 46:
                furc = 2
            elif tooth_num in [47, 36]:
                furc = 3
                
            # Assign site data
            # We take 6 values from pools
            pd_vals = pd_pool[pool_idx : pool_idx + 6]
            bop_vals = bop_pool[pool_idx : pool_idx + 6]
            pool_idx += 6
            
            # Simple GM mock: GM is mostly 0, but sometimes 1 or 2
            gm_vals = [0, 0, 1, 0, 0, 0] # 6 values
            # If pocket depth is high, GM might be slightly higher
            for idx, pd in enumerate(pd_vals):
                if pd >= 6:
                    gm_vals[idx] = 1 if idx % 2 == 0 else 2
            
            t_data = models.ToothData(
                chart_id=chart.id,
                tooth_number=tooth_num,
                status="Normal",
                mobility=mob,
                furcation=furc,
                # DB
                pd_db=pd_vals[0], gm_db=gm_vals[0], cal_db=pd_vals[0] + gm_vals[0], bop_db=bop_vals[0],
                # B
                pd_b=pd_vals[1], gm_b=gm_vals[1], cal_b=pd_vals[1] + gm_vals[1], bop_b=bop_vals[1],
                # MB
                pd_mb=pd_vals[2], gm_mb=gm_vals[2], cal_mb=pd_vals[2] + gm_vals[2], bop_mb=bop_vals[2],
                # DL
                pd_dl=pd_vals[3], gm_dl=gm_vals[3], cal_dl=pd_vals[3] + gm_vals[3], bop_dl=bop_vals[3],
                # L
                pd_l=pd_vals[4], gm_l=gm_vals[4], cal_l=pd_vals[4] + gm_vals[4], bop_l=bop_vals[4],
                # ML
                pd_ml=pd_vals[5], gm_ml=gm_vals[5], cal_ml=pd_vals[5] + gm_vals[5], bop_ml=bop_vals[5]
            )
            db.add(t_data)
            
    db.commit()
    print("Mandible teeth seeded successfully.")

    # 5. Seed some Audit Logs
    crud.create_audit_log(
        db, action="CREATE", resource_type="Patient", resource_id="PT-04821",
        details="Patient Aarav Mehta registered.", client_ip="127.0.0.1"
    )
    crud.create_audit_log(
        db, action="CREATE", resource_type="Chart", resource_id=str(chart.id),
        details="Initial periodontal charting created.", client_ip="127.0.0.1"
    )
    crud.create_audit_log(
        db, action="ABDM_LINK", resource_type="Patient", resource_id="PT-04821",
        details="Linked patient PT-04821 to ABHA 12-3456-7890-1234", client_ip="127.0.0.1"
    )
    print("Audit logs seeded.")
    db.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
