from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, SessionLocal
from app import models, crud
from app.routers import patients, charts, fhir, abdm, audits, schedule, imaging, reports

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lumen Dental Periodontal Charting Backend",
    description="FHIR R4 and ABDM Compliant Periodontal Charting backend for clinical records.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit Logging Middleware
@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    response = await call_next(request)
    
    path = request.url.path
    # Exclude Swagger/OpenAPI docs and audit logs themselves from spamming audit logs
    if path.startswith(("/patients", "/charts", "/fhir", "/abdm", "/schedule", "/imaging", "/reports")) and not path.endswith("docs"):
        db = SessionLocal()
        try:
            method = request.method
            action_map = {
                "GET": "READ",
                "POST": "CREATE",
                "PUT": "UPDATE",
                "PATCH": "UPDATE",
                "DELETE": "DELETE"
            }
            action = action_map.get(method, "ACCESS")
            
            resource_type = "API"
            if "/patients" in path:
                resource_type = "Patient"
            elif "/charts" in path:
                resource_type = "Chart"
            elif "/fhir" in path:
                resource_type = "FHIR_Resource"
            elif "/abdm" in path:
                resource_type = "ABDM_Exchange"
            elif "/schedule" in path:
                resource_type = "Appointment"
            elif "/imaging" in path:
                resource_type = "ImagingRecord"
            elif "/reports" in path:
                resource_type = "ClinicalReport"
            
            # Extract basic identifier from path if possible
            parts = path.strip("/").split("/")
            resource_id = parts[-1] if len(parts) > 1 else None

            client_ip = request.client.host if request.client else None
            
            crud.create_audit_log(
                db=db,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=f"{method} {path} - Response Status: {response.status_code}",
                client_ip=client_ip,
                user="Dr. Priya Sharma" # Mocked logged-in user
            )
        except Exception as e:
            # Prevent audit logging errors from disrupting application lifecycle
            print(f"Audit log writing failed: {e}")
        finally:
            db.close()
            
    return response

# Include Routers
app.include_router(patients.router)
app.include_router(charts.router)
app.include_router(schedule.router)
app.include_router(imaging.router)
app.include_router(reports.router)
app.include_router(fhir.router)
app.include_router(abdm.router)
app.include_router(audits.router)

from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

# Serve frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

@app.get("/")
async def read_root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read(), status_code=200)
    return {
        "status": "online",
        "standards": ["FHIR R4", "ABDM"]
    }

app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

