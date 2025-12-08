import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ChatApp from './ChatApp';
import './index.css';

// Detect which app to render based on available API endpoints
async function detectApp(): Promise<'search' | 'chat'> {
  try {
    const response = await fetch('/api/chat/state', { method: 'GET' });
    if (response.ok) {
      return 'chat';
    }
  } catch {
    // Chat API not available
  }
  return 'search';
}

detectApp().then((appType) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {appType === 'chat' ? <ChatApp /> : <App />}
    </StrictMode>
  );
});
