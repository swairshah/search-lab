import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './components/ThemeToggle';
import { AudioRecorder } from './components/AudioRecorder';
import { ImageUpload } from './components/ImageUpload';
import { ChatMessage, type Message, type MessageType } from './components/ChatMessage';
import { SnippetInput } from './components/SnippetInput';
import { StatePanel, type AccumulatedState } from './components/StatePanel';

type InputMode = 'text' | 'audio' | 'image' | 'snippet';

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
          // Clear all
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

  const extractKeywords = (text: string): string[] => {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she',
      'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom']);

    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    return [...new Set(words.filter(w => !stopWords.has(w)))].slice(0, 10);
  };

  const updateState = useCallback((type: MessageType, content: string, language?: string) => {
    setAccumulatedState(prev => {
      const newState = { ...prev, messageCount: prev.messageCount + 1 };

      switch (type) {
        case 'text':
          newState.textCount = prev.textCount + 1;
          const keywords = extractKeywords(content);
          newState.keywords = [...new Set([...prev.keywords, ...keywords])].slice(0, 20);
          break;
        case 'audio':
          newState.audioCount = prev.audioCount + 1;
          if (!prev.topics.includes('voice')) {
            newState.topics = [...prev.topics, 'voice'];
          }
          break;
        case 'image':
          newState.imageCount = prev.imageCount + 1;
          if (!prev.topics.includes('visual')) {
            newState.topics = [...prev.topics, 'visual'];
          }
          break;
        case 'snippet':
          newState.snippetCount = prev.snippetCount + 1;
          if (!prev.topics.includes('code')) {
            newState.topics = [...prev.topics, 'code'];
          }
          if (language && !prev.codeLanguages.includes(language)) {
            newState.codeLanguages = [...prev.codeLanguages, language];
          }
          break;
      }

      return newState;
    });
  }, []);

  const addMessage = useCallback((type: MessageType, content: string, metadata?: Record<string, unknown>) => {
    const message: Message = {
      id: generateId(),
      type,
      content,
      timestamp: new Date(),
      role: 'user',
      metadata,
    };

    setMessages(prev => [...prev, message]);
    updateState(type, content, metadata?.language as string);

    // Simulate assistant response
    setIsProcessing(true);
    setTimeout(() => {
      const responseContent = generateResponse(type, content, metadata);
      const response: Message = {
        id: generateId(),
        type: 'text',
        content: responseContent,
        timestamp: new Date(),
        role: 'assistant',
      };
      setMessages(prev => [...prev, response]);
      setIsProcessing(false);
    }, 500 + Math.random() * 500);
  }, [updateState]);

  const generateResponse = (type: MessageType, content: string, metadata?: Record<string, unknown>): string => {
    switch (type) {
      case 'text':
        return `Received your message. Extracted keywords and updated the conversation state.`;
      case 'audio':
        return `Received audio message (${((metadata?.duration as number) || 0).toFixed(1)}s). Transcription: "${metadata?.transcription || 'Processing...'}"`;
      case 'image':
        return `Received image. Detected features: ${(metadata?.features as string[])?.join(', ') || 'analyzing...'}`;
      case 'snippet':
        return `Received ${metadata?.language || 'code'} snippet (${(metadata?.lineCount as number) || 0} lines). Added to state.`;
      default:
        return 'Message received.';
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    addMessage('text', inputText.trim());
    setInputText('');
  };

  const handleAudioCapture = useCallback((audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    // Mock transcription
    const mockTranscriptions = [
      'Show me the latest products',
      'Search for diamond rings',
      'I need a gold necklace',
      'What are the trending items',
    ];
    const transcription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];

    addMessage('audio', audioUrl, {
      transcription,
      duration: Math.random() * 5 + 1,
      mimeType: audioBlob.type,
    });
  }, [addMessage]);

  const handleImageCapture = useCallback((imageFile: File) => {
    const imageUrl = URL.createObjectURL(imageFile);
    // Mock feature detection
    const mockFeatures = [
      ['jewelry', 'gold', 'elegant'],
      ['ring', 'diamond', 'sparkle'],
      ['necklace', 'silver', 'pendant'],
      ['bracelet', 'modern', 'minimalist'],
    ];
    const features = mockFeatures[Math.floor(Math.random() * mockFeatures.length)];

    addMessage('image', imageUrl, {
      features,
      fileName: imageFile.name,
      fileSize: imageFile.size,
    });
  }, [addMessage]);

  const handleSnippetSubmit = useCallback((code: string, language: string) => {
    addMessage('snippet', code, {
      language,
      lineCount: code.split('\n').length,
      charCount: code.length,
    });
  }, [addMessage]);

  const clearChat = useCallback(() => {
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
