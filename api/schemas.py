from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class FeedbackInput(BaseModel):
    documentation_id: str = Field(..., description="ID of the documentation to refine")
    feedback: str = Field(..., description="User's feedback to refine the documentation")

# Response model for feedback refinement
class FeedbackResponse(BaseModel):
    response: str
    updated_docs: str
    diff: Optional[str] = None

class DocumentationResponse(BaseModel):
    documentation_id: str = Field(..., description="Unique ID for the generated documentation")
    documentation: str = Field(..., description="Generated unified documentation in Markdown")

class FileInput(BaseModel):
    files: List[Dict[str, str]]

class AcceptChangesInput(BaseModel):
    documentation_id: str = Field(..., description="ID of the documentation to accept")
    repo_owner: str = Field(..., description="GitHub repository owner (e.g., 'yourusername')")
    repo_name: str = Field(..., description="GitHub repository name (e.g., 'yourrepo')")
    github_token: str = Field(..., description="GitHub Personal Access Token from the frontend")
    branch: str = Field(default="main", description="Target branch (default: 'main')")
    file_path: str = Field(default="developer_documentation.md", description="Path in repo to save the file")

class GroqInput(BaseModel):
    files: List[Dict[str, str]] = Field(..., description="List of files with 'path' and 'content' for batch processing")
    groq_api_key: str = Field(..., description="User-provided Groq API key")
    model_name: str = Field(default="mixtral-8x7b-32768", description="Groq model name, defaults to mixtral-8x7b-32768")
