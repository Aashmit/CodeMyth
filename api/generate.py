import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi import Body
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from .schemas import FeedbackInput, FeedbackResponse
import asyncio
import tiktoken
from typing import List, Dict
import json
import os
from dotenv import load_dotenv

load_dotenv()

parameters = {
    "decoding_method": "sample",
    "max_new_tokens": 1000,  # Adjust based on your needs
    "min_new_tokens": 1,
    "temperature": 0.5,
    "top_k": 50,
    "top_p": 1,
}

logger = logging.getLogger(__name__)
router = APIRouter()

# Define a Pydantic model for the request body
class FileInput(BaseModel):
    files: List[Dict[str, str]]

# Ollama model configuration (adjust based on your setup)
MODEL_NAME = "granite3.1-dense:8b"  # Replace with your Ollama-hosted model
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL')  # Default Ollama URL

llm = OllamaLLM(model=MODEL_NAME, base_url=OLLAMA_BASE_URL)
CODE_EXTENSIONS = {
    '.py', '.jsx', '.js','java', '.cpp', '.c', '.cs', '.ts', 
    '.rb', '.php', '.go', '.rs', '.swift', '.kt'
    # Add more extensions as needed
}
# Documentation template for consistency
DOC_TEMPLATE = """
### {filename}
#### Overview
{overview}

#### Details
{details}
"""

# Unified developer documentation template
UNIFIED_DOC_TEMPLATE = """
# Developer Documentation for {project_name}

## Introduction
This document provides a comprehensive overview and detailed documentation for the code files in the {project_name} project, focusing on functionality related to caching, vectorization, and language model interactions with GitHub repositories.

## Table of Contents
{table_of_contents}

## File Documentation
{file_documentation}
"""

# Prompt for generating documentation
DOC_PROMPT = PromptTemplate(
    input_variables=["code", "filename"],
    template="""
    You are a senior developer tasked with generating concise and accurate documentation for the following code file.
    Provide an overview of what the code does and detailed explanations of its key components (e.g., functions, classes).
    Use markdown formatting and include "#### Details" as a header to separate the overview from the detailed explanation.

    File: {filename}
    Code:
    ```{code}```
    """
)

# Initialize tiktoken for token counting (using a common encoding like cl100k_base)
tokenizer = tiktoken.get_encoding("cl100k_base")

# Max token limit for the LLM (adjust based on your model's capacity)
MAX_TOKENS = 4000

def is_code_file(filename: str) -> bool:
    """Check if the file has a code-related extension."""
    return any(filename.lower().endswith(ext) for ext in CODE_EXTENSIONS)

def chunk_code(content: str, filename: str, max_tokens: int = MAX_TOKENS) -> List[Dict[str, str]]:
    if not is_code_file(filename):
        return []
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_tokens,
        chunk_overlap=200,  # Overlap to preserve context
        length_function=lambda x: len(tokenizer.encode(x)),
    )
    chunks = text_splitter.split_text(content)
    return [{"path": filename, "content": chunk, "chunk_id": i} for i, chunk in enumerate(chunks)]

async def generate_doc_chunk(chunk: Dict[str, str]) -> str:
    """Generate documentation for a single chunk."""
    prompt = DOC_PROMPT.format(code=chunk["content"], filename=chunk["path"])
    response = await llm.agenerate([prompt])  # Async generation
    return response.generations[0][0].text

async def generate_full_documentation(files: List[Dict[str, str]]) -> List[Dict[str, str]]:
    docs = []
    for file in files:
        filename = file["path"]
        content = file["content"]
        
        if not is_code_file(filename):
            logger.info(f"Skipping non-code file: {filename}")
            continue

        token_count = len(tokenizer.encode(content))
        if token_count <= MAX_TOKENS:
            doc_content = await generate_doc_chunk(file)
            if "#### Details" in doc_content:
                parts = doc_content.split("#### Details")
                overview = parts[0].strip()
                details = "#### Details" + (parts[1] if len(parts) > 1 else "")
            else:
                logger.warning(f"No '#### Details' found in documentation for {filename}")
                overview = doc_content.strip()
                details = ""
            docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, overview=overview, details=details)})
        else:
            chunks = chunk_code(content, filename)
            if chunks:  # Only process if chunks exist (i.e., it's a code file)
                chunk_docs = await asyncio.gather(*(generate_doc_chunk(chunk) for chunk in chunks))
                overview = "This file is large and has been split into chunks. Below is a summary of each part.\n"
                details = "\n".join([f"#### Chunk {i}\n{doc}" for i, doc in enumerate(chunk_docs)])
                docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, overview=overview, details=details)})

    return docs

async def generate_unified_documentation(files: List[Dict[str, str]], project_name: str = "Redis_Cache") -> str:
    """Generate a unified developer documentation for all files."""
    # Generate individual documentation for each file
    individual_docs = await generate_full_documentation(files)
    
    # Create table of contents
    table_of_contents = "\n".join([f"- [{doc['filename']}](#{doc['filename'].replace('.', '-')})" for doc in individual_docs])
    
    # Combine individual documentation into a single markdown string
    file_documentation = "\n\n".join(doc["documentation"] for doc in individual_docs)
    
    # Generate unified documentation
    return UNIFIED_DOC_TEMPLATE.format(
        project_name=project_name,
        table_of_contents=table_of_contents,
        file_documentation=file_documentation
    )

@router.post("/generate-docs")
async def generate_documentation(data: FileInput = Body(...)):
    """Generate unified developer documentation for fetched GitHub files and return as a single JSON response."""
    files = data.files
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    # Generate unified documentation
    unified_docs = await generate_unified_documentation(files, project_name="Redis_Cache")
    return JSONResponse(content={"documentation": unified_docs})

@router.post(
    "/docs/feedback",
    response_model=FeedbackResponse,
    summary="Process feedback and refine documentation",
    description="Refines existing documentation for a specific file based on user feedback."
)
async def process_feedback(feedback: FeedbackInput):
    """Handle user feedback and regenerate specific sections."""
    if not is_code_file(feedback.filename):
        raise HTTPException(status_code=400, detail=f"File {feedback.filename} is not a supported code file type")

    try:
        # Refine prompt with feedback
        refined_prompt = PromptTemplate(
            input_variables=["code", "filename", "feedback"],
            template="""
            You previously generated documentation for this code...
            """
        )

        # Generate refined documentation
        prompt = refined_prompt.format(
            code=feedback.original_content,
            filename=feedback.filename,
            feedback=feedback.feedback
        )
        refined_doc = await llm.agenerate([prompt])
        doc_content = refined_doc.generations[0][0].text

        # Process documentation
        if "#### Details" in doc_content:
            parts = doc_content.split("#### Details")
            overview = parts[0].strip()
            details = "#### Details" + (parts[1] if len(parts) > 1 else "")
        else:
            logger.warning(f"No '#### Details' found in refined documentation for {feedback.filename}")
            overview = doc_content.strip()
            details = ""

        documentation = DOC_TEMPLATE.format(
            filename=feedback.filename,
            overview=overview,
            details=details
        )

        return FeedbackResponse(
            filename=feedback.filename,
            documentation=documentation,
            chunk_id=feedback.chunk_id
        )
    except Exception as e:
        logger.error(f"Error processing feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process feedback: {str(e)}")


# Example usage with your GitHub endpoint
# Call `/github/repo/{owner}/{repo}/files` first, then pass the result to `/generate-docs`