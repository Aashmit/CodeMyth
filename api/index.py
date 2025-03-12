# api/index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import router as auth_router
from .fetch import router as fetch_router
from .generate import router as generate_router
from .generate_groq import router as groq_router  # New Groq router

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/py")
app.include_router(fetch_router, prefix="/api/py")
app.include_router(generate_router, prefix="/api/py")
app.include_router(groq_router, prefix="/api/py")  # Add Groq router

@app.get("/api/py")
def read_root():
    return {"Hello": "World"}