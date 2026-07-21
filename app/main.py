from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os
from app.config import settings
from app.database import engine
from app import models
from app.middleware import audit_logging_middleware
from app.routers import patients, charts, fhir, abdm, audits, schedule, imaging, reports, auth, chat, dentition
from app.database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    # Seed demo users idempotently on every startup
    db = SessionLocal()
    try:
        auth.seed_users(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(audit_logging_middleware)

app.include_router(patients.router)
app.include_router(charts.router)
app.include_router(schedule.router)
app.include_router(imaging.router)
app.include_router(reports.router)
app.include_router(fhir.router)
app.include_router(abdm.router)
app.include_router(audits.router)
app.include_router(auth.router)   # B1: Authentication
app.include_router(chat.router)   # B2/B3: Secure Chat & Notifications
app.include_router(dentition.router)  # Flexible dentition tracking

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")


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

