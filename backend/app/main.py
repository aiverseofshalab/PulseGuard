import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.database.session import Base, engine, SessionLocal
from backend.app.database.seed import seed_demo_data_if_empty
from backend.app.api.v1.router import api_router
from backend.app.ml.inference.infer import inference_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pulseguard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Seed initial demo assets
    with SessionLocal() as db:
        seed_demo_data_if_empty(db)

    # Warmup and report ML inference status
    logger.info(
        f"Deep Learning Pipeline Ready: CAE Model={inference_service.is_model_ready}, "
        f"kNN Reference Bank={inference_service.is_knn_ready}, "
        f"Device={inference_service.device}"
    )

    yield
    logger.info("PulseGuard API shutting down cleanly.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Deep Learning-Based Industrial Machine Acoustic Anomaly Detection and Predictive Maintenance Support System with Software IoT Simulation.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "status": "operational",
        "api_docs": "/docs",
        "hardware_dependency": "None (100% Software-Based Industrial Simulation)",
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "model_loaded": inference_service.is_model_ready,
        "knn_loaded": inference_service.is_knn_ready,
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. The incident has been logged."},
    )

