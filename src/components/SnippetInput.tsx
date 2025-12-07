import { useState, useRef, useEffect } from 'react';

interface SnippetInputProps {
  onSubmit: (code: string, language: string) => void;
  disabled?: boolean;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
];

export function SnippetInput({ onSubmit, disabled }: SnippetInputProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [code]);

  const handleSubmit = () => {
    if (!code.trim() || disabled) return;
    onSubmit(code.trim(), language);
    setCode('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    // Tab to insert spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef.current?.selectionStart || 0;
      const end = textareaRef.current?.selectionEnd || 0;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      // Set cursor position after inserted spaces
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="snippet-input">
      <div className="snippet-toolbar">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="language-select"
          disabled={disabled}
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <span className="line-count">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="code-editor">
        <div className="line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type your code here..."
          disabled={disabled}
          spellCheck={false}
        />
      </div>

      <div className="snippet-footer">
        <span className="hint">Tab to indent · ⌘Enter to send</span>
        <button
          className="send-snippet-btn"
          onClick={handleSubmit}
          disabled={!code.trim() || disabled}
        >
          Send Snippet
        </button>
      </div>
    </div>
  );
}
