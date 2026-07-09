from fastapi import Request
from app.database import SessionLocal
from app import crud


async def audit_logging_middleware(request: Request, call_next):
    response = await call_next(request)

    path = request.url.path
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
                user="Dr. Priya Sharma"
            )
        except Exception as e:
            print(f"Audit log writing failed: {e}")
        finally:
            db.close()

    return response
