import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Sparkles, TrendingUp, RefreshCw, Eye, Zap, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDailyBriefing, generateBriefing, getPredictions, generatePredictions } from '../utils/api';

const VELOCITY_COLOR = {
  low: 'var(--text3)',
  medium: 'var(--blue)',
  high: 'var(--accent)',
  explosive: 'var(--red)',
};

const VELOCITY_LABEL = {
  low: '↑ Low',
  medium: '↑↑ Medium',
  high: '↑↑↑ High',
  explosive: '🔥 Explosive',
};

export default function Briefing() {
  const [activeTab, setActiveTab] = useState('briefing');
  const qc = useQueryClient();

  const { data: briefing, isLoading: bLoading } = useQuery({
    queryKey: ['briefing'],
    queryFn: () => getDailyBriefing().then(r => r.data),
    retry: false,
  });

  const { data: predictions, isLoading: pLoading } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => getPredictions().then(r => r.data),
    retry: false,
  });

  const genBriefing = useMutation({
    mutationFn: () => generateBriefing().then(r => r.data),
    onSuccess: () => { toast.success('Briefing generated!'); qc.invalidateQueries(['briefing']); },
    onError: () => toast.error('Failed to generate briefing'),
  });

  const genPredictions = useMutation({
    mutationFn: () => generatePredictions().then(r => r.data),
    onSuccess: () => { toast.success('Predictions updated!'); qc.invalidateQueries(['predictions']); },
    onError: () => toast.error('Failed to generate predictions'),
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Intelligence</h1>
          <p className="page-sub">AI-generated daily briefing & trend predictions</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="period-tabs">
            {[
              { id: 'briefing', label: '📰 Daily Brief', icon: Eye },
              { id: 'predictions', label: '🔮 Predictions', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.id}
                className={`period-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DAILY BRIEFING TAB ── */}
      {activeTab === 'briefing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => genBriefing.mutate()} disabled={genBriefing.isPending}>
              {genBriefing.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={14} />}
              Generate Today's Brief
            </button>
          </div>

          {bLoading && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <span className="spinner" />
            </div>
          )}

          {!bLoading && !briefing && (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <Sparkles size={40} style={{ color: 'var(--text3)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text2)', marginBottom: 20 }}>No briefing yet for today</p>
              <button className="btn btn-primary" onClick={() => genBriefing.mutate()}>
                <Sparkles size={14} /> Generate Now
              </button>
            </div>
          )}

          {briefing && (
            <>
              {/* Hero headline */}
              <div className="card" style={{ borderColor: 'var(--accent)', padding: '32px' }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>
                  📰 TODAY'S BRIEFING — {briefing.date}
                </div>
                <h2 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 800, marginBottom: 16, lineHeight: 1.3, color: 'var(--text)' }}>
                  {briefing.headline}
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                  {briefing.openingParagraph}
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    📊 <strong style={{ color: 'var(--text)' }}>{briefing.articleCount}</strong> articles analyzed
                  </div>
                  <div style={{ fontSize: 12, color: briefing.sentimentScore > 0 ? 'var(--green)' : briefing.sentimentScore < 0 ? 'var(--red)' : 'var(--text3)' }}>
                    {briefing.sentimentScore > 0 ? '↑ Positive' : briefing.sentimentScore < 0 ? '↓ Negative' : '→ Neutral'} sentiment
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Generated {dayjs(briefing.generatedAt).fromNow()}
                  </div>
                </div>
              </div>

              {/* Top stories */}
              <div className="card">
                <div className="card-title">Top Stories</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(briefing.topStories || []).map((story, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: i < briefing.topStories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: 'var(--accent)', opacity: 0.4, lineHeight: 1, flexShrink: 0 }}>
                        0{i + 1}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{story.topic}</span>
                          <span className={`badge badge-${story.sentiment}`}>{story.sentiment}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{story.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                {/* Sentiment overview */}
                <div className="card">
                  <div className="card-title">📊 Sentiment Overview</div>
                  <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, fontStyle: 'italic' }}>
                    "{briefing.sentimentOverview}"
                  </p>
                </div>

                {/* Keywords to watch */}
                <div className="card">
                  <div className="card-title">👁 Watch These Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(briefing.watchlist || []).map((kw, i) => (
                      <div key={i} style={{
                        padding: '6px 14px',
                        background: 'var(--accent-muted, rgba(167,139,250,0.1))',
                        border: '1px solid var(--accent)',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}>
                        {kw}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 14, fontStyle: 'italic' }}>
                    {briefing.closingNote}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PREDICTIONS TAB ── */}
      {activeTab === 'predictions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => genPredictions.mutate()} disabled={genPredictions.isPending}>
              {genPredictions.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Zap size={14} />}
              Refresh Predictions
            </button>
          </div>

          {pLoading && <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>}

          {!pLoading && !predictions && (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <TrendingUp size={40} style={{ color: 'var(--text3)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text2)', marginBottom: 20 }}>No predictions yet</p>
              <button className="btn btn-primary" onClick={() => genPredictions.mutate()}>
                <Zap size={14} /> Generate Predictions
              </button>
            </div>
          )}

          {predictions && (
            <>
              {/* Summary */}
              <div className="card" style={{ borderLeft: '4px solid var(--blue)' }}>
                <div style={{ fontSize: 11, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>
                  🔮 24-Hour Forecast
                </div>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>{predictions.summary}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                  Generated {dayjs(predictions.generatedAt).fromNow()}
                </p>
              </div>

              {/* Predicted topics */}
              <div className="card">
                <div className="card-title">Predicted Trending Topics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(predictions.predictions || []).map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      background: 'var(--bg3)',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace', flexShrink: 0 }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{p.keyword}</span>
                          <span className={`badge badge-${p.sentiment}`}>{p.sentiment}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: VELOCITY_COLOR[p.expectedVelocity] || 'var(--text2)',
                          }}>
                            {VELOCITY_LABEL[p.expectedVelocity] || p.expectedVelocity}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text2)' }}>{p.reason}</p>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: p.confidence > 0.7 ? 'var(--green)' : p.confidence > 0.4 ? 'var(--accent)' : 'var(--text3)' }}>
                          {((p.confidence || 0) * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                {/* Market movers */}
                <div className="card">
                  <div className="card-title">📈 Potential Market Movers</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(predictions.marketMovers || []).map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <BarChart2 size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wildcards */}
                <div className="card">
                  <div className="card-title">🃏 Wildcard Topics</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(predictions.wildcards || []).map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--accent2, var(--red))', fontWeight: 700 }}>?</span>
                        <span style={{ fontSize: 13 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}