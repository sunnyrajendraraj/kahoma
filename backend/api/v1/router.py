"""
API v1 Router.
Aggregates all route modules.
"""

import logging

from fastapi import APIRouter

from api.v1.chunks import router as chunks_router
from api.v1.sessions import router as sessions_router
from api.v1.books import router as books_router
from api.v1.processing import router as processing_router

logger = logging.getLogger(__name__)

router = APIRouter()

# Include all sub-routers
router.include_router(chunks_router, prefix="/chunks", tags=["Chunks"])
router.include_router(sessions_router, prefix="/sessions", tags=["Sessions"])
router.include_router(books_router, tags=["Books"])
router.include_router(processing_router, tags=["Processing"])
