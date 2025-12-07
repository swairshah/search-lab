import { motion, AnimatePresence } from 'framer-motion';

export type SearchMode = 'text' | 'audio' | 'image';

export interface QueryInfo {
  original: string;
  rewritten?: string;
  imageUrl?: string;
  audioUrl?: string;
}

interface SearchPreviewProps {
  mode: SearchMode;
  queryInfo: QueryInfo | null;
  isVisible: boolean;
}

export function SearchPreview({ mode, queryInfo, isVisible }: SearchPreviewProps) {
  if (!isVisible || !queryInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          flex: '1 1 auto',
          minWidth: 0,
        }}
      >
        {/* Image preview */}
        {mode === 'image' && queryInfo.imageUrl && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1px solid var(--color-border)',
            }}
          >
            <img
              src={queryInfo.imageUrl}
              alt="Search image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Audio icon */}
        {mode === 'audio' && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--color-accent)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
        )}

        {/* Query info */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Original query - single line */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ color: 'var(--color-text-dim)', marginRight: '6px' }}>
              {mode === 'image' ? 'detected:' : mode === 'audio' ? 'heard:' : 'query:'}
            </span>
            <span style={{ fontWeight: 500 }}>"{queryInfo.original}"</span>
          </div>

          {/* Rewritten query - single line */}
          {queryInfo.rewritten && queryInfo.rewritten !== queryInfo.original && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-dim)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '2px',
              }}
            >
              <span style={{ marginRight: '6px' }}>expanded:</span>
              <span style={{ color: 'var(--color-success)' }}>"{queryInfo.rewritten}"</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
