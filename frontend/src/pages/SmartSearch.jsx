import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Search, Sparkles, ExternalLink, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

dayjs.extend(relativeTime);

const EXAMPLE_QUERIES = [
  'negative tech news from last week',
  'positive business news today',
  'science breakthroughs this month',
  'geopolitical tensions and war',
  'AI and machine learning news',
  'climate change recent articles',
  'stock market crash or rally',
];

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [summarizing, setSummarizing] = useState({});

  const search = async (q) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await api.post('/analytics/smart-search', { query: searchQuery });
      setResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const summarize = async (article) => {
    if (summaries[article.id] || summarizing[article.id]) return;
    setSummarizing((p) => ({ ...p, [article.id]: true }));
    try {
      const res = await api.post('/analytics/summarize', { articleId: article.id });
      setSummaries((p) => ({ ...p, [article.id]: res.data }));
    } catch {
      toast.error('Could not summarize article');
    } finally {
      setSummarizing((p) => ({ ...p, [article.id]: false }));
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Search</h1>
          <p className="page-sub">Search news using natural language — AI interprets your query</p>
        </div>
      </div>

      {/* Search box */}
      <div className="card">
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Sparkles size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder='Try: "negative tech news from last week" or "AI breakthroughs today"'
              style={{
                width: '100%', padding: '12px 14px 12px 36px',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text)', fontSize: 14,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => search()} disabled={loading || !query.trim()}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Search size={14} />}
            Search
          </button>
        </div>

        {/* Example queries */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Try these:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); search(q); }}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12,
                  border: '1px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text2)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => e.target.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.target.style.borderColor = 'var(--border)'}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI interpretation */}
      {results && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(167,139,250,0.08)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Sparkles size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>AI interpreted as: </span>
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{results.interpretation}</span>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>
            {results.total} results
          </span>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card">
          {results.articles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <Search size={32} style={{ marginBottom: 12 }} />
              <p>No articles found. Try a different query.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {results.articles.map((article) => {
                const sum = summaries[article.id];
                const isSummarizing = summarizing[article.id];
                return (
                  <div key={article.id} style={{
                    padding: '16px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {/* Article row */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      {article.imageUrl && (
                        <img src={article.imageUrl} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                          onError={(e) => e.target.style.display = 'none'} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>
                          {article.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--text3)' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{article.source}</span>
                          <span>·</span>
                          <span className={`badge badge-${article.sentimentLabel}`}>{article.sentimentLabel}</span>
                          <span>·</span>
                          <span>{dayjs(article.publishedAt).fromNow()}</span>
                          <a href={article.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--text3)' }}>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        {article.description && (
                          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
                            {article.description.slice(0, 140)}...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Summarize button */}
                    {!sum && (
                      <button
                        onClick={() => summarize(article)}
                        disabled={isSummarizing}
                        style={{
                          marginTop: 10, padding: '5px 12px', fontSize: 11, fontWeight: 600,
                          border: '1px solid var(--border)', borderRadius: 6,
                          background: 'transparent', color: 'var(--accent)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        {isSummarizing ? <><Loader size={10} style={{ animation: 'spin 0.7s linear infinite' }} /> Summarizing...</> : <><Sparkles size={10} /> AI Summary</>}
                      </button>
                    )}

                    {/* Summary result */}
                    {sum && (
                      <div style={{
                        marginTop: 10, padding: '12px 14px',
                        background: 'var(--bg3)', borderRadius: 8,
                        borderLeft: '3px solid var(--accent)',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                          🤖 AI Summary · {sum.readTime} min read · <span className={`badge badge-${sum.sentiment}`}>{sum.importance} impact</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginBottom: 8, lineHeight: 1.5 }}>
                          "{sum.tldr}"
                        </p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {sum.bullets.map((b, i) => (
                            <li key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '3px 0 3px 14px', position: 'relative', lineHeight: 1.5 }}>
                              <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>›</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
