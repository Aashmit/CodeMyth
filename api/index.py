# api/index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import router as auth_router
from .fetch import router as fetch_router

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

# Enable CORS for Next.js (http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router, prefix="/api/py")
app.include_router(fetch_router, prefix="/api/py")