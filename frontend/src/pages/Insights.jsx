import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Zap, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { getInsights, generateInsight, generateTopInsights } from '../utils/api';

dayjs.extend(relativeTime);

const IMPACT_ICON = { low: '○', medium: '◑', high: '●', critical: '🔴' };
const TREND_STYLE = {
  improving: { label: 'Improving', color: 'var(--green)' },
  declining: { label: 'Declining', color: 'var(--red)' },
  stable: { label: 'Stable', color: 'var(--text2)' },
  volatile: { label: 'Volatile', color: 'var(--accent)' },
};

export default function Insights() {
  const [customTopic, setCustomTopic] = useState('');
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
  queryKey: ["insights"],
  queryFn: () => getInsights(20).then((r) => r.data),
  refetchInterval: 300000,
});

const generateCustom = useMutation({
  mutationFn: (topic) => generateInsight(topic).then((r) => r.data),

  onSuccess: () => {
    toast.success("Insight generated!");
    queryClient.invalidateQueries({ queryKey: ["insights"] });
    setCustomTopic("");
  },

  onError: (err) =>
    toast.error(err.response?.data?.error || "Failed to generate insight"),
});

const generateAll = useMutation({
  mutationFn: () => generateTopInsights().then((r) => r.data),

  onSuccess: (data) => {
    toast.success(`${data.generated} insights generated!`);
    queryClient.invalidateQueries({ queryKey: ["insights"] });
  },

  onError: (err) =>
    toast.error(err.response?.data?.error || "Failed"),
});

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="page-sub">Claude-powered trend analysis and predictions</p>
        </div>
        <button className="btn btn-ghost" onClick={() => generateAll.mutate()} disabled={generateAll.isLoading}>
          {generateAll.isLoading
            ? <span className="spinner" style={{ width: 14, height: 14 }} />
            : <Zap size={14} />
          }
          Generate Top Insights
        </button>
      </div>

      {/* Custom topic generator */}
      <div className="card" style={{ borderColor: 'rgba(91,142,240,0.2)' }}>
        <div className="card-title" style={{ color: 'var(--blue)', marginBottom: 12 }}>
          Generate Custom Insight
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && customTopic && generateCustom.mutate(customTopic)}
            placeholder="Enter a topic (e.g. 'AI regulation', 'stock market', 'climate change')..."
            style={{
              flex: 1, padding: '10px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, outline: 'none',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => customTopic && generateCustom.mutate(customTopic)}
            disabled={!customTopic || generateCustom.isLoading}
          >
            {generateCustom.isLoading
              ? <span className="spinner" style={{ width: 14, height: 14 }} />
              : <Zap size={14} />
            }
            Analyze
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
          Requires at least 2 articles about this topic in the last 24 hours.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!insights || insights.length === 0) && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Zap size={40} style={{ color: 'var(--text3)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text2)', marginBottom: 8, fontSize: 15 }}>No insights generated yet</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            Scrape some articles first, then click "Generate Top Insights"
          </p>
          <button className="btn btn-primary" onClick={() => generateAll.mutate()} disabled={generateAll.isLoading}>
            <Zap size={14} /> Generate Now
          </button>
        </div>
      )}

      {/* Insights list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(insights || []).map((ins) => {
          const trend = TREND_STYLE[ins.sentimentTrend] || TREND_STYLE.stable;
          return (
            <div key={ins.id} className="insight-card fade-in">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="insight-topic">{ins.topic}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: trend.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Activity size={10} /> {trend.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {IMPACT_ICON[ins.impactLevel]}{' '}
                    <span className={`impact-${ins.impactLevel}`} style={{ textTransform: 'capitalize' }}>
                      {ins.impactLevel} impact
                    </span>
                  </span>
                </div>
              </div>

              {/* Summary */}
              <p className="insight-summary">{ins.summary}</p>

              {/* Prediction */}
              {ins.prediction && (
                <div className="insight-prediction">
                  <div style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>
                    Prediction
                  </div>
                  {ins.prediction}
                </div>
              )}

              {/* Key points */}
              {ins.keyPoints && ins.keyPoints.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>
                    Key Points
                  </div>
                  <ul className="key-points">
                    {ins.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Generated {dayjs(ins.generatedAt).fromNow()} · {ins.relatedArticleIds?.length || 0} articles analyzed
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Confidence:{' '}
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                    {((ins.confidenceScore || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${(ins.confidenceScore || 0) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
