import { motion } from 'framer-motion';

type SearchFlowMode = 'oneshot' | 'conversational';

interface SearchModeToggleProps {
  mode: SearchFlowMode;
  onChange: (mode: SearchFlowMode) => void;
}

export function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  const modes: { key: SearchFlowMode; label: string }[] = [
    { key: 'oneshot', label: '1-shot' },
    { key: 'conversational', label: 'Conv' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--color-bg)',
        borderRadius: '6px',
        padding: '2px',
        border: '1px solid var(--color-border)',
        position: 'relative',
      }}
    >
      {/* Sliding indicator */}
      <motion.div
        layoutId="search-mode-indicator"
        style={{
          position: 'absolute',
          top: '2px',
          left: '2px',
          width: `calc(50% - 2px)`,
          height: 'calc(100% - 4px)',
          background: 'var(--color-surface)',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
        animate={{
          x: mode === 'oneshot' ? 0 : 'calc(100% + 2px)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />

      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: mode === key ? 600 : 500,
            color: mode === key ? 'var(--color-accent)' : 'var(--color-text-dim)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
