from typing import List
from app import models, schemas

def calculate_perio_stats(teeth: List[models.ToothData], treatment_status: str = "In Plan") -> schemas.PerioStats:
    total_teeth = 32
    missing_count = 0
    active_teeth_count = 0
    
    bleeding_sites_count = 0
    total_pd_sum = 0
    total_measured_sites = 0
    deep_pockets_count = 0
    mobility_cases_count = 0
    furcation_cases_count = 0

    sites = ["db", "b", "mb", "dl", "l", "ml"]

    for tooth in teeth:
        if tooth.status == "Missing":
            missing_count += 1
            continue
        
        active_teeth_count += 1

        # Check mobility & furcation
        if tooth.mobility >= 1:
            mobility_cases_count += 1
        if tooth.furcation >= 1:
            furcation_cases_count += 1

        # Process sites
        for site in sites:
            # Pocket Depth (PD)
            pd_val = getattr(tooth, f"pd_{site}", 0)
            total_pd_sum += pd_val
            total_measured_sites += 1
            
            if pd_val >= 6:
                deep_pockets_count += 1
                
            # Bleeding on Probing (BOP)
            bop_val = getattr(tooth, f"bop_{site}", False)
            if bop_val:
                bleeding_sites_count += 1

    # Safe divisions
    if total_measured_sites > 0:
        bleeding_sites_percentage = round((bleeding_sites_count / total_measured_sites) * 100, 1)
        avg_pocket_depth = round(total_pd_sum / total_measured_sites, 1)
    else:
        bleeding_sites_percentage = 0.0
        avg_pocket_depth = 0.0

    return schemas.PerioStats(
        total_teeth=total_teeth,
        missing_teeth=missing_count,
        bleeding_sites_count=bleeding_sites_count,
        bleeding_sites_percentage=bleeding_sites_percentage,
        avg_pocket_depth=avg_pocket_depth,
        deep_pockets_count=deep_pockets_count,
        mobility_cases_count=mobility_cases_count,
        furcation_cases_count=furcation_cases_count,
        treatment_status=treatment_status
    )
