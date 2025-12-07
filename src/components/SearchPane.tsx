import { motion } from 'framer-motion';
import type { SearchResult } from '../App';

interface SearchPaneProps {
  title: string;
  description: string;
  results: SearchResult[];
  latencyMs?: number;
  isLoading: boolean;
  hasSearched: boolean;
}

export function SearchPane({
  title,
  description,
  results,
  latencyMs,
  isLoading,
  hasSearched,
}: SearchPaneProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <>
      {/* Pane Header */}
      <div className="pane-header">
        <div>
          <div className="pane-title">{title}</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-dim)',
            marginTop: '2px',
          }}>
            {description}
          </div>
        </div>
        <div className="pane-meta">
          {hasSearched && !isLoading && (
            <>
              <span className="pane-count">{results.length} results</span>
              {latencyMs !== undefined && (
                <span className="pane-latency">{latencyMs.toFixed(1)}ms</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pane Content */}
      <div className="pane-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : !hasSearched ? (
          <div className="empty-state">
            <div>Enter a search query to compare results</div>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div>No results found</div>
          </div>
        ) : (
          results.map((result, index) => (
            <motion.div
              key={result.id}
              className="product-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <img
                src={result.imageUrl}
                alt={result.name}
                className="product-image"
              />
              <div className="product-info">
                {result.category && (
                  <div className="product-category">{result.category}</div>
                )}
                <div className="product-name">{result.name}</div>
                <div className="product-description">{result.description}</div>
                <div className="product-footer">
                  <span className="product-price">{formatPrice(result.price)}</span>
                  <span className="product-score">score: {result.score}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </>
  );
}
