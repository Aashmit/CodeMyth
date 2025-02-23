import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi import Body
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from .schemas import FeedbackInput, FeedbackResponse, DocumentationResponse,FileInput,AcceptChangesInput
import asyncio
import uuid
import tiktoken
import requests, base64
from typing import List, Dict
import json
import os
from dotenv import load_dotenv
import datetime

load_dotenv()

parameters = {
    "decoding_method": "sample",
    "max_new_tokens": 4000,
    "min_new_tokens": 1,
    "temperature": 0.5,
    "top_k": 50,
    "top_p": 1,
}

logger = logging.getLogger(__name__)
router = APIRouter()


MODEL_NAME = "granite3.1-dense:2b"
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL')
llm = OllamaLLM(model=MODEL_NAME, base_url=OLLAMA_BASE_URL)

CODE_EXTENSIONS = {
    '.py', '.js', '.jsx', '.java', '.cpp', '.c', '.cs', '.ts',
    '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.tsx'
}

DOC_TEMPLATE = """
### {filename}
#### Overview
{overview}

#### Details
{details}
"""

UNIFIED_DOC_TEMPLATE = """
# Developer Documentation for {project_name}

## Introduction
This document provides a comprehensive overview and detailed documentation for the code files in the {project_name} project, focusing on functionality related to caching, vectorization, and language model interactions with GitHub repositories.

## Table of Contents
{table_of_contents}

## File Documentation
{file_documentation}
"""

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

tokenizer = tiktoken.get_encoding("cl100k_base")
MAX_TOKENS = 4000

def is_code_file(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in CODE_EXTENSIONS)

def chunk_code(content: str, filename: str, max_tokens: int = MAX_TOKENS) -> List[Dict[str, str]]:
    if not is_code_file(filename):
        return []
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_tokens,
        chunk_overlap=200,
        length_function=lambda x: len(tokenizer.encode(x)),
    )
    chunks = text_splitter.split_text(content)
    return [{"path": filename, "content": chunk, "chunk_id": i} for i, chunk in enumerate(chunks)]

async def generate_doc_chunk(chunk: Dict[str, str]) -> str:
    prompt = DOC_PROMPT.format(code=chunk["content"], filename=chunk["path"])
    response = await llm.agenerate([prompt])
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
            if chunks:
                chunk_docs = await asyncio.gather(*(generate_doc_chunk(chunk) for chunk in chunks))
                overview = "This file is large and has been split into chunks. Below is a summary of each part.\n"
                details = "\n".join([f"#### Chunk {i}\n{doc}" for i, doc in enumerate(chunk_docs)])
                docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, overview=overview, details=details)})

    return docs

async def generate_unified_documentation(files: List[Dict[str, str]], project_name) -> str:
    individual_docs = await generate_full_documentation(files)
    table_of_contents = "\n".join([f"- [{doc['filename']}](#{doc['filename'].replace('.', '-')})" for doc in individual_docs])
    file_documentation = "\n\n".join(doc["documentation"] for doc in individual_docs)
    return UNIFIED_DOC_TEMPLATE.format(
        project_name=project_name,
        table_of_contents=table_of_contents,
        file_documentation=file_documentation
    )

# In-memory storage
DOC_STORAGE = {}

@router.post("/generate-docs", response_model=DocumentationResponse)
async def generate_documentation(data: FileInput = Body(...)):
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
    """Refine documentation based on user feedback and return the full updated documentation."""
    try:
        doc_id = data.documentation_id
        feedback = data.feedback
        if doc_id not in DOC_STORAGE:
            raise HTTPException(status_code=404, detail="Documentation not found")

        current_version = DOC_STORAGE[doc_id]["current_version"]
        versions = DOC_STORAGE[doc_id]["versions"]
        current_version_entry = next(v for v in versions if v["version_number"] == current_version)
        current_docs = current_version_entry["content"]

        chat_history = DOC_STORAGE[doc_id]["chat_history"]
        history_str = "\n".join([f"User: {entry['user']}\nAssistant: {entry['assistant']}" for entry in chat_history[-5:]])

        prompt = f"""
        You are a documentation expert tasked with refining technical documentation. Here’s the current full documentation:
        ```
        {current_docs}
        ```
        Past conversation:
        {history_str}
        User feedback: "{feedback}"
        Important: Always return the full documentation in 'updated_docs', including all existing sections, with refinements applied as requested.
        
        Refine the documentation based on the feedback:
        - If the feedback requests a project-wide overview, enhance the '## Introduction' section or add an '## Overview' section, preserving all existing '## File Documentation' sections.
        - If the feedback requests clarification, improve readability or add explanations to the relevant sections without removing content.
        - If the feedback asks for more details, expand the relevant section with examples or specifics, keeping all other content intact.
        - If the feedback identifies errors, correct them while maintaining the rest of the documentation.
        - For unclear feedback, ask the user for clarification in the response and return the documentation unchanged.

        Return a JSON object with:
        - "response": A concise reply to the user explaining what you changed (or why no changes were made)
        - "updated_docs": The full revised documentation in valid markdown format (unchanged if no update is needed)

        """

        response = await llm.agenerate([prompt])
        raw_response = response.generations[0][0].text
        logger.debug(f"LLM raw response: {raw_response}")

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

        chat_history.append({"user": feedback, "assistant": result["response"]})
        DOC_STORAGE[doc_id]["chat_history"] = chat_history[-5:]

        if result["updated_docs"] != current_docs:
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

        return FeedbackResponse(
            response=result["response"],
            updated_docs=result["updated_docs"]
        )

    except Exception as e:
        logger.error(f"Error refining documentation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to refine documentation: {str(e)}")

GITHUB_API_URL = "https://api.github.com"
@router.post("/docs/refine", response_model=FeedbackResponse)
async def refine_documentation(data: FeedbackInput = Body(...)):
    """Refine documentation based on user feedback and return the full updated documentation."""
    try:
        doc_id = data.documentation_id
        feedback = data.feedback
        if doc_id not in DOC_STORAGE:
            raise HTTPException(status_code=404, detail="Documentation not found")

        current_version = DOC_STORAGE[doc_id]["current_version"]
        versions = DOC_STORAGE[doc_id]["versions"]
        current_version_entry = next(v for v in versions if v["version_number"] == current_version)
        current_docs = current_version_entry["content"]

        chat_history = DOC_STORAGE[doc_id]["chat_history"]
        history_str = "\n".join([f"User: {entry['user']}\nAssistant: {entry['assistant']}" for entry in chat_history[-5:]])

        prompt = f"""
        You are a documentation expert tasked with refining technical documentation. Here’s the current full documentation:
        ```
        {current_docs}
        ```
        Past conversation:
        {history_str}
        User feedback: "{feedback}"
        Important: Always return the full documentation in 'updated_docs', including all existing sections, with refinements applied as requested.

        Refine the documentation based on the feedback:
        - If the feedback requests a project-wide overview, enhance the '## Introduction' section or add an '## Overview' section, preserving all existing '## File Documentation' sections.
        - If the feedback requests clarification, improve readability or add explanations to the relevant sections without removing content.
        - If the feedback asks for more details, expand the relevant section with examples or specifics, keeping all other content intact.
        - If the feedback identifies errors, correct them while maintaining the rest of the documentation.
        - For unclear feedback, ask the user for clarification in the response and return the documentation unchanged.

        Return your response as a JSON object in this exact format:
        ```json
        {{
          "response": "A concise reply to the user explaining what you changed (or why no changes were made)",
          "updated_docs": "The full revised documentation in valid markdown format (unchanged if no update is needed)"
        }}
        ```

        Example response for unclear feedback:
        ```json
        {{
          "response": "I'm not sure what you mean by 'make it better'. Could you please provide more specific guidance?",
          "updated_docs": "{current_docs}"
        }}
        ```

        Ensure your output is valid JSON with properly escaped quotes and no trailing commas. Do not include any text outside the JSON object.
        """

        # Apply Ollama-specific parameters
        response = await llm.agenerate([prompt], **parameters)
        raw_response = response.generations[0][0].text.strip()
        logger.debug(f"LLM raw response: {raw_response}")

        try:
            result = json.loads(raw_response)
            if "response" not in result or "updated_docs" not in result:
                raise ValueError("Missing required fields 'response' or 'updated_docs'")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from LLM: {raw_response} - Error: {str(e)}")
            result = {
                "response": "I couldn’t process your feedback due to an issue with the response format. Please try again.",
                "updated_docs": current_docs
            }
        except ValueError as e:
            logger.error(f"LLM response missing required fields: {raw_response} - Error: {str(e)}")
            result = {
                "response": "The response was incomplete. Please try again or clarify your feedback.",
                "updated_docs": current_docs
            }

        chat_history.append({"user": feedback, "assistant": result["response"]})
        DOC_STORAGE[doc_id]["chat_history"] = chat_history[-5:]

        if result["updated_docs"] != current_docs:
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

        return FeedbackResponse(
            response=result["response"],
            updated_docs=result["updated_docs"]
        )

    except Exception as e:
        logger.error(f"Error refining documentation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to refine documentation: {str(e)}")