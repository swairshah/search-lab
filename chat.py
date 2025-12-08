"""
Chat API - Backend for dual-panel chat interface.

Run with: uvicorn chat:app --reload --port 8001
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import time
import random
import uuid

app = FastAPI(title="Chat Interface API")

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Data Models
# =============================================================================

class TextMessage(BaseModel):
    content: str


class SnippetMessage(BaseModel):
    content: str
    language: str


class ChatMessage(BaseModel):
    id: str
    type: str  # 'text' | 'audio' | 'image' | 'snippet'
    content: str
    timestamp: str
    role: str  # 'user' | 'assistant'
    metadata: Optional[dict] = None


class AccumulatedPanel(BaseModel):
    """A dynamic panel to show in the accumulated state view."""
    title: str
    content: str  # Can be plain text, JSON string, or markdown


class ChatResponse(BaseModel):
    message: ChatMessage
    state: dict
    accumulated: list[AccumulatedPanel] = []


class AccumulatedState(BaseModel):
    message_count: int = 0
    text_count: int = 0
    audio_count: int = 0
    image_count: int = 0
    snippet_count: int = 0
    keywords: list[str] = []
    topics: list[str] = []
    code_languages: list[str] = []


# =============================================================================
# In-Memory State (use database in production)
# =============================================================================

messages: list[dict] = []
state = AccumulatedState()


def generate_id() -> str:
    return f"msg_{uuid.uuid4().hex[:8]}_{int(time.time())}"


def get_timestamp() -> str:
    return datetime.now().isoformat()


def extract_keywords(text: str) -> list[str]:
    """Extract keywords from text."""
    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'and', 'but', 'if',
        'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those',
        'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
        'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
        'who', 'whom'
    }

    words = text.lower().split()
    keywords = []
    for word in words:
        cleaned = ''.join(c for c in word if c.isalnum())
        if cleaned and len(cleaned) > 2 and cleaned not in stop_words:
            keywords.append(cleaned)

    return list(set(keywords))[:10]


def generate_response(msg_type: str, content: str, metadata: Optional[dict] = None) -> str:
    """Generate a mock assistant response."""
    if msg_type == 'text':
        keywords = extract_keywords(content)
        return f"Received your message. Extracted {len(keywords)} keywords and updated the conversation state."
    elif msg_type == 'audio':
        duration = metadata.get('duration', 0) if metadata else 0
        transcription = metadata.get('transcription', '') if metadata else ''
        return f"Received audio message ({duration:.1f}s). Transcription: \"{transcription}\""
    elif msg_type == 'image':
        features = metadata.get('features', []) if metadata else []
        return f"Received image. Detected features: {', '.join(features)}"
    elif msg_type == 'snippet':
        language = metadata.get('language', 'code') if metadata else 'code'
        line_count = metadata.get('line_count', 0) if metadata else 0
        return f"Received {language} snippet ({line_count} lines). Added to state."
    return "Message received."


# =============================================================================
# Mock Services
# =============================================================================

MOCK_TRANSCRIPTIONS = [
    "Show me the latest products",
    "Search for diamond rings",
    "I need a gold necklace",
    "What are the trending items",
    "Find me something elegant",
]

MOCK_IMAGE_FEATURES = [
    ["jewelry", "gold", "elegant"],
    ["ring", "diamond", "sparkle"],
    ["necklace", "silver", "pendant"],
    ["bracelet", "modern", "minimalist"],
    ["earrings", "pearl", "classic"],
]


def mock_transcribe_audio(audio_data: bytes) -> tuple[str, float]:
    """Mock audio transcription. Returns (transcription, duration)."""
    time.sleep(random.uniform(0.1, 0.3))
    transcription = random.choice(MOCK_TRANSCRIPTIONS)
    duration = random.uniform(1.0, 5.0)
    return transcription, duration


def mock_analyze_image(image_data: bytes) -> list[str]:
    """Mock image analysis. Returns detected features."""
    time.sleep(random.uniform(0.1, 0.3))
    return random.choice(MOCK_IMAGE_FEATURES)


# =============================================================================
# API Endpoints
# =============================================================================

def build_accumulated_panels() -> list[dict]:
    """Build the dynamic accumulated panels based on current state."""
    panels = []

    # Add history panel if there are messages
    if messages:
        history_lines = []
        for msg in messages[-20:]:  # Last 20 messages
            role = msg["role"]
            content = msg["content"][:50] + ("..." if len(msg["content"]) > 50 else "")
            history_lines.append(f"[{role}] {content}")
        panels.append({
            "title": "History",
            "content": "\n".join(history_lines)
        })

    # Add keywords panel if there are keywords
    if state.keywords:
        panels.append({
            "title": "Keywords",
            "content": ", ".join(state.keywords)
        })

    return panels


@app.get("/api/chat/state")
async def get_state():
    """Get current accumulated state."""
    return {
        "state": state.model_dump(),
        "messages": messages[-50:],  # Last 50 messages
        "accumulated": build_accumulated_panels(),
    }


@app.post("/api/chat/clear")
async def clear_chat():
    """Clear all messages and reset state."""
    global messages, state
    messages = []
    state = AccumulatedState()
    return {"status": "cleared", "state": state.model_dump(), "accumulated": []}


@app.post("/api/chat/text", response_model=ChatResponse)
async def send_text_message(request: TextMessage):
    """Send a text message."""
    global state

    # Create user message
    user_msg = {
        "id": generate_id(),
        "type": "text",
        "content": request.content,
        "timestamp": get_timestamp(),
        "role": "user",
        "metadata": {"length": len(request.content)},
    }
    messages.append(user_msg)

    # Update state
    state.message_count += 1
    state.text_count += 1
    keywords = extract_keywords(request.content)
    for kw in keywords:
        if kw not in state.keywords:
            state.keywords.append(kw)
    state.keywords = state.keywords[:20]  # Keep top 20

    # Generate response
    time.sleep(random.uniform(0.2, 0.5))  # Simulate processing
    response_content = generate_response("text", request.content)

    assistant_msg = {
        "id": generate_id(),
        "type": "text",
        "content": response_content,
        "timestamp": get_timestamp(),
        "role": "assistant",
        "metadata": None,
    }
    messages.append(assistant_msg)

    return ChatResponse(
        message=ChatMessage(**assistant_msg),
        state=state.model_dump(),
        accumulated=build_accumulated_panels(),
    )


@app.post("/api/chat/audio", response_model=ChatResponse)
async def send_audio_message(audio: UploadFile = File(...)):
    """Send an audio message."""
    global state

    # Read and process audio
    audio_data = await audio.read()
    transcription, duration = mock_transcribe_audio(audio_data)

    metadata = {
        "transcription": transcription,
        "duration": duration,
        "mime_type": audio.content_type,
        "file_size": len(audio_data),
    }

    # Create user message
    user_msg = {
        "id": generate_id(),
        "type": "audio",
        "content": transcription,  # Use transcription as content
        "timestamp": get_timestamp(),
        "role": "user",
        "metadata": metadata,
    }
    messages.append(user_msg)

    # Update state
    state.message_count += 1
    state.audio_count += 1
    if "voice" not in state.topics:
        state.topics.append("voice")

    # Extract keywords from transcription
    keywords = extract_keywords(transcription)
    for kw in keywords:
        if kw not in state.keywords:
            state.keywords.append(kw)
    state.keywords = state.keywords[:20]

    # Generate response
    response_content = generate_response("audio", transcription, metadata)

    assistant_msg = {
        "id": generate_id(),
        "type": "text",
        "content": response_content,
        "timestamp": get_timestamp(),
        "role": "assistant",
        "metadata": None,
    }
    messages.append(assistant_msg)

    return ChatResponse(
        message=ChatMessage(**assistant_msg),
        state=state.model_dump(),
        accumulated=build_accumulated_panels(),
    )


@app.post("/api/chat/image", response_model=ChatResponse)
async def send_image_message(image: UploadFile = File(...)):
    """Send an image message."""
    global state

    # Read and process image
    image_data = await image.read()
    features = mock_analyze_image(image_data)

    metadata = {
        "features": features,
        "file_name": image.filename,
        "file_size": len(image_data),
        "mime_type": image.content_type,
    }

    # Create user message
    user_msg = {
        "id": generate_id(),
        "type": "image",
        "content": ", ".join(features),  # Use features as content
        "timestamp": get_timestamp(),
        "role": "user",
        "metadata": metadata,
    }
    messages.append(user_msg)

    # Update state
    state.message_count += 1
    state.image_count += 1
    if "visual" not in state.topics:
        state.topics.append("visual")

    # Add features as keywords
    for feature in features:
        if feature not in state.keywords:
            state.keywords.append(feature)
    state.keywords = state.keywords[:20]

    # Generate response
    response_content = generate_response("image", "", metadata)

    assistant_msg = {
        "id": generate_id(),
        "type": "text",
        "content": response_content,
        "timestamp": get_timestamp(),
        "role": "assistant",
        "metadata": None,
    }
    messages.append(assistant_msg)

    return ChatResponse(
        message=ChatMessage(**assistant_msg),
        state=state.model_dump(),
        accumulated=build_accumulated_panels(),
    )


@app.post("/api/chat/snippet", response_model=ChatResponse)
async def send_snippet_message(request: SnippetMessage):
    """Send a code snippet message."""
    global state

    line_count = len(request.content.strip().split('\n'))

    metadata = {
        "language": request.language,
        "line_count": line_count,
        "char_count": len(request.content),
    }

    # Create user message
    user_msg = {
        "id": generate_id(),
        "type": "snippet",
        "content": request.content,
        "timestamp": get_timestamp(),
        "role": "user",
        "metadata": metadata,
    }
    messages.append(user_msg)

    # Update state
    state.message_count += 1
    state.snippet_count += 1
    if "code" not in state.topics:
        state.topics.append("code")
    if request.language and request.language not in state.code_languages:
        state.code_languages.append(request.language)

    # Generate response
    time.sleep(random.uniform(0.1, 0.3))
    response_content = generate_response("snippet", request.content, metadata)

    assistant_msg = {
        "id": generate_id(),
        "type": "text",
        "content": response_content,
        "timestamp": get_timestamp(),
        "role": "assistant",
        "metadata": None,
    }
    messages.append(assistant_msg)

    return ChatResponse(
        message=ChatMessage(**assistant_msg),
        state=state.model_dump(),
        accumulated=build_accumulated_panels(),
    )


# =============================================================================
# Static Files (for production)
# =============================================================================

try:
    app.mount("/static", StaticFiles(directory="dist"), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse("dist/index.html")

except Exception:
    pass  # Static files not available in dev mode


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
