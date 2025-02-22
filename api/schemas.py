from pydantic import BaseModel, Field
from typing import Optional


class FeedbackResponse(BaseModel):
    filename: str = Field(..., description="Name of the file")
    documentation: str = Field(..., description="Refined documentation based on feedback")
    chunk_id: Optional[int] = Field(None, description="Chunk identifier if applicable")

class FeedbackInput(BaseModel):
    filename: str = Field(..., description="Name of the file to provide feedback on")
    feedback: str = Field(..., description="Feedback to improve documentation")
    original_content: str = Field(..., description="Original file content")
    chunk_id: Optional[int] = Field(None, description="Optional chunk identifier for large files")