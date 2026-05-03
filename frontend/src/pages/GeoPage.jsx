import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe } from 'lucide-react';
import api from '../utils/api';

const SENTIMENT_COLOR = (s) => s > 0.05 ? '#3ecf8e' : s < -0.05 ? '#f87171' : '#8b90a0';

const FLAG_MAP = {
  US: '🇺🇸', CN: '🇨🇳', RU: '🇷🇺', GB: '🇬🇧', IN: '🇮🇳',
  DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', IL: '🇮🇱', UA: '🇺🇦',
  IR: '🇮🇷', SA: '🇸🇦', BR: '🇧🇷', CA: '🇨🇦', AU: '🇦🇺',
  KR: '🇰🇷', TR: '🇹🇷', MX: '🇲🇽', PK: '🇵🇰', KP: '🇰🇵',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
        {FLAG_MAP[d.code]} {d.country}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>📰 {d.count} mentions</div>
      <div style={{ fontSize: 12, color: SENTIMENT_COLOR(d.avgSentiment) }}>
        Sentiment: {d.avgSentiment > 0 ? '+' : ''}{d.avgSentiment.toFixed(3)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
        <span style={{ color: '#3ecf8e' }}>+{d.positiveCount}</span> · <span style={{ color: '#f87171' }}>-{d.negativeCount}</span>
      </div>
    </div>
  );
};

export default function GeoPage() {
  const [days, setDays] = useState(7);
  const [sortBy, setSortBy] = useState('count');
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['geo', days],
    queryFn: () => api.get(`/analytics/geo?days=${days}`).then((r) => r.data),
    refetchInterval: 600000,
  });

  const geoData = data?.data || [];
  const sorted = [...geoData].sort((a, b) => {
    if (sortBy === 'count') return b.count - a.count;
    if (sortBy === 'sentiment') return b.avgSentiment - a.avgSentiment;
    if (sortBy === 'negative') return a.avgSentiment - b.avgSentiment;
    return 0;
  });

  const selectStyle = {
    padding: '7px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer',
  };

  const topCountry = geoData[0];
  const mostPositive = [...geoData].sort((a, b) => b.avgSentiment - a.avgSentiment)[0];
  const mostNegative = [...geoData].sort((a, b) => a.avgSentiment - b.avgSentiment)[0];
  const totalMentions = geoData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">World Coverage</h1>
          <p className="page-sub">Which countries dominate the news — and with what sentiment</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStyle}>
            {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>Last {d}d</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
            <option value="count">Sort: Volume</option>
            <option value="sentiment">Sort: Positive</option>
            <option value="negative">Sort: Negative</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && geoData.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card gold">
            <div className="stat-label">Most Covered</div>
            <div className="stat-value" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              {FLAG_MAP[topCountry?.code]} {topCountry?.country}
            </div>
            <div className="stat-sub">{topCountry?.count} mentions</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Most Positive Coverage</div>
            <div className="stat-value" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              {FLAG_MAP[mostPositive?.code]} {mostPositive?.country}
            </div>
            <div className="stat-sub">Sentiment: +{mostPositive?.avgSentiment.toFixed(3)}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Most Negative Coverage</div>
            <div className="stat-value" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              {FLAG_MAP[mostNegative?.code]} {mostNegative?.country}
            </div>
            <div className="stat-sub">Sentiment: {mostNegative?.avgSentiment.toFixed(3)}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Countries Tracked</div>
            <div className="stat-value">{geoData.length}</div>
            <div className="stat-sub">{totalMentions} total mentions</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Bar chart */}
        <div className="card">
          <div className="card-title">Mention Volume by Country</div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={sorted.slice(0, 12)} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fill: 'var(--text2)', fontSize: 11 }}
                  tickLine={false} axisLine={false} width={100}
                  tickFormatter={(v) => {
                    const c = geoData.find((d) => d.country === v);
                    return `${FLAG_MAP[c?.code] || ''} ${v}`;
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(d) => setSelected(d.country === selected ? null : d.country)}>
                  {sorted.slice(0, 12).map((entry) => (
                    <Cell
                      key={entry.code}
                      fill={SENTIMENT_COLOR(entry.avgSentiment)}
                      opacity={selected && selected !== entry.country ? 0.4 : 0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Country list with sentiment bars */}
        <div className="card">
          <div className="card-title">Sentiment by Country</div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 400 }}>
              {sorted.map((d) => (
                <div
                  key={d.code}
                  onClick={() => setSelected(d.country === selected ? null : d.country)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: selected === d.country ? 'rgba(167,139,250,0.08)' : 'var(--bg3)',
                    border: `1px solid ${selected === d.country ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{FLAG_MAP[d.code]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{d.country}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.count} mentions</span>
                    </div>
                    {/* Sentiment bar */}
                    <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                      {/* Center line */}
                      <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'var(--border)' }} />
                      {/* Sentiment fill */}
                      <div style={{
                        position: 'absolute',
                        height: '100%',
                        background: SENTIMENT_COLOR(d.avgSentiment),
                        borderRadius: 3,
                        left: d.avgSentiment >= 0 ? '50%' : `${50 + d.avgSentiment * 50}%`,
                        width: `${Math.abs(d.avgSentiment) * 50}%`,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: '#3ecf8e' }}>+{d.positiveCount}</span>
                      <span style={{ fontSize: 10, color: SENTIMENT_COLOR(d.avgSentiment), fontWeight: 600 }}>
                        {d.avgSentiment > 0 ? '+' : ''}{d.avgSentiment.toFixed(3)}
                      </span>
                      <span style={{ fontSize: 10, color: '#f87171' }}>-{d.negativeCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* World sentiment visualization — bubble grid */}
      {!isLoading && geoData.length > 0 && (
        <div className="card">
          <div className="card-title">Global Sentiment Bubble Map</div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            Bubble size = mention volume · Color = sentiment (green=positive, red=negative)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            {sorted.map((d) => {
              const size = Math.max(50, Math.min(140, (d.count / (geoData[0]?.count || 1)) * 130 + 40));
              return (
                <div
                  key={d.code}
                  title={`${d.country}: ${d.count} mentions, sentiment: ${d.avgSentiment.toFixed(3)}`}
                  style={{
                    width: size, height: size,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${SENTIMENT_COLOR(d.avgSentiment)}88, ${SENTIMENT_COLOR(d.avgSentiment)}44)`,
                    border: `2px solid ${SENTIMENT_COLOR(d.avgSentiment)}`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                    boxShadow: `0 0 ${size / 4}px ${SENTIMENT_COLOR(d.avgSentiment)}40`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ fontSize: size > 70 ? 22 : 14 }}>{FLAG_MAP[d.code]}</span>
                  {size > 70 && (
                    <span style={{ fontSize: 9, color: 'var(--text)', fontWeight: 700, textAlign: 'center', lineHeight: 1.2, marginTop: 2 }}>
                      {d.country.split(' ').slice(-1)[0]}
                    </span>
                  )}
                  {size > 80 && (
                    <span style={{ fontSize: 10, color: SENTIMENT_COLOR(d.avgSentiment), fontWeight: 700 }}>
                      {d.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
