#!/usr/bin/env python3
"""
AI Coaching Service - FastAPI HTTP Service for Queue Processing

This service receives coaching analysis requests from Cloudflare Workers queue
and processes them using the Gemini AI-powered mistake detection and drill generation.

To run:
    uvicorn coaching_service:app --host 0.0.0.0 --port 8000

Or with auto-reload during development:
    uvicorn coaching_service:app --reload --port 8000
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# Import our AI modules
from detect_mistakes import MistakeDetector
from training_drills_ai import TrainingDrillGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Coaching Service",
    description="Gemini-powered football coaching analysis and training drill generation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI components
try:
    mistake_detector = MistakeDetector()
    drill_generator = TrainingDrillGenerator()
    logger.info("✅ AI components initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize AI components: {e}")
    logger.error("Make sure GEMINI_API_KEY environment variable is set!")
    mistake_detector = None
    drill_generator = None

# Environment variables
CLOUDFLARE_KV_API = os.getenv('CLOUDFLARE_KV_API_URL')
CLOUDFLARE_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')


# ===== REQUEST MODELS =====

class AnalyzeMistakesRequest(BaseModel):
    """Request body for mistake analysis"""
    job_id: str
    video_id: str
    tenant: str
    team_name: str
    opponent_name: str
    context: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None  # R2 URL or local path
    r2_key: Optional[str] = None


class GenerateDrillsRequest(BaseModel):
    """Request body for drill generation"""
    job_id: str
    tenant: str
    mistake_data: list
    num_drills: int = 3
    age_group: str = "Adult"
    skill_level: str = "Intermediate"


class GenerateSessionRequest(BaseModel):
    """Request body for session generation"""
    job_id: str
    tenant: str
    mistakes: list
    session_duration: int = 60
    age_group: str = "Adult"
    skill_level: str = "Intermediate"
    focus_categories: Optional[list] = None


# ===== HELPER FUNCTIONS =====

async def update_job_status(
    job_key: str,
    status: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
):
    """Update job status in Cloudflare KV"""
    if not CLOUDFLARE_KV_API or not CLOUDFLARE_API_TOKEN:
        logger.warning("Cloudflare KV not configured, skipping status update")
        return

    try:
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{CLOUDFLARE_KV_API}/{job_key}",
                headers={"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"},
                json={
                    "status": status,
                    "result": result,
                    "error": error,
                    "updated_at": json.dumps({"timestamp": "now"})
                }
            )
            logger.info(f"✅ Updated job {job_key}: {status}")
    except Exception as e:
        logger.error(f"❌ Failed to update job status: {e}")


async def save_mistakes_to_kv(
    tenant: str,
    video_id: str,
    mistakes_data: Dict[str, Any]
):
    """Save detected mistakes to Cloudflare KV"""
    if not CLOUDFLARE_KV_API or not CLOUDFLARE_API_TOKEN:
        logger.warning("Cloudflare KV not configured, saving to local file")
        # Fallback: save to local file
        output_file = f"mistakes_{tenant}_{video_id}.json"
        with open(output_file, 'w') as f:
            json.dump(mistakes_data, f, indent=2)
        logger.info(f"💾 Saved mistakes to {output_file}")
        return

    try:
        mistakes_key = f"mistakes:{tenant}:{video_id}"
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{CLOUDFLARE_KV_API}/{mistakes_key}",
                headers={"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"},
                json=mistakes_data
            )
            logger.info(f"✅ Saved mistakes to KV: {mistakes_key}")
    except Exception as e:
        logger.error(f"❌ Failed to save mistakes to KV: {e}")


# ===== BACKGROUND TASKS =====

async def process_mistake_analysis(request: AnalyzeMistakesRequest):
    """Background task to analyze video for mistakes"""
    job_key = f"coaching_job:{request.tenant}:{request.job_id}"

    try:
        logger.info(f"🔍 Starting mistake analysis for video {request.video_id}")

        # Update status to processing
        await update_job_status(job_key, "processing")

        # Analyze video
        mistakes = mistake_detector.analyze_video(
            video_path=request.video_url or f"videos/{request.tenant}/{request.video_id}.mp4",
            team_name=request.team_name,
            opponent_name=request.opponent_name,
            context=request.context
        )

        # Prepare results
        mistakes_data = {
            "video_id": request.video_id,
            "analyzed_at": json.dumps({"timestamp": "now"}),
            "total_mistakes": len(mistakes),
            "categories": mistake_detector._summarize_categories(mistakes),
            "mistakes": mistakes
        }

        # Save to KV
        await save_mistakes_to_kv(request.tenant, request.video_id, mistakes_data)

        # Update job status to completed
        await update_job_status(job_key, "completed", result=mistakes_data)

        logger.info(f"✅ Mistake analysis completed: found {len(mistakes)} coaching opportunities")

    except Exception as e:
        logger.error(f"❌ Mistake analysis failed: {e}", exc_info=True)
        await update_job_status(job_key, "failed", error=str(e))


async def process_drill_generation(request: GenerateDrillsRequest):
    """Background task to generate training drills"""
    job_key = f"drill_job:{request.tenant}:{request.job_id}"

    try:
        logger.info(f"🎯 Starting drill generation for {len(request.mistake_data)} mistakes")

        # Update status to processing
        await update_job_status(job_key, "processing")

        # Generate drills for each mistake
        all_drills = []
        for mistake in request.mistake_data:
            drills = drill_generator.generate_drills_from_mistake(
                mistake,
                num_drills=request.num_drills,
                age_group=request.age_group,
                skill_level=request.skill_level
            )
            all_drills.append(drills)

        # Update job status to completed
        await update_job_status(job_key, "completed", result={"drills": all_drills})

        logger.info(f"✅ Drill generation completed: generated {len(all_drills)} drill sets")

    except Exception as e:
        logger.error(f"❌ Drill generation failed: {e}", exc_info=True)
        await update_job_status(job_key, "failed", error=str(e))


async def process_session_generation(request: GenerateSessionRequest):
    """Background task to generate training session"""
    job_key = f"session_job:{request.tenant}:{request.job_id}"

    try:
        logger.info(f"📋 Starting session generation for {len(request.mistakes)} mistakes")

        # Update status to processing
        await update_job_status(job_key, "processing")

        # Generate session
        session = drill_generator.generate_session_from_mistakes(
            request.mistakes,
            session_duration=request.session_duration,
            age_group=request.age_group,
            skill_level=request.skill_level,
            focus_categories=request.focus_categories
        )

        # Update job status to completed
        await update_job_status(job_key, "completed", result=session)

        logger.info(f"✅ Session generation completed: {session.get('session_title', 'N/A')}")

    except Exception as e:
        logger.error(f"❌ Session generation failed: {e}", exc_info=True)
        await update_job_status(job_key, "failed", error=str(e))


# ===== API ENDPOINTS =====

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Coaching Service",
        "status": "running",
        "ai_ready": mistake_detector is not None and drill_generator is not None,
        "gemini_key_set": os.getenv('GEMINI_API_KEY') is not None
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "mistake_detector": mistake_detector is not None,
            "drill_generator": drill_generator is not None,
            "gemini_api_key": os.getenv('GEMINI_API_KEY') is not None,
            "cloudflare_kv": CLOUDFLARE_KV_API is not None
        }
    }


@app.post("/analyze-mistakes")
async def analyze_mistakes(
    request: AnalyzeMistakesRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze video for coaching opportunities (mistakes)

    This endpoint queues the analysis as a background task and returns immediately.
    """
    if mistake_detector is None:
        raise HTTPException(
            status_code=503,
            detail="AI components not initialized. Check GEMINI_API_KEY."
        )

    # Queue background task
    background_tasks.add_task(process_mistake_analysis, request)

    return {
        "success": True,
        "message": "Mistake analysis started",
        "job_id": request.job_id
    }


@app.post("/generate-drills")
async def generate_drills(
    request: GenerateDrillsRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate training drills from mistakes

    This endpoint queues the generation as a background task and returns immediately.
    """
    if drill_generator is None:
        raise HTTPException(
            status_code=503,
            detail="AI components not initialized. Check GEMINI_API_KEY."
        )

    # Queue background task
    background_tasks.add_task(process_drill_generation, request)

    return {
        "success": True,
        "message": "Drill generation started",
        "job_id": request.job_id
    }


@app.post("/generate-session")
async def generate_session(
    request: GenerateSessionRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate complete training session from mistakes

    This endpoint queues the generation as a background task and returns immediately.
    """
    if drill_generator is None:
        raise HTTPException(
            status_code=503,
            detail="AI components not initialized. Check GEMINI_API_KEY."
        )

    # Queue background task
    background_tasks.add_task(process_session_generation, request)

    return {
        "success": True,
        "message": "Session generation started",
        "job_id": request.job_id
    }


# ===== MAIN =====

if __name__ == "__main__":
    import uvicorn

    # Check if Gemini API key is set
    if not os.getenv('GEMINI_API_KEY'):
        logger.error("❌ GEMINI_API_KEY environment variable not set!")
        logger.error("   Get your free API key at: https://aistudio.google.com/apikey")
        exit(1)

    logger.info("🚀 Starting AI Coaching Service...")
    logger.info("📊 Endpoints:")
    logger.info("   GET  /          - Health check")
    logger.info("   GET  /health    - Detailed health")
    logger.info("   POST /analyze-mistakes - Analyze video for mistakes")
    logger.info("   POST /generate-drills  - Generate training drills")
    logger.info("   POST /generate-session - Generate training session")

    uvicorn.run(
        "coaching_service:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (dev mode)
        log_level="info"
    )
