import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analyze import router as analyze_router
from routers.profiles import router as profiles_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Readiness Analyzer", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    logger.info("AI Readiness Analyzer v0.1.0 starting up")
    logger.info("Supabase URL : %s", os.environ.get("SUPABASE_URL", "NOT SET"))
    logger.info("Azure endpoint: %s", os.environ.get("AZURE_OPENAI_ENDPOINT", "NOT SET"))
    logger.info("LLM deployment: %s", os.environ.get("AZURE_OPENAI_DEPLOYMENT", "NOT SET"))
    logger.info("Embedding dep. : %s", os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "NOT SET"))


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
