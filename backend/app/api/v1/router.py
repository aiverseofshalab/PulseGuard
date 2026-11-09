from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth,
    machines,
    analyses,
    telemetry,
    simulator,
    model_info,
    dashboard,
    reports,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(machines.router, prefix="/machines", tags=["Machines"])
api_router.include_router(analyses.router, prefix="/analyses", tags=["Audio Acoustic Analyses"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["IoT Telemetry & Ingestion"])
api_router.include_router(simulator.router, prefix="/simulator", tags=["Virtual IoT Simulator"])
api_router.include_router(model_info.router, prefix="/model", tags=["Deep Learning Model Specs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard Aggregates"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Export"])

