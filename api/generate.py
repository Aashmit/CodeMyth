import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Body
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
from langchain_ibm import WatsonxLLM
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
import asyncio
import tiktoken
from typing import List, Dict, AsyncGenerator
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
MODEL_NAME = "granite3.1-dense:2b"  # Replace with your Ollama-hosted model
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL')  # Default Ollama URL


llm = OllamaLLM(model=MODEL_NAME, base_url=OLLAMA_BASE_URL)
# project_id = os.getenv('PROJECT_ID')  # Your IBM Cloud project ID
# url = os.getenv('IBM_URL')  # Your IBM Cloud URL
# api_key = os.getenv('WATSONX_APIKEY')  # Your Watsonx API key
# llm  = WatsonxLLM(
#     model_id="ibm/granite-3-8b-instruct",  # Choose a model (e.g., IBM Granite or another watsonx model)
#     url=url,  # Adjust based on your region
#     project_id=project_id,  # Replace with your project ID
#     params=parameters,
# )
# Documentation template for consistency
DOC_TEMPLATE = """
### {filename}
#### Overview
{overview}

#### Details
{details}
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

def chunk_code(content: str, filename: str, max_tokens: int = MAX_TOKENS) -> List[Dict[str, str]]:
    """Chunk large code files into smaller segments based on token count."""
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

async def stream_doc_chunk(chunk: Dict[str, str]) -> AsyncGenerator[str, None]:
    """Stream documentation generation for a single chunk."""
    prompt = DOC_PROMPT.format(code=chunk["content"], filename=chunk["path"])
    async for token in llm.astream(prompt):  # Streaming response
        yield token

async def generate_full_documentation(files: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Generate documentation for all files with hierarchical summarization."""
    docs = []
    for file in files:
        filename = file["path"]
        content = file["content"]
        token_count = len(tokenizer.encode(content))

        if token_count <= MAX_TOKENS:
            # Process small files directly
            doc_content = await generate_doc_chunk(file)
            docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, overview=doc_content.split("#### Details")[0], details="#### Details" + doc_content.split("#### Details")[1] if len(doc_content.split("#### Details")) > 1 else doc_content)})
        else:
            # Chunk large files
            chunks = chunk_code(content, filename)
            chunk_docs = await asyncio.gather(*(generate_doc_chunk(chunk) for chunk in chunks))
            # Aggregate chunk summaries
            overview = "This file is large and has been split into chunks. Below is a summary of each part.\n"
            details = "\n".join([f"#### Chunk {i}\n{doc}" for i, doc in enumerate(chunk_docs)])
            docs.append({"filename": filename, "documentation": DOC_TEMPLATE.format(filename=filename, overview=overview, details=details)})

    return docs

@router.post("/generate-docs")
async def generate_documentation(data: FileInput = Body(...)):
    """Generate documentation for fetched GitHub files with streaming."""
    files = data.files
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    async def stream_docs() -> AsyncGenerator[str, None]:
        """Stream documentation as it’s generated."""
        for file in files:
            filename = file["path"]
            content = file["content"]
            token_count = len(tokenizer.encode(content))

            yield f"data: Generating documentation for {filename}\n\n"

            if token_count <= MAX_TOKENS:
                # Stream small files directly
                doc_content = ""
                async for token in stream_doc_chunk(file):
                    doc_content += token
                    yield f"data: {token}\n\n"
                # Handle cases where "#### Details" might not exist
                if "#### Details" in doc_content:
                    parts = doc_content.split("#### Details")
                    overview = parts[0].strip()
                    details = "#### Details" + (parts[1] if len(parts) > 1 else "")
                else:
                    logger.warning(f"No '#### Details' found in documentation for {filename}. Using full content as overview.")
                    overview = doc_content.strip()
                    details = ""
                formatted_doc = DOC_TEMPLATE.format(filename=filename, overview=overview, details=details)
                yield f"data: {json.dumps({'filename': filename, 'documentation': formatted_doc})}\n\n"
            else:
                # Stream chunked large files
                chunks = chunk_code(content, filename)
                overview = "This file is large and has been split into chunks. Below is a summary of each part.\n"
                yield f"data: {overview}\n\n"
                for i, chunk in enumerate(chunks):
                    yield f"data: #### Chunk {i}\n\n"
                    async for token in stream_doc_chunk(chunk):
                        yield f"data: {token}\n\n"

    return StreamingResponse(stream_docs(), media_type="text/event-stream")

@router.post("/docs/feedback")
async def process_feedback(request: Request):
    """Handle user feedback and regenerate specific sections."""
    data = await request.json()
    filename = data.get("filename")
    chunk_id = data.get("chunk_id")  # Optional, for targeting specific chunks
    feedback = data.get("feedback")
    original_content = data.get("original_content")

    if not all([filename, feedback, original_content]):
        raise HTTPException(status_code=400, detail="Missing required fields.")

    # Refine prompt with feedback
    refined_prompt = PromptTemplate(
        input_variables=["code", "filename", "feedback"],
        template="""
        You previously generated documentation for this code. The user provided feedback to improve it.
        Regenerate the documentation based on the feedback while keeping it concise and accurate.
        Use markdown formatting and include "#### Details" as a header to separate the overview from the detailed explanation.

        File: {filename}
        Code:
        ```{code}```
        User Feedback: {feedback}
        """
    )

    async def stream_refined_docs() -> AsyncGenerator[str, None]:
        prompt = refined_prompt.format(code=original_content, filename=filename, feedback=feedback)
        async for token in llm.astream(prompt):
            yield f"data: {token}\n\n"

    return StreamingResponse(stream_refined_docs(), media_type="text/event-stream")

# Example usage with your GitHub endpoint
# Call `/github/repo/{owner}/{repo}/files` first, then pass the result to `/generate-docs`