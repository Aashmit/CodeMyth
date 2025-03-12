# api/generate_groq.py
import logging
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from .schemas import GroqInput, DocumentationResponse
import asyncio
import uuid
import tiktoken
from typing import List, Dict, AsyncGenerator
from groq import RateLimitError
import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Templates
DOC_TEMPLATE = """
### {filename}
{body}
"""

UNIFIED_DOC_TEMPLATE = """
# Developer Documentation 

## Introduction
This document provides a comprehensive overview and detailed documentation for the code files in this project.

## Table of Contents
{table_of_contents}

## File Documentation
{file_documentation}
"""

DOC_PROMPT = PromptTemplate(
    input_variables=["code", "filename"],
    template="""
    You are a senior developer generating concise, accurate documentation.
    Provide an overview of what the code does followed by detailed explanations of its key components (e.g., functions, classes).
    Use markdown formatting with "#### Overview" and "#### Details" as subheadings to separate the overview from the details.

    File: {filename}
    Code:
    ```{code}```
    """
)

# Token handling
tokenizer = tiktoken.get_encoding("cl100k_base")
MAX_TOKENS = 4000  # Max tokens per chunk, adjustable based on model limits
CODE_EXTENSIONS = {'.py', '.js', '.jsx', '.java', '.cpp', '.c', '.cs', '.ts', '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.tsx'}

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

async def generate_doc_chunk(chunk: Dict[str, str], llm: ChatGroq) -> str:
    prompt = DOC_PROMPT.format(code=chunk["content"], filename=chunk["path"])
    try:
        response = await llm.ainvoke([("human", prompt)])
        return response.content
    except RateLimitError as e:
        raise e  # Propagate rate limit error to handle at higher level
    except Exception as e:
        logger.error(f"Error generating chunk for {chunk['path']}: {str(e)}")
        return f"Error: Failed to generate documentation for chunk {chunk['chunk_id']} of {chunk['path']}"

async def generate_full_documentation(files: List[Dict[str, str]], llm: ChatGroq) -> List[Dict[str, str]]:
    docs = []
    for file in files:
        filename = file["path"]
        content = file["content"]
        
        if not is_code_file(filename):
            logger.info(f"Skipping non-code file: {filename}")
            continue

        token_count = len(tokenizer.encode(content))
        if token_count <= MAX_TOKENS:
            doc_content = await generate_doc_chunk(file, llm)
            docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, body=doc_content)})
        else:
            chunks = chunk_code(content, filename)
            if chunks:
                chunk_docs = []
                for chunk in chunks:
                    try:
                        doc = await generate_doc_chunk(chunk, llm)
                        chunk_docs.append(doc)
                    except RateLimitError as e:
                        raise e  # Stop processing if rate limit hit
                    except Exception as e:
                        chunk_docs.append(f"Error: {str(e)}")
                body = "This file is large and has been split into chunks. Below is the documentation for each part.\n\n" + \
                       "\n".join([f"#### Chunk {i}\n{doc}" for i, doc in enumerate(chunk_docs)])
                docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, body=body)})

    return docs

async def stream_unified_documentation(files: List[Dict[str, str]], project_name: str, llm: ChatGroq) -> AsyncGenerator[dict, None]:
    """Stream documentation with status updates and handle partial generation."""
    yield {"status": "starting", "message": "Starting documentation generation"}

    try:
        individual_docs = await generate_full_documentation(files, llm)
        table_of_contents = "\n".join([f"- [{doc['filename']}](#{doc['filename'].replace('.', '-')})" for doc in individual_docs])

        # Stream static parts
        yield {"status": "progress", "content": "# Developer Documentation\n\n"}
        yield {"status": "progress", "content": "## Introduction\nThis document provides a comprehensive overview and detailed documentation for the code files in this project.\n\n"}
        yield {"status": "progress", "content": "## Table of Contents\n" + table_of_contents + "\n\n"}
        yield {"status": "progress", "content": "## File Documentation\n"}

        # Stream file documentation
        for doc in individual_docs:
            yield {"status": "progress", "content": doc["documentation"] + "\n\n"}
            await asyncio.sleep(0.01)  # Small delay for streaming effect

        yield {"status": "completed", "message": "Documentation generation completed"}

    except RateLimitError as e:
        error_data = e.response.json()["error"] if hasattr(e.response, "json") else {"message": str(e)}
        retry_after = e.response.headers.get("retry-after", "unknown")
        limit_type = error_data.get("type", "unknown")
        
        if limit_type == "tokens" and "per minute" in error_data.get("message", ""):
            yield {
                "status": "rate_limit",
                "message": f"TPM limit hit. Retrying after {retry_after} seconds.",
                "retry_after": int(retry_after) if retry_after.isdigit() else 60
            }
            await asyncio.sleep(int(retry_after) if retry_after.isdigit() else 60)
            async for chunk in stream_unified_documentation(files, project_name, llm):  # Retry
                yield chunk
        elif "per day" in error_data.get("message", ""):
            yield {
                "status": "error",
                "message": f"Daily limit (RPD/TPD) exceeded: {error_data['message']}. Cannot retry until reset."
            }
        else:
            yield {
                "status": "error",
                "message": f"Rate limit error: {error_data['message']}"
            }

    except Exception as e:
        yield {"status": "error", "message": f"Unexpected error: {str(e)}"}

# In-memory storage
DOC_STORAGE = {}

@router.post("/generate-with-groq")
async def generate_with_groq(data: GroqInput = Body(...)):
    files = data.files
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    
    groq_api_key = data.groq_api_key
    model_name = data.model_name
    
    llm = ChatGroq(api_key=groq_api_key, model=model_name, streaming=True)
    doc_id = str(uuid.uuid4())
    
    async def stream_response() -> AsyncGenerator[str, None]:
        full_doc = ""
        try:
            async for event in stream_unified_documentation(files, "MyProject", llm):
                if event["status"] == "progress":
                    full_doc += event["content"]
                    yield f"data: {event['content']}\n\n"
                elif event["status"] == "completed":
                    # Store complete documentation
                    initial_version = {
                        "version_number": 1,
                        "content": full_doc,
                        "timestamp": datetime.datetime.now().isoformat(),
                        "feedback": None
                    }
                    DOC_STORAGE[doc_id] = {
                        "versions": [initial_version],
                        "current_version": 1,
                        "chat_history": []
                    }
                    yield f"data: {{ \"status\": \"completed\", \"documentation_id\": \"{doc_id}\" }}\n\n"
                elif event["status"] == "rate_limit" and "retry_after" in event:
                    yield f"data: {{ \"status\": \"rate_limit\", \"message\": \"{event['message']}\", \"retry_after\": {event['retry_after']} }}\n\n"
                elif event["status"] == "error":
                    # Store partial documentation if any
                    if full_doc:
                        partial_version = {
                            "version_number": 1,
                            "content": full_doc,
                            "timestamp": datetime.datetime.now().isoformat(),
                            "feedback": "Partial due to error"
                        }
                        DOC_STORAGE[doc_id] = {
                            "versions": [partial_version],
                            "current_version": 1,
                            "chat_history": []
                        }
                    yield f"data: {{ \"status\": \"error\", \"message\": \"{event['message']}\", \"documentation_id\": \"{doc_id}\" }}\n\n"
                else:
                    yield f"data: {{ \"status\": \"{event['status']}\", \"message\": \"{event['message']}\" }}\n\n"
        
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            if full_doc:  # Save partial doc on unexpected failure
                partial_version = {
                    "version_number": 1,
                    "content": full_doc,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "feedback": "Partial due to unexpected error"
                }
                DOC_STORAGE[doc_id] = {
                    "versions": [partial_version],
                    "current_version": 1,
                    "chat_history": []
                }
            yield f"data: {{ \"status\": \"error\", \"message\": \"Streaming failed: {str(e)}\", \"documentation_id\": \"{doc_id}\" }}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")