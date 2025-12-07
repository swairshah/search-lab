import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SearchPane } from './components/SearchPane';
import { ThemeToggle } from './components/ThemeToggle';
import { AudioRecorder } from './components/AudioRecorder';
import { ImageUpload } from './components/ImageUpload';
import { SearchPreview, type SearchMode, type QueryInfo } from './components/SearchPreview';
import { SearchModeToggle } from './components/SearchModeToggle';

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  score: number;
  category?: string;
  badge?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  method: string;
  latency_ms: number;
  transcription?: string;
  rewritten_query?: string;
  detected_features?: string[];
}

type SearchMethod = 'keyword' | 'fuzzy' | 'semantic';
type SearchFlowMode = 'oneshot' | 'conversational';

const SEARCH_METHODS: { key: SearchMethod; label: string; description: string }[] = [
  { key: 'keyword', label: 'Keyword', description: 'Exact word matching' },
  { key: 'fuzzy', label: 'Fuzzy', description: 'Partial string matching' },
  { key: 'semantic', label: 'Semantic', description: 'Vector similarity (mock)' },
];

interface ConversationEntry {
  id: string;
  mode: SearchMode;
  queryInfo: QueryInfo;
  timestamp: number;
}

function App() {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [searchFlowMode, setSearchFlowMode] = useState<SearchFlowMode>('oneshot');
  const [queryInfo, setQueryInfo] = useState<QueryInfo | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [results, setResults] = useState<Record<SearchMethod, SearchResponse | null>>({
    keyword: null,
    fuzzy: null,
    semantic: null,
  });
  const [loading, setLoading] = useState<Record<SearchMethod, boolean>>({
    keyword: false,
    fuzzy: false,
    semantic: false,
  });
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if Cmd/Ctrl is pressed
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd+Shift+K to clear
          clearSearch();
        } else {
          // Cmd+K to focus search
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setQueryInfo(null);
    setConversationHistory([]);
    setResults({ keyword: null, fuzzy: null, semantic: null });
    setHasSearched(false);
    searchInputRef.current?.focus();
  }, []);

  const runSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newQueryInfo: QueryInfo = { original: searchQuery };

    setSearchMode('text');
    setHasSearched(true);
    setLoading({ keyword: true, fuzzy: true, semantic: true });
    setQueryInfo(newQueryInfo);

    // Add to conversation history in conversational mode
    if (searchFlowMode === 'conversational') {
      setConversationHistory(prev => [...prev, {
        id: Date.now().toString(),
        mode: 'text',
        queryInfo: newQueryInfo,
        timestamp: Date.now(),
      }]);
    }

    // Run all searches in parallel
    const searches = SEARCH_METHODS.map(async ({ key }) => {
      try {
        const response = await fetch(`/api/search/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });

        if (!response.ok) throw new Error(`Search failed: ${response.status}`);

        const data: SearchResponse = await response.json();
        setResults(prev => ({ ...prev, [key]: data }));

        // Update query info with rewritten query if available
        if (data.rewritten_query) {
          setQueryInfo(prev => prev ? { ...prev, rewritten: data.rewritten_query } : null);
          // Also update in conversation history
          if (searchFlowMode === 'conversational') {
            setConversationHistory(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  queryInfo: { ...updated[updated.length - 1].queryInfo, rewritten: data.rewritten_query },
                };
              }
              return updated;
            });
          }
        }
      } catch (error) {
        console.error(`${key} search failed:`, error);
        setResults(prev => ({ ...prev, [key]: { results: [], method: key, latency_ms: 0 } }));
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    });

    await Promise.all(searches);
  }, [searchFlowMode]);

  const runAudioSearch = useCallback(async (audioBlob: Blob) => {
    setSearchMode('audio');
    setHasSearched(true);
    setLoading({ keyword: true, fuzzy: true, semantic: true });
    setQuery('');

    // Create audio URL for preview
    const audioUrl = URL.createObjectURL(audioBlob);
    const newQueryInfo: QueryInfo = { original: '(transcribing...)', audioUrl };
    setQueryInfo(newQueryInfo);

    // Add placeholder to conversation history in conversational mode
    const entryId = Date.now().toString();
    if (searchFlowMode === 'conversational') {
      setConversationHistory(prev => [...prev, {
        id: entryId,
        mode: 'audio',
        queryInfo: newQueryInfo,
        timestamp: Date.now(),
      }]);
    }

    // Run all searches in parallel with audio
    const searches = SEARCH_METHODS.map(async ({ key }) => {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch(`/api/search/${key}/audio`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Audio search failed: ${response.status}`);

        const data: SearchResponse = await response.json();
        setResults(prev => ({ ...prev, [key]: data }));

        // Update query info with transcription
        if (data.transcription) {
          const updatedQueryInfo = {
            original: data.transcription!,
            audioUrl,
            rewritten: data.rewritten_query,
          };
          setQueryInfo(prev => ({ ...prev, ...updatedQueryInfo }));
          // Also update in conversation history
          if (searchFlowMode === 'conversational') {
            setConversationHistory(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(e => e.id === entryId);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], queryInfo: { ...updated[idx].queryInfo, ...updatedQueryInfo } };
              }
              return updated;
            });
          }
        }
      } catch (error) {
        console.error(`${key} audio search failed:`, error);
        setResults(prev => ({ ...prev, [key]: { results: [], method: key, latency_ms: 0 } }));
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    });

    await Promise.all(searches);
  }, [searchFlowMode]);

  const runImageSearch = useCallback(async (imageFile: File) => {
    setSearchMode('image');
    setHasSearched(true);
    setLoading({ keyword: true, fuzzy: true, semantic: true });
    setQuery('');

    // Create image URL for preview
    const imageUrl = URL.createObjectURL(imageFile);
    const newQueryInfo: QueryInfo = { original: '(analyzing image...)', imageUrl };
    setQueryInfo(newQueryInfo);

    // Add placeholder to conversation history in conversational mode
    const entryId = Date.now().toString();
    if (searchFlowMode === 'conversational') {
      setConversationHistory(prev => [...prev, {
        id: entryId,
        mode: 'image',
        queryInfo: newQueryInfo,
        timestamp: Date.now(),
      }]);
    }

    // Run all searches in parallel with image
    const searches = SEARCH_METHODS.map(async ({ key }) => {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await fetch(`/api/search/${key}/image`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Image search failed: ${response.status}`);

        const data: SearchResponse = await response.json();
        setResults(prev => ({ ...prev, [key]: data }));

        // Update query info with detected features
        if (data.detected_features) {
          const updatedQueryInfo = {
            original: data.detected_features!.join(', '),
            imageUrl,
          };
          setQueryInfo(prev => ({ ...prev, ...updatedQueryInfo }));
          // Also update in conversation history
          if (searchFlowMode === 'conversational') {
            setConversationHistory(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(e => e.id === entryId);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], queryInfo: { ...updated[idx].queryInfo, ...updatedQueryInfo } };
              }
              return updated;
            });
          }
        }
      } catch (error) {
        console.error(`${key} image search failed:`, error);
        setResults(prev => ({ ...prev, [key]: { results: [], method: key, latency_ms: 0 } }));
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    });

    await Promise.all(searches);
  }, [searchFlowMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
    // Clear input in conversational mode for next turn
    if (searchFlowMode === 'conversational') {
      setQuery('');
    }
  };

  const isLoading = Object.values(loading).some(Boolean);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="app-title">Search Lab</span>
          <SearchModeToggle mode={searchFlowMode} onChange={setSearchFlowMode} />
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

      {/* Search Section */}
      <section className="search-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '1200px' }}>
          <form className="search-form" onSubmit={handleSubmit} style={{ flex: hasSearched && queryInfo ? '0 0 auto' : '1' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <AudioRecorder onAudioCapture={runAudioSearch} disabled={isLoading} />
              <ImageUpload onImageCapture={runImageSearch} disabled={isLoading} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: diamond ring, gold necklace, luxury gift, vintage..."
            />
            <button
              type="submit"
              className="search-button"
              disabled={!query.trim() || isLoading}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Preview - inline for oneshot, or show current in conversational */}
          {hasSearched && queryInfo && searchFlowMode === 'oneshot' && (
            <SearchPreview mode={searchMode} queryInfo={queryInfo} isVisible={true} />
          )}
        </div>
      </section>

      {/* Conversation History - expandable in conversational mode */}
      {searchFlowMode === 'conversational' && conversationHistory.length > 0 && (
        <div style={{
          padding: '12px 24px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{
            display: 'flex',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}>
            {/* Query History - left side */}
            <div style={{
              flex: '1 1 50%',
              maxHeight: '160px',
              overflowY: 'auto',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--color-text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Query History ({conversationHistory.length})
                </span>
                <button
                  onClick={clearSearch}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-dim)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Clear all
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[...conversationHistory].reverse().map((entry, reverseIndex) => {
                  const originalIndex = conversationHistory.length - 1 - reverseIndex;
                  const isLatest = reverseIndex === 0;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        background: isLatest ? 'var(--color-bg)' : 'transparent',
                        border: isLatest ? '1px solid var(--color-border)' : '1px solid transparent',
                        borderRadius: '4px',
                      }}
                    >
                      {/* Mode icon */}
                      <span style={{ color: 'var(--color-accent)', flexShrink: 0, display: 'flex' }}>
                        {entry.mode === 'text' && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        )}
                        {entry.mode === 'audio' && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          </svg>
                        )}
                        {entry.mode === 'image' && entry.queryInfo.imageUrl && (
                          <img
                            src={entry.queryInfo.imageUrl}
                            alt=""
                            style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'cover' }}
                          />
                        )}
                      </span>
                      {/* Query text */}
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-text)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.queryInfo.original}
                      </span>
                      {/* Step number */}
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--color-text-dim)',
                        flexShrink: 0,
                      }}>
                        #{originalIndex + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refined Query - right side */}
            <div style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                Refined Query
              </span>
              <div style={{
                flex: 1,
                padding: '12px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-text)',
                maxHeight: '140px',
                overflowY: 'auto',
              }}>
                {/* Combine all queries into refined state */}
                {conversationHistory.map((entry, index) => {
                  const text = entry.queryInfo.rewritten || entry.queryInfo.original;
                  return (
                    <span key={entry.id}>
                      {index > 0 && <span style={{ color: 'var(--color-text-dim)' }}> + </span>}
                      <span style={{
                        color: entry.mode === 'image' ? 'var(--color-accent)' : 'inherit',
                        fontStyle: entry.mode === 'audio' ? 'italic' : 'normal',
                      }}>
                        {text}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid - 3 columns */}
      <div className="results-grid">
        {SEARCH_METHODS.map(({ key, label, description }) => (
          <motion.div
            key={key}
            className="result-pane"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <SearchPane
              title={label}
              description={description}
              results={results[key]?.results ?? []}
              latencyMs={results[key]?.latency_ms}
              isLoading={loading[key]}
              hasSearched={hasSearched}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default App;
