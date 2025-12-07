import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './components/ThemeToggle';
import { AudioRecorder } from './components/AudioRecorder';
import { ImageUpload } from './components/ImageUpload';
import { ChatMessage, type Message, type MessageType } from './components/ChatMessage';
import { SnippetInput } from './components/SnippetInput';
import { StatePanel, type AccumulatedState } from './components/StatePanel';

type InputMode = 'text' | 'audio' | 'image' | 'snippet';

// API response types
interface ApiState {
  message_count: number;
  text_count: number;
  audio_count: number;
  image_count: number;
  snippet_count: number;
  keywords: string[];
  topics: string[];
  code_languages: string[];
}

interface ApiMessage {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  role: string;
  metadata?: Record<string, unknown>;
}

interface ChatApiResponse {
  message: ApiMessage;
  state: ApiState;
}

// Convert API state to frontend state
function convertState(apiState: ApiState): AccumulatedState {
  return {
    messageCount: apiState.message_count,
    textCount: apiState.text_count,
    audioCount: apiState.audio_count,
    imageCount: apiState.image_count,
    snippetCount: apiState.snippet_count,
    keywords: apiState.keywords,
    topics: apiState.topics,
    codeLanguages: apiState.code_languages,
  };
}

// Convert API message to frontend message
function convertMessage(apiMsg: ApiMessage): Message {
  return {
    id: apiMsg.id,
    type: apiMsg.type as MessageType,
    content: apiMsg.content,
    timestamp: new Date(apiMsg.timestamp),
    role: apiMsg.role as 'user' | 'assistant',
    metadata: apiMsg.metadata,
  };
}

function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [accumulatedState, setAccumulatedState] = useState<AccumulatedState>({
    messageCount: 0,
    textCount: 0,
    audioCount: 0,
    imageCount: 0,
    snippetCount: 0,
    keywords: [],
    topics: [],
    codeLanguages: [],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Load initial state from API
  useEffect(() => {
    fetch('/api/chat/state')
      .then(res => res.json())
      .then(data => {
        if (data.state) {
          setAccumulatedState(convertState(data.state));
        }
        if (data.messages) {
          setMessages(data.messages.map(convertMessage));
        }
      })
      .catch(err => console.error('Failed to load state:', err));
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcut to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (e.shiftKey) {
          clearChat();
        } else {
          textInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const content = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    // Add user message optimistically
    const userMessage: Message = {
      id: generateId(),
      type: 'text',
      content,
      timestamp: new Date(),
      role: 'user',
      metadata: { length: content.length },
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data: ChatApiResponse = await response.json();

      // Add assistant response
      setMessages(prev => [...prev, convertMessage(data.message)]);
      setAccumulatedState(convertState(data.state));
    } catch (error) {
      console.error('Error sending text message:', error);
      // Add error message
      setMessages(prev => [...prev, {
        id: generateId(),
        type: 'text',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date(),
        role: 'assistant',
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioCapture = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);

    // Add user message optimistically
    const audioUrl = URL.createObjectURL(audioBlob);
    const userMessage: Message = {
      id: generateId(),
      type: 'audio',
      content: audioUrl,
      timestamp: new Date(),
      role: 'user',
      metadata: { transcription: '(transcribing...)', mimeType: audioBlob.type },
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/chat/audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send audio');

      const data: ChatApiResponse = await response.json();

      // Update user message with transcription from response
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? { ...msg, metadata: { ...msg.metadata, ...data.message.metadata } }
          : msg
      ));

      // Add assistant response
      setMessages(prev => [...prev, convertMessage(data.message)]);
      setAccumulatedState(convertState(data.state));
    } catch (error) {
      console.error('Error sending audio message:', error);
      setMessages(prev => [...prev, {
        id: generateId(),
        type: 'text',
        content: 'Failed to process audio. Please try again.',
        timestamp: new Date(),
        role: 'assistant',
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleImageCapture = useCallback(async (imageFile: File) => {
    setIsProcessing(true);

    // Add user message optimistically
    const imageUrl = URL.createObjectURL(imageFile);
    const userMessage: Message = {
      id: generateId(),
      type: 'image',
      content: imageUrl,
      timestamp: new Date(),
      role: 'user',
      metadata: { features: ['analyzing...'], fileName: imageFile.name },
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/chat/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send image');

      const data: ChatApiResponse = await response.json();

      // Update user message with features from response
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? { ...msg, metadata: { ...msg.metadata, features: data.message.metadata?.features } }
          : msg
      ));

      // Add assistant response
      setMessages(prev => [...prev, convertMessage(data.message)]);
      setAccumulatedState(convertState(data.state));
    } catch (error) {
      console.error('Error sending image message:', error);
      setMessages(prev => [...prev, {
        id: generateId(),
        type: 'text',
        content: 'Failed to process image. Please try again.',
        timestamp: new Date(),
        role: 'assistant',
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSnippetSubmit = useCallback(async (code: string, language: string) => {
    setIsProcessing(true);

    // Add user message optimistically
    const userMessage: Message = {
      id: generateId(),
      type: 'snippet',
      content: code,
      timestamp: new Date(),
      role: 'user',
      metadata: { language, lineCount: code.split('\n').length, charCount: code.length },
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: code, language }),
      });

      if (!response.ok) throw new Error('Failed to send snippet');

      const data: ChatApiResponse = await response.json();

      // Add assistant response
      setMessages(prev => [...prev, convertMessage(data.message)]);
      setAccumulatedState(convertState(data.state));
    } catch (error) {
      console.error('Error sending snippet:', error);
      setMessages(prev => [...prev, {
        id: generateId(),
        type: 'text',
        content: 'Failed to process snippet. Please try again.',
        timestamp: new Date(),
        role: 'assistant',
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearChat = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/clear', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to clear chat');

      const data = await response.json();
      setMessages([]);
      setAccumulatedState(convertState(data.state));
    } catch (error) {
      console.error('Error clearing chat:', error);
      // Clear locally anyway
      setMessages([]);
      setAccumulatedState({
        messageCount: 0,
        textCount: 0,
        audioCount: 0,
        imageCount: 0,
        snippetCount: 0,
        keywords: [],
        topics: [],
        codeLanguages: [],
      });
    }
    textInputRef.current?.focus();
  }, []);

  const inputModes: { key: InputMode; label: string; icon: JSX.Element }[] = [
    {
      key: 'text',
      label: 'Text',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    },
    {
      key: 'snippet',
      label: 'Snippet',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
  ];

  return (
    <div className="chat-app">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="app-title">Chat Interface</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-dim)',
          }}>
            ⌘K focus · ⌘⇧K clear
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - Dual Panel */}
      <div className="chat-main">
        {/* Left Panel - Chat */}
        <div className="chat-panel">
          {/* Messages Area */}
          <div className="chat-messages">
            <AnimatePresence>
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <p>Start a conversation</p>
                  <p style={{ fontSize: '11px', marginTop: '8px' }}>
                    Send text, audio, images, or code snippets
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
            </AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="typing-indicator"
              >
                <span></span>
                <span></span>
                <span></span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            {/* Mode Tabs */}
            <div className="input-mode-tabs">
              {inputModes.map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`mode-tab ${inputMode === key ? 'active' : ''}`}
                  onClick={() => setInputMode(key)}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Input based on mode */}
            {inputMode === 'text' && (
              <form className="text-input-form" onSubmit={handleTextSubmit}>
                <div className="input-row">
                  <AudioRecorder onAudioCapture={handleAudioCapture} disabled={isProcessing} />
                  <ImageUpload onImageCapture={handleImageCapture} disabled={isProcessing} />
                  <textarea
                    ref={textInputRef}
                    className="chat-text-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextSubmit(e);
                      }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={!inputText.trim() || isProcessing}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </form>
            )}

            {inputMode === 'snippet' && (
              <SnippetInput onSubmit={handleSnippetSubmit} disabled={isProcessing} />
            )}
          </div>
        </div>

        {/* Right Panel - Accumulated State */}
        <StatePanel
          state={accumulatedState}
          messages={messages}
          onClear={clearChat}
        />
      </div>
    </div>
  );
}

export default ChatApp;
