import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Message } from './ChatMessage';

export interface AccumulatedState {
  messageCount: number;
  textCount: number;
  audioCount: number;
  imageCount: number;
  snippetCount: number;
  keywords: string[];
  topics: string[];
  codeLanguages: string[];
}

interface StatePanelProps {
  state: AccumulatedState;
  messages: Message[];
  onClear: () => void;
}

type ViewMode = 'summary' | 'json' | 'history';

export function StatePanel({ state, messages, onClear }: StatePanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  const stateJson = JSON.stringify({
    ...state,
    messages: messages.map(m => ({
      id: m.id,
      type: m.type,
      timestamp: m.timestamp.toISOString(),
      role: m.role,
      contentPreview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
      metadata: m.metadata,
    })),
  }, null, 2);

  return (
    <div className="state-panel">
      <div className="state-header">
        <h2 className="state-title">Accumulated State</h2>
        <button className="clear-btn" onClick={onClear} title="Clear all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="state-tabs">
        {(['summary', 'json', 'history'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            className={`state-tab ${viewMode === mode ? 'active' : ''}`}
            onClick={() => setViewMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <div className="state-content">
        {viewMode === 'summary' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="state-summary"
          >
            {/* Statistics */}
            <div className="stat-section">
              <h3 className="stat-title">Statistics</h3>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-value">{state.messageCount}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">💬</span>
                  <span className="stat-value">{state.textCount}</span>
                  <span className="stat-label">Text</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">🎤</span>
                  <span className="stat-value">{state.audioCount}</span>
                  <span className="stat-label">Audio</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">🖼️</span>
                  <span className="stat-value">{state.imageCount}</span>
                  <span className="stat-label">Images</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">📝</span>
                  <span className="stat-value">{state.snippetCount}</span>
                  <span className="stat-label">Snippets</span>
                </div>
              </div>
            </div>

            {/* Keywords */}
            {state.keywords.length > 0 && (
              <div className="stat-section">
                <h3 className="stat-title">Extracted Keywords</h3>
                <div className="tag-list">
                  {state.keywords.map((keyword, i) => (
                    <span key={i} className="keyword-tag">{keyword}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {state.topics.length > 0 && (
              <div className="stat-section">
                <h3 className="stat-title">Topics</h3>
                <div className="tag-list">
                  {state.topics.map((topic, i) => (
                    <span key={i} className="topic-tag">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Code Languages */}
            {state.codeLanguages.length > 0 && (
              <div className="stat-section">
                <h3 className="stat-title">Languages Used</h3>
                <div className="tag-list">
                  {state.codeLanguages.map((lang, i) => (
                    <span key={i} className="lang-tag">{lang}</span>
                  ))}
                </div>
              </div>
            )}

            {state.messageCount === 0 && (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">📊</div>
                <p>No data yet</p>
                <p style={{ fontSize: '11px', marginTop: '8px' }}>
                  Send messages to see accumulated state
                </p>
              </div>
            )}
          </motion.div>
        )}

        {viewMode === 'json' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="state-json"
          >
            <pre className="json-content">{stateJson}</pre>
          </motion.div>
        )}

        {viewMode === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="state-history"
          >
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">📜</div>
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="history-list">
                {[...messages].reverse().map((msg, i) => (
                  <div key={msg.id} className="history-item">
                    <span className="history-icon">
                      {msg.type === 'text' && '💬'}
                      {msg.type === 'audio' && '🎤'}
                      {msg.type === 'image' && '🖼️'}
                      {msg.type === 'snippet' && '📝'}
                    </span>
                    <span className="history-role">{msg.role}</span>
                    <span className="history-preview">
                      {msg.content.substring(0, 40)}{msg.content.length > 40 ? '...' : ''}
                    </span>
                    <span className="history-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="history-index">#{messages.length - i}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
