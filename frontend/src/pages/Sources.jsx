import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import api from '../utils/api';

const BIAS_COLOR = {
  'Balanced': '#3ecf8e',
  'Slightly Positive': '#60a5fa',
  'Positive Leaning': '#a78bfa',
  'Slightly Negative': '#fb923c',
  'Negative Leaning': '#f87171',
};

export default function Sources() {
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState('totalArticles');
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sources', days],
    queryFn: () => api.get(`/analytics/sources?days=${days}`).then((r) => r.data),
    refetchInterval: 300000,
  });

  const sources = data?.sources || [];
  const sorted = [...sources].sort((a, b) => b[sortBy] - a[sortBy]);
  const selectedSource = selected ? sources.find((s) => s.source === selected) : null;

  const radarData = selectedSource
    ? [
        { metric: 'Volume', value: Math.min(selectedSource.totalArticles / 10, 100) },
        { metric: 'Positive %', value: selectedSource.positivePct },
        { metric: 'Neutral %', value: selectedSource.neutralPct },
        { metric: 'Balance', value: (1 - Math.abs(selectedSource.biasScore)) * 100 },
        { metric: 'Reliability', value: selectedSource.reliabilityScore * 100 },
        { metric: 'Magnitude', value: (1 - selectedSource.avgMagnitude) * 100 },
      ]
    : [];

  const PERIOD_OPTIONS = [7, 14, 30, 60];
  const SORT_OPTIONS = [
    { value: 'totalArticles', label: 'Volume' },
    { value: 'reliabilityScore', label: 'Reliability' },
    { value: 'biasScore', label: 'Bias Score' },
    { value: 'negativePct', label: 'Negativity' },
  ];

  const selectStyle = {
    padding: '7px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer',
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Source Analysis</h1>
          <p className="page-sub">Bias detection, reliability scores, and coverage patterns per news source</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStyle}>
            {PERIOD_OPTIONS.map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && sources.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-label">Sources Tracked</div>
            <div className="stat-value">{sources.length}</div>
            <div className="stat-sub">Last {days} days</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Most Balanced</div>
            <div className="stat-value" style={{ fontSize: 16, paddingTop: 4 }}>
              {[...sources].sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0]?.source}
            </div>
            <div className="stat-sub">Highest reliability score</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Most Negative</div>
            <div className="stat-value" style={{ fontSize: 16, paddingTop: 4 }}>
              {[...sources].sort((a, b) => a.avgSentiment - b.avgSentiment)[0]?.source}
            </div>
            <div className="stat-sub">Lowest avg sentiment</div>
          </div>
          <div className="stat-card gold">
            <div className="stat-label">Highest Volume</div>
            <div className="stat-value" style={{ fontSize: 16, paddingTop: 4 }}>
              {[...sources].sort((a, b) => b.totalArticles - a.totalArticles)[0]?.source}
            </div>
            <div className="stat-sub">Most articles published</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Source table */}
        <div className="card" style={{ gridColumn: selected ? '1' : '1 / -1' }}>
          <div className="card-title">Source Reliability Rankings</div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spinner" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map((s, i) => (
                <div
                  key={s.source}
                  onClick={() => setSelected(selected === s.source ? null : s.source)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: selected === s.source ? 'rgba(167,139,250,0.08)' : 'var(--bg3)',
                    border: `1px solid ${selected === s.source ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Rank */}
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text3)', width: 24, flexShrink: 0 }}>
                    #{i + 1}
                  </div>

                  {/* Source name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{s.source}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.totalArticles} articles</span>
                      <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                        background: `${BIAS_COLOR[s.biasLabel]}20`,
                        color: BIAS_COLOR[s.biasLabel],
                        border: `1px solid ${BIAS_COLOR[s.biasLabel]}40`,
                      }}>
                        {s.biasLabel}
                      </span>
                    </div>
                  </div>

                  {/* Mini bar charts */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28 }}>
                    {[
                      { pct: s.positivePct, color: '#3ecf8e' },
                      { pct: s.neutralPct, color: '#8b90a0' },
                      { pct: s.negativePct, color: '#f87171' },
                    ].map((bar, bi) => (
                      <div key={bi} style={{ width: 8, borderRadius: 2, background: bar.color, height: `${Math.max(bar.pct, 5)}%`, opacity: 0.8 }} />
                    ))}
                  </div>

                  {/* Reliability score */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.reliabilityScore > 0.6 ? '#3ecf8e' : s.reliabilityScore > 0.4 ? 'var(--accent)' : '#f87171' }}>
                      {(s.reliabilityScore * 100).toFixed(0)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected source detail */}
        {selectedSource && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-title">{selectedSource.source} — Deep Analysis</div>

              {/* Radar chart */}
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
                {[
                  { label: 'Positive', value: `${selectedSource.positivePct}%`, color: '#3ecf8e' },
                  { label: 'Neutral', value: `${selectedSource.neutralPct}%`, color: 'var(--text2)' },
                  { label: 'Negative', value: `${selectedSource.negativePct}%`, color: '#f87171' },
                  { label: 'Avg Sentiment', value: selectedSource.avgSentiment.toFixed(3), color: selectedSource.avgSentiment > 0 ? '#3ecf8e' : '#f87171' },
                  { label: 'Bias Score', value: selectedSource.biasScore.toFixed(3), color: 'var(--accent)' },
                  { label: 'Reliability', value: `${(selectedSource.reliabilityScore * 100).toFixed(0)}%`, color: '#60a5fa' },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment bar */}
            <div className="card">
              <div className="card-title" style={{ fontSize: 13 }}>Sentiment Breakdown</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[{ name: selectedSource.source, pos: selectedSource.positivePct, neu: selectedSource.neutralPct, neg: selectedSource.negativePct }]}>
                  <XAxis dataKey="name" hide />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="pos" name="Positive %" fill="#3ecf8e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="neu" name="Neutral %" fill="#8b90a0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="neg" name="Negative %" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
