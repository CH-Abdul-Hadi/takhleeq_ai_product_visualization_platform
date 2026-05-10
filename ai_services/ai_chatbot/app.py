"""
FastAPI app for the Takhleeq chatbot. All chatbot logic lives in chatbot.py.
"""
from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from chatbot import SESSIONS_DB, stream_agent_response
from agents import SQLiteSession


app = FastAPI(
    title="Takhleeq AI Chatbot",
    description="Chat endpoint for the Takhleeq AI Assistant with RAG.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to send to the chatbot.")
    session_id: str | None = Field(
        default=None,
        description="Optional session ID to continue a conversation. A new session is created if omitted.",
    )


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant reply.")
    session_id: str = Field(..., description="Session ID for continuing the conversation.")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-chatbot"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get a response from the Takhleeq AI Assistant."""
    session_id = request.session_id or str(uuid4())
    session = SQLiteSession(session_id, SESSIONS_DB)

    reply_parts: list[str] = []
    async for event_type, data in stream_agent_response(session, request.message):
        if event_type == "text":
            reply_parts.append(data)

    return ChatResponse(
        reply="".join(reply_parts),
        session_id=session_id,
    )
