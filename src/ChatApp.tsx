import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './components/ThemeToggle';
import { AudioRecorder } from './components/AudioRecorder';
import { ImageUpload } from './components/ImageUpload';
import { ChatMessage, type Message, type MessageType } from './components/ChatMessage';
import { StatePanel, type AccumulatedPanel } from './components/StatePanel';

// API response types
interface ApiMessage {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  role: string;
  metadata?: Record<string, unknown>;
}

interface ApiAccumulatedPanel {
  title: string;
  content: string;
}

interface ChatApiResponse {
  message: ApiMessage;
  state: Record<string, unknown>;
  accumulated: ApiAccumulatedPanel[];
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [accumulatedPanels, setAccumulatedPanels] = useState<AccumulatedPanel[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Load initial state from API
  useEffect(() => {
    fetch('/api/chat/state')
      .then(res => res.json())
      .then(data => {
        if (data.accumulated) {
          setAccumulatedPanels(data.accumulated);
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
      setAccumulatedPanels(data.accumulated || []);
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
      textInputRef.current?.focus();
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
      setAccumulatedPanels(data.accumulated || []);
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
      setAccumulatedPanels(data.accumulated || []);
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

  const clearChat = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/clear', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to clear chat');

      const data = await response.json();
      setMessages([]);
      setAccumulatedPanels(data.accumulated || []);
    } catch (error) {
      console.error('Error clearing chat:', error);
      // Clear locally anyway
      setMessages([]);
      setAccumulatedPanels([]);
    }
    textInputRef.current?.focus();
  }, []);

  return (
    <div className="chat-app">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="app-title">Conv Lab</span>
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
                  <p>Start a conversation</p>
                  <p style={{ fontSize: '11px', marginTop: '8px' }}>
                    Send text, audio, or images
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
          </div>
        </div>

        {/* Right Panel - Accumulated State */}
        <StatePanel
          panels={accumulatedPanels}
          onClear={clearChat}
        />
      </div>
    </div>
  );
}

export default ChatApp;
