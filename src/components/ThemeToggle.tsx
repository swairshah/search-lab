import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

type Theme = 'light' | 'system' | 'dark';

const THEMES: Theme[] = ['light', 'system', 'dark'];

const LABELS: Record<Theme, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
};

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

// SVG Icons
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const SystemIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 0 0 18" fill="currentColor" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ICONS: Record<Theme, JSX.Element> = {
  light: <SunIcon />,
  system: <SystemIcon />,
  dark: <MoonIcon />,
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved && THEMES.includes(saved)) return saved;
    }
    return 'system';
  });

  const applyTheme = useCallback((t: Theme) => {
    const effective = getEffectiveTheme(t);
    document.documentElement.setAttribute('data-theme', effective);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const cycleTheme = () => {
    setTheme(prev => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  const selectTheme = (t: Theme) => {
    if (t !== theme) {
      setTheme(t);
    } else {
      cycleTheme();
    }
  };

  const currentIndex = THEMES.indexOf(theme);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: '3px',
        position: 'relative',
        gap: '0px',
      }}
    >
      {/* Sliding indicator */}
      <motion.div
        layout
        initial={false}
        animate={{
          x: currentIndex * 28,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          left: '3px',
          width: '28px',
          height: '28px',
          background: 'var(--color-surface)',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      />

      {/* Buttons */}
      {THEMES.map((t) => (
        <button
          key={t}
          onClick={() => selectTheme(t)}
          title={LABELS[t]}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            color: theme === t ? 'var(--color-text)' : 'var(--color-text-dim)',
            position: 'relative',
            zIndex: 1,
            transition: 'color 0.2s',
          }}
        >
          {ICONS[t]}
        </button>
      ))}
    </div>
  );
}
