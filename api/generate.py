import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi import Body
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from .schemas import FeedbackInput, FeedbackResponse, DocumentationResponse
import asyncio
import uuid
import difflib
import tiktoken
from typing import List, Dict
import json
import os
from dotenv import load_dotenv
import datetime

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
    '.py', '.js', '.jsx' ,'.java', '.cpp', '.c', '.cs', '.ts', 
    '.rb', '.php', '.go', '.rs', '.swift', '.kt','.tsx'
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

# In-memory storage for documentation and chat history
DOC_STORAGE = {}

@router.post("/generate-docs", response_model=DocumentationResponse)
async def generate_documentation(data: FileInput = Body(...)):
    """Generate initial documentation and store it with a unique ID."""
    files = data.files
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    unified_docs = await generate_unified_documentation(files, project_name="MyProject")
    doc_id = str(uuid.uuid4())
    initial_version = {
        "version_number": 1,
        "content": unified_docs,
        "timestamp": datetime.datetime.now().isoformat(),
        "feedback": None
    }
    DOC_STORAGE[doc_id] = {
        "versions": [initial_version],
        "current_version": 1,
        "chat_history": []
    }
    return DocumentationResponse(documentation_id=doc_id, documentation=unified_docs)

@router.post("/docs/refine", response_model=FeedbackResponse)
async def refine_documentation(data: FeedbackInput = Body(...)):
    """Refine documentation based on user feedback while preserving existing details."""
    try:
        doc_id = data.documentation_id
        feedback = data.feedback
        if doc_id not in DOC_STORAGE:
            raise HTTPException(status_code=404, detail="Documentation not found")

        # Retrieve current version and documentation
        current_version = DOC_STORAGE[doc_id]["current_version"]
        versions = DOC_STORAGE[doc_id]["versions"]
        current_version_entry = next(v for v in versions if v["version_number"] == current_version)
        current_docs = current_version_entry["content"]

        # Retrieve chat history (last 5 turns)
        chat_history = DOC_STORAGE[doc_id]["chat_history"]
        history_str = "\n".join([f"User: {entry['user']}\nAssistant: {entry['assistant']}" for entry in chat_history[-5:]])

        # Construct the prompt for the LLM
        prompt = f"""
        You are a documentation expert tasked with refining technical documentation. Here’s the current documentation:
        ```
        {current_docs}
        ```
        Past conversation:
        {history_str}
        User feedback: "{feedback}"

        Analyze the feedback and refine the documentation as follows:
        - If the feedback requests a project-wide overview, enhance the '## Introduction' section or add an '## Overview' section to summarize the project’s purpose and components, while preserving all existing '## File Documentation' sections (including their '#### Overview' and '#### Details' subsections).
        - If the feedback requests clarification, improve readability or add explanations to the relevant sections without removing existing content.
        - If the feedback asks for more details, expand the relevant section with examples or specifics, keeping all other content intact.
        - If the feedback identifies errors, correct them while maintaining the rest of the documentation.
        - For unclear feedback, ask the user for clarification in the response and return the documentation unchanged.

        Return a JSON object with:
        - "response": A concise reply to the user explaining what you changed (or why no changes were made)
        - "updated_docs": The revised documentation in valid markdown format (unchanged if no update is needed)

        Important: Unless explicitly requested, do not remove any existing sections, including detailed file documentation. Ensure all refinements enhance rather than replace the original content.
        """

        # Generate response from LLM
        response = await llm.agenerate([prompt])
        raw_response = response.generations[0][0].text
        logger.debug(f"LLM raw response: {raw_response}")

        # Parse LLM response with fallback for invalid JSON
        try:
            result = json.loads(raw_response)
            if "response" not in result or "updated_docs" not in result:
                raise ValueError("Missing required fields 'response' or 'updated_docs'")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Invalid JSON from LLM: {str(e)}")
            result = {
                "response": "I couldn’t process your feedback due to an internal error. Please try again or provide more specific guidance.",
                "updated_docs": current_docs
            }
        # Update chat history
        chat_history.append({"user": feedback, "assistant": result["response"]})
        DOC_STORAGE[doc_id]["chat_history"] = chat_history[-5:]

        # Check if documentation was updated
        diff_str = None
        if result["updated_docs"] != current_docs:
            # Create new version
            new_version_number = len(versions) + 1
            new_version = {
                "version_number": new_version_number,
                "content": result["updated_docs"],
                "timestamp": datetime.datetime.now().isoformat(),
                "feedback": feedback
            }
            versions.append(new_version)
            DOC_STORAGE[doc_id]["current_version"] = new_version_number
            logger.info(f"Created new version {new_version_number} for doc_id {doc_id}")
            # Compute diff
            old_lines = current_docs.splitlines()
            new_lines = new_version["content"].splitlines()
            diff = difflib.unified_diff(old_lines, new_lines, lineterm='')
            diff_str = '\n'.join(diff)

        return FeedbackResponse(
            response=result["response"],
            updated_docs=result["updated_docs"],
            diff=diff_str
        )

    except Exception as e:
        logger.error(f"Error refining documentation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to refine documentation: {str(e)}")