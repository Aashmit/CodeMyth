from pydantic import BaseModel, Field
from typing import Optional

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
