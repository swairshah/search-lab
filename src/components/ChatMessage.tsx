import { motion } from 'framer-motion';

export type MessageType = 'text' | 'audio' | 'image' | 'snippet';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  metadata?: Record<string, unknown>;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return <p className="message-text">{message.content}</p>;

      case 'audio':
        return (
          <div className="message-audio">
            <div className="audio-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <div className="audio-info">
              <span className="audio-duration">
                {((message.metadata?.duration as number) || 0).toFixed(1)}s
              </span>
              <span className="audio-transcription">
                "{message.metadata?.transcription}"
              </span>
            </div>
            <audio src={message.content} controls className="audio-player" />
          </div>
        );

      case 'image':
        return (
          <div className="message-image">
            <img src={message.content} alt="Uploaded" className="image-preview" />
            {message.metadata?.features && (
              <div className="image-features">
                {(message.metadata.features as string[]).map((feature, i) => (
                  <span key={i} className="feature-tag">{feature}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'snippet':
        return (
          <div className="message-snippet">
            <div className="snippet-header">
              <span className="snippet-language">{message.metadata?.language || 'code'}</span>
              <span className="snippet-stats">
                {message.metadata?.lineCount} lines
              </span>
            </div>
            <pre className="snippet-code">
              <code>{message.content}</code>
            </pre>
          </div>
        );

      default:
        return <p className="message-text">{message.content}</p>;
    }
  };

  const getTypeIcon = () => {
    switch (message.type) {
      case 'audio':
        return '🎤';
      case 'image':
        return '🖼️';
      case 'snippet':
        return '📝';
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`chat-message ${isUser ? 'user' : 'assistant'}`}
    >
      <div className="message-avatar">
        {isUser ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
          </svg>
        )}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
          {message.type !== 'text' && (
            <span className="message-type-badge">{getTypeIcon()}</span>
          )}
          <span className="message-time">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {renderContent()}
      </div>
    </motion.div>
  );
}
