"""
Dual-Panel Chat Interface
Left pane: Chat interface with text, audio, image, and snippet support
Right pane: Accumulated state display
"""

import gradio as gr
import json
import base64
import tempfile
import os
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


class MessageType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"
    IMAGE = "image"
    SNIPPET = "snippet"


@dataclass
class ChatMessage:
    """Represents a single chat message."""
    id: str
    type: MessageType
    content: str
    timestamp: str
    metadata: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type.value,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        }


@dataclass
class AccumulatedState:
    """Accumulated state from the conversation."""
    messages: list = field(default_factory=list)
    text_count: int = 0
    audio_count: int = 0
    image_count: int = 0
    snippet_count: int = 0
    keywords: list = field(default_factory=list)
    topics: list = field(default_factory=list)

    def to_dict(self):
        return {
            "total_messages": len(self.messages),
            "text_count": self.text_count,
            "audio_count": self.audio_count,
            "image_count": self.image_count,
            "snippet_count": self.snippet_count,
            "keywords": self.keywords,
            "topics": self.topics,
            "messages": [m.to_dict() if isinstance(m, ChatMessage) else m for m in self.messages]
        }


# Global state
accumulated_state = AccumulatedState()
message_counter = 0


def generate_message_id() -> str:
    """Generate a unique message ID."""
    global message_counter
    message_counter += 1
    return f"msg_{message_counter}_{datetime.now().strftime('%H%M%S')}"


def extract_keywords(text: str) -> list:
    """Extract simple keywords from text."""
    stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                  'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                  'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
                  'during', 'before', 'after', 'above', 'below', 'between', 'under',
                  'again', 'further', 'then', 'once', 'here', 'there', 'when',
                  'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most',
                  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
                  'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
                  'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these',
                  'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you',
                  'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it',
                  'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom'}

    words = text.lower().split()
    keywords = [w.strip('.,!?;:()[]{}"\'-') for w in words
                if w.strip('.,!?;:()[]{}"\'-') not in stop_words
                and len(w.strip('.,!?;:()[]{}"\'-')) > 2]
    return list(set(keywords))[:10]


def format_state_display(state: AccumulatedState) -> str:
    """Format the accumulated state for display."""
    state_dict = state.to_dict()

    display = "## 📊 Accumulated State\n\n"
    display += "### Message Statistics\n"
    display += f"- **Total Messages:** {state_dict['total_messages']}\n"
    display += f"- 💬 Text: {state_dict['text_count']}\n"
    display += f"- 🎤 Audio: {state_dict['audio_count']}\n"
    display += f"- 🖼️ Images: {state_dict['image_count']}\n"
    display += f"- 📝 Snippets: {state_dict['snippet_count']}\n\n"

    if state_dict['keywords']:
        display += "### 🔑 Extracted Keywords\n"
        display += ", ".join(f"`{kw}`" for kw in state_dict['keywords'][:15])
        display += "\n\n"

    if state_dict['topics']:
        display += "### 📌 Topics\n"
        display += ", ".join(f"**{topic}**" for topic in state_dict['topics'])
        display += "\n\n"

    display += "### 📜 Message History\n"
    for msg in state_dict['messages'][-10:]:  # Show last 10 messages
        icon = {"text": "💬", "audio": "🎤", "image": "🖼️", "snippet": "📝"}.get(msg['type'], "📨")
        content_preview = msg['content'][:50] + "..." if len(msg['content']) > 50 else msg['content']
        display += f"- {icon} `{msg['timestamp']}` - {content_preview}\n"

    return display


def format_state_json(state: AccumulatedState) -> str:
    """Format the accumulated state as JSON."""
    return json.dumps(state.to_dict(), indent=2)


def process_text_message(message: str, history: list) -> tuple:
    """Process a text message."""
    global accumulated_state

    if not message.strip():
        return history, format_state_display(accumulated_state), format_state_json(accumulated_state)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = ChatMessage(
        id=generate_message_id(),
        type=MessageType.TEXT,
        content=message,
        timestamp=timestamp,
        metadata={"length": len(message)}
    )

    accumulated_state.messages.append(msg)
    accumulated_state.text_count += 1

    # Extract and accumulate keywords
    new_keywords = extract_keywords(message)
    for kw in new_keywords:
        if kw not in accumulated_state.keywords:
            accumulated_state.keywords.append(kw)
    accumulated_state.keywords = accumulated_state.keywords[:20]  # Keep top 20

    # Add to chat history
    history.append({"role": "user", "content": message})

    # Generate a simple response
    response = f"Received your message. I've extracted {len(new_keywords)} keywords and updated the state."
    history.append({"role": "assistant", "content": response})

    return history, format_state_display(accumulated_state), format_state_json(accumulated_state)


def process_audio_message(audio_path: Optional[str], history: list) -> tuple:
    """Process an audio message."""
    global accumulated_state

    if audio_path is None:
        return history, format_state_display(accumulated_state), format_state_json(accumulated_state)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Get audio file info
    file_size = os.path.getsize(audio_path) if os.path.exists(audio_path) else 0

    # Mock transcription (in production, use a real speech-to-text service)
    mock_transcription = "Audio message received and processed"

    msg = ChatMessage(
        id=generate_message_id(),
        type=MessageType.AUDIO,
        content=mock_transcription,
        timestamp=timestamp,
        metadata={
            "file_path": audio_path,
            "file_size": file_size,
            "transcription": mock_transcription
        }
    )

    accumulated_state.messages.append(msg)
    accumulated_state.audio_count += 1

    # Add to chat history
    history.append({"role": "user", "content": f"🎤 [Audio Message - {file_size} bytes]"})
    response = f"Received audio message. Transcription: '{mock_transcription}'"
    history.append({"role": "assistant", "content": response})

    return history, format_state_display(accumulated_state), format_state_json(accumulated_state)


def process_image_message(image, history: list) -> tuple:
    """Process an image message."""
    global accumulated_state

    if image is None:
        return history, format_state_display(accumulated_state), format_state_json(accumulated_state)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Get image info
    if hasattr(image, 'shape'):
        height, width = image.shape[:2]
        image_info = f"{width}x{height}"
    else:
        image_info = "unknown dimensions"

    # Mock image analysis
    mock_features = ["object detected", "colors analyzed", "scene recognized"]

    msg = ChatMessage(
        id=generate_message_id(),
        type=MessageType.IMAGE,
        content=f"Image uploaded: {image_info}",
        timestamp=timestamp,
        metadata={
            "dimensions": image_info,
            "detected_features": mock_features
        }
    )

    accumulated_state.messages.append(msg)
    accumulated_state.image_count += 1

    # Add topic for image
    if "visual" not in accumulated_state.topics:
        accumulated_state.topics.append("visual")

    # Add to chat history
    history.append({"role": "user", "content": f"🖼️ [Image uploaded - {image_info}]"})
    response = f"Received image ({image_info}). Detected features: {', '.join(mock_features)}"
    history.append({"role": "assistant", "content": response})

    return history, format_state_display(accumulated_state), format_state_json(accumulated_state)


def process_snippet_message(snippet: str, language: str, history: list) -> tuple:
    """Process a code snippet message."""
    global accumulated_state

    if not snippet.strip():
        return history, format_state_display(accumulated_state), format_state_json(accumulated_state)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Count lines
    line_count = len(snippet.strip().split('\n'))

    msg = ChatMessage(
        id=generate_message_id(),
        type=MessageType.SNIPPET,
        content=snippet,
        timestamp=timestamp,
        metadata={
            "language": language,
            "line_count": line_count,
            "char_count": len(snippet)
        }
    )

    accumulated_state.messages.append(msg)
    accumulated_state.snippet_count += 1

    # Add topic for code
    if "code" not in accumulated_state.topics:
        accumulated_state.topics.append("code")
    if language and language not in accumulated_state.topics:
        accumulated_state.topics.append(language)

    # Add to chat history
    history.append({"role": "user", "content": f"📝 [Code Snippet - {language}]\n```{language}\n{snippet}\n```"})
    response = f"Received {language} code snippet ({line_count} lines, {len(snippet)} characters)."
    history.append({"role": "assistant", "content": response})

    return history, format_state_display(accumulated_state), format_state_json(accumulated_state)


def clear_state() -> tuple:
    """Clear all accumulated state."""
    global accumulated_state, message_counter
    accumulated_state = AccumulatedState()
    message_counter = 0
    return [], format_state_display(accumulated_state), format_state_json(accumulated_state)


def create_interface():
    """Create the Gradio interface."""

    with gr.Blocks(
        title="Dual-Panel Chat Interface",
        theme=gr.themes.Soft(),
        css="""
            .container { max-width: 1400px; margin: auto; }
            .chat-panel { border-right: 1px solid #e0e0e0; }
            .state-panel { background: #f8f9fa; }
            .input-tabs { margin-top: 10px; }
            .header {
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 10px;
                margin-bottom: 20px;
            }
            .stats-box {
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
        """
    ) as demo:

        # Header
        gr.HTML("""
            <div class="header">
                <h1>🗨️ Dual-Panel Chat Interface</h1>
                <p>Send text, audio, images, or code snippets • View accumulated state in real-time</p>
            </div>
        """)

        with gr.Row():
            # Left Panel - Chat Interface
            with gr.Column(scale=1, elem_classes=["chat-panel"]):
                gr.Markdown("## 💬 Chat Interface")

                chatbot = gr.Chatbot(
                    label="Conversation",
                    height=400,
                    type="messages",
                    show_copy_button=True
                )

                # Input tabs for different message types
                with gr.Tabs(elem_classes=["input-tabs"]):

                    # Text Input Tab
                    with gr.TabItem("💬 Text", id="text-tab"):
                        text_input = gr.Textbox(
                            label="Message",
                            placeholder="Type your message here...",
                            lines=2,
                            max_lines=5
                        )
                        text_btn = gr.Button("Send Text", variant="primary")

                    # Audio Input Tab
                    with gr.TabItem("🎤 Audio", id="audio-tab"):
                        audio_input = gr.Audio(
                            label="Record or Upload Audio",
                            sources=["microphone", "upload"],
                            type="filepath"
                        )
                        audio_btn = gr.Button("Send Audio", variant="primary")

                    # Image Input Tab
                    with gr.TabItem("🖼️ Image", id="image-tab"):
                        image_input = gr.Image(
                            label="Upload Image",
                            type="numpy",
                            sources=["upload", "clipboard"]
                        )
                        image_btn = gr.Button("Send Image", variant="primary")

                    # Snippet Input Tab
                    with gr.TabItem("📝 Snippet", id="snippet-tab"):
                        language_dropdown = gr.Dropdown(
                            label="Language",
                            choices=["python", "javascript", "typescript", "java", "c++",
                                   "rust", "go", "html", "css", "sql", "bash", "json", "yaml"],
                            value="python"
                        )
                        snippet_input = gr.Code(
                            label="Code Snippet",
                            language="python",
                            lines=8
                        )
                        snippet_btn = gr.Button("Send Snippet", variant="primary")

                # Clear button
                clear_btn = gr.Button("🗑️ Clear All", variant="secondary")

            # Right Panel - Accumulated State
            with gr.Column(scale=1, elem_classes=["state-panel"]):
                gr.Markdown("## 📊 Accumulated State")

                with gr.Tabs():
                    with gr.TabItem("📋 Summary"):
                        state_display = gr.Markdown(
                            value=format_state_display(accumulated_state),
                            label="State Summary"
                        )

                    with gr.TabItem("🔧 Raw JSON"):
                        state_json = gr.Code(
                            value=format_state_json(accumulated_state),
                            language="json",
                            label="State JSON",
                            lines=20
                        )

        # Event handlers
        text_btn.click(
            fn=process_text_message,
            inputs=[text_input, chatbot],
            outputs=[chatbot, state_display, state_json]
        ).then(
            fn=lambda: "",
            outputs=[text_input]
        )

        text_input.submit(
            fn=process_text_message,
            inputs=[text_input, chatbot],
            outputs=[chatbot, state_display, state_json]
        ).then(
            fn=lambda: "",
            outputs=[text_input]
        )

        audio_btn.click(
            fn=process_audio_message,
            inputs=[audio_input, chatbot],
            outputs=[chatbot, state_display, state_json]
        ).then(
            fn=lambda: None,
            outputs=[audio_input]
        )

        image_btn.click(
            fn=process_image_message,
            inputs=[image_input, chatbot],
            outputs=[chatbot, state_display, state_json]
        ).then(
            fn=lambda: None,
            outputs=[image_input]
        )

        snippet_btn.click(
            fn=process_snippet_message,
            inputs=[snippet_input, language_dropdown, chatbot],
            outputs=[chatbot, state_display, state_json]
        ).then(
            fn=lambda: "",
            outputs=[snippet_input]
        )

        # Update code language when dropdown changes
        language_dropdown.change(
            fn=lambda lang: gr.update(language=lang),
            inputs=[language_dropdown],
            outputs=[snippet_input]
        )

        clear_btn.click(
            fn=clear_state,
            outputs=[chatbot, state_display, state_json]
        )

    return demo


if __name__ == "__main__":
    demo = create_interface()
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
