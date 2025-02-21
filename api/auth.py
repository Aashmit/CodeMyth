# api/auth.py
import os
import httpx
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Try multiple potential locations for .env file
potential_paths = [
    Path(__file__).resolve().parent / ".env",           # Same directory as auth.py
    Path(__file__).resolve().parent.parent / ".env",    # Parent directory of auth.py
    Path.cwd() / ".env",                                # Current working directory
]

env_loaded = False
for env_path in potential_paths:
    if env_path.exists():
        logger.info(f"Loading environment from: {env_path}")
        load_dotenv(dotenv_path=env_path)
        env_loaded = True
        break

if not env_loaded:
    logger.error("No .env file found in any of the expected locations")
    # Continue execution, we'll handle missing env vars in the endpoints

# Get environment variables
GITHUB_CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:3000/auth/callback")

# Log environment variable status (without exposing secrets)
logger.info(f"CLIENT_ID present: {GITHUB_CLIENT_ID is not None}")
logger.info(f"CLIENT_SECRET present: {CLIENT_SECRET is not None}")
logger.info(f"REDIRECT_URI: {REDIRECT_URI}")

GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

@router.get("/auth/github", response_model=dict)
async def github_login(request: Request):
    try:
        if not GITHUB_CLIENT_ID:
            logger.error("GitHub CLIENT_ID is missing")
            return JSONResponse(
                status_code=500,
                content={"detail": "GitHub CLIENT_ID is missing. Check your .env file."}
            )
        
        auth_url = f"{GITHUB_OAUTH_URL}?client_id={GITHUB_CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope=user"
        logger.info(f"Generated auth URL: {auth_url}")
        return {"auth_url": auth_url}
    
    except Exception as e:
        logger.error(f"Unexpected error in github_login: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Server error: {str(e)}"}
        )

@router.get("/auth/github/callback")
async def github_callback(code: str):
    try:
        if not GITHUB_CLIENT_ID or not CLIENT_SECRET:
            logger.error("GitHub credentials missing")
            return JSONResponse(
                status_code=500,
                content={"detail": "GitHub credentials are missing. Check your .env file."}
            )

        # Exchange code for access token
        logger.info(f"Exchanging code for access token")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GITHUB_TOKEN_URL,
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": REDIRECT_URI
                },
                headers={"Accept": "application/json"},
            )
            
        logger.info(f"Token response status: {response.status_code}")
        token_data = response.json()
        
        if "access_token" not in token_data:
            logger.error(f"Failed to fetch access token: {token_data}")
            return JSONResponse(
                status_code=400,
                content={"detail": f"Failed to fetch access token: {token_data.get('error_description', 'Unknown error')}"}
            )

        access_token = token_data["access_token"]
        logger.info("Successfully obtained access token")

        # Fetch user details
        logger.info("Fetching user details from GitHub API")
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                GITHUB_USER_URL, 
                headers={"Authorization": f"Bearer {access_token}"}
            )

        user_data = user_response.json()
        logger.info(f"Successfully retrieved user data for: {user_data.get('login', 'unknown')}")
        
        return {"access_token": access_token, "user": user_data}
    
    except Exception as e:
        logger.error(f"Unexpected error in github_callback: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Server error: {str(e)}"}
        )
    
# api/auth.py (add this to your existing file)

@router.get("/github/repos")
async def get_user_repos(access_token: str):
    """
    Fetch repositories for the authenticated user.
    
    Args:
        access_token: GitHub OAuth access token
        
    Returns:
        List of repositories
    """
    try:
        if not access_token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Access token is required"}
            )
            
        # GitHub API endpoint for user repositories
        repos_url = "https://api.github.com/user/repos"
        
        # Parameters to customize the response
        params = {
            "sort": "updated",       # Sort by last updated
            "per_page": 100,         # Get up to 100 repos per page
            "affiliation": "owner"   # Only get repos owned by the user
        }
        
        logger.info("Fetching repositories from GitHub API")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                repos_url,
                params=params,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
        
        # Check if request was successful
        if response.status_code != 200:
            logger.error(f"GitHub API error: {response.status_code}, {response.text}")
            return JSONResponse(
                status_code=response.status_code,
                content={"detail": f"GitHub API error: {response.json().get('message', 'Unknown error')}"}
            )
        
        # Process the repositories to include only relevant data
        repos = response.json()
        simplified_repos = [
            {
                "id": repo["id"],
                "name": repo["name"],
                "full_name": repo["full_name"],
                "html_url": repo["html_url"],
                "description": repo["description"],
                "language": repo["language"],
                "stargazers_count": repo["stargazers_count"],
                "forks_count": repo["forks_count"],
                "updated_at": repo["updated_at"],
                "created_at": repo["created_at"],
                "visibility": repo.get("visibility", "public"),
                "default_branch": repo["default_branch"],
                "is_private": repo["private"]
            }
            for repo in repos
        ]
        
        logger.info(f"Successfully retrieved {len(simplified_repos)} repositories")
        return {"repositories": simplified_repos}
    
    except Exception as e:
        logger.error(f"Unexpected error in get_user_repos: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Server error: {str(e)}"}
        )