#api/fetch.py
import httpx
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()

GITHUB_API_BASE = "https://api.github.com"

CODE_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rb", ".php", ".cpp", ".c", ".cs"}

def is_code_file(filename: str) -> bool:
    return any(filename.endswith(ext) for ext in CODE_EXTENSIONS)

async def fetch_file_content(client: httpx.AsyncClient, owner: str, repo: str, path: str, access_token: str):
    """Fetch raw content of a single file from GitHub."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3.raw"}

    response = await client.get(url, headers=headers)
    if response.status_code != 200:
        logger.error(f"Failed to fetch file {path}: {response.text}")
        return None

    return {"path": path, "content": response.text}

@router.get("/github/repo/{owner}/{repo}/files")
async def get_repository_code_files(owner: str, repo: str, branch: str = "main", access_token: str = ""):
    """
    Retrieve code-related files from the repository without cloning.
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="Access token required.")

    tree_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"}

    async with httpx.AsyncClient() as client:
        tree_response = await client.get(tree_url, headers=headers)
        if tree_response.status_code != 200:
            logger.error(f"Failed to fetch repo tree: {tree_response.text}")
            raise HTTPException(status_code=tree_response.status_code, detail="Failed to fetch repository tree.")

        tree_data = tree_response.json()
        code_files = [item["path"] for item in tree_data.get("tree", []) if item["type"] == "blob" and is_code_file(item["path"])]

        # Fetch file contents asynchronously
        tasks = [fetch_file_content(client, owner, repo, file_path, access_token) for file_path in code_files]
        file_contents = await asyncio.gather(*tasks)

        # Filter out None results
        valid_files = [file for file in file_contents if file is not None]

    logger.info(f"Fetched {len(valid_files)} code files from {repo}.")
    return {"files": valid_files}
