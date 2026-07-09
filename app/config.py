from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./dental_clinic.db"
    app_name: str = "Lumen Dental Periodontal Charting Backend"
    app_description: str = "FHIR R4 and ABDM Compliant Periodontal Charting backend for clinical records."
    app_version: str = "1.0.0"
    debug: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
