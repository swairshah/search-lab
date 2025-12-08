import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface AccumulatedPanel {
  title: string;
  content: string;
}

interface StatePanelProps {
  panels: AccumulatedPanel[];
  onClear: () => void;
}

export function StatePanel({ panels, onClear }: StatePanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Update active tab when panels change
  useEffect(() => {
    if (panels.length > 0) {
      // Keep current tab if it still exists, otherwise select first
      const currentExists = panels.some(p => p.title === activeTab);
      if (!currentExists) {
        setActiveTab(panels[0].title);
      }
    } else {
      setActiveTab(null);
    }
  }, [panels, activeTab]);

  const activePanel = panels.find(p => p.title === activeTab);

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

      {panels.length === 0 ? (
        <div className="state-content">
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p>No data yet</p>
            <p style={{ fontSize: '11px', marginTop: '8px' }}>
              Send messages to see accumulated state
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Dynamic Tabs */}
          <div className="state-tabs">
            {panels.map((panel) => (
              <button
                key={panel.title}
                className={`state-tab ${activeTab === panel.title ? 'active' : ''}`}
                onClick={() => setActiveTab(panel.title)}
              >
                {panel.title}
              </button>
            ))}
          </div>

          <div className="state-content">
            {activePanel && (
              <motion.div
                key={activePanel.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="state-panel-content"
              >
                <pre className="panel-content-text">{activePanel.content}</pre>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
