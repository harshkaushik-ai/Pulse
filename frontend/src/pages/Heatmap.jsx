import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Tooltip } from 'recharts';
import api from '../utils/api';

// Color scale: red (negative) → grey (neutral) → green (positive)
const getSentimentColor = (sentiment, count) => {
  if (count === 0) return 'var(--bg3)';
  if (sentiment > 0.15) return '#1a7a4a';
  if (sentiment > 0.05) return '#22a86a';
  if (sentiment > 0) return '#3ecf8e';
  if (sentiment > -0.05) return '#8b90a0';
  if (sentiment > -0.15) return '#d06040';
  return '#c03020';
};

const getCountColor = (count, max) => {
  if (count === 0) return 'var(--bg3)';
  const intensity = Math.min(count / max, 1);
  const alpha = 0.15 + intensity * 0.85;
  return `rgba(167, 139, 250, ${alpha})`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HeatmapPage() {
  const [mode, setMode] = useState('sentiment'); // 'sentiment' | 'volume'
  const [tooltip, setTooltip] = useState(null);
  const [days] = useState(90);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['heatmap', days],
    queryFn: () => api.get(`/analytics/heatmap?days=${days}`).then((r) => r.data),
    refetchInterval: 600000,
  });

  const heatmapData = rawData || [];
  const maxCount = Math.max(...heatmapData.map((d) => d.count), 1);

  // Build weeks grid
  const buildGrid = () => {
    if (!heatmapData.length) return [];
    const startDate = dayjs(heatmapData[0].date);
    const startDow = startDate.day(); // 0=Sun
    const weeks = [];
    let currentWeek = Array(startDow).fill(null); // pad start

    heatmapData.forEach((d) => {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const weeks = buildGrid();

  // Stats
  const totalArticles = heatmapData.reduce((s, d) => s + d.count, 0);
  const activeDays = heatmapData.filter((d) => d.count > 0).length;
  const avgSentiment = heatmapData.length
    ? heatmapData.filter((d) => d.count > 0).reduce((s, d) => s + d.avgSentiment, 0) / (activeDays || 1)
    : 0;
  const bestDay = [...heatmapData].sort((a, b) => b.avgSentiment - a.avgSentiment).find((d) => d.count > 0);
  const worstDay = [...heatmapData].sort((a, b) => a.avgSentiment - b.avgSentiment).find((d) => d.count > 0);
  const busiestDay = [...heatmapData].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sentiment Calendar</h1>
          <p className="page-sub">90-day heatmap of news sentiment and article volume</p>
        </div>
        <div className="period-tabs">
          <button className={`period-tab ${mode === 'sentiment' ? 'active' : ''}`} onClick={() => setMode('sentiment')}>
            Sentiment
          </button>
          <button className={`period-tab ${mode === 'volume' ? 'active' : ''}`} onClick={() => setMode('volume')}>
            Volume
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card gold">
          <div className="stat-label">Total Articles</div>
          <div className="stat-value">{totalArticles.toLocaleString()}</div>
          <div className="stat-sub">Last 90 days</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Best Day</div>
          <div className="stat-value" style={{ fontSize: 18, paddingTop: 4 }}>
            {bestDay ? dayjs(bestDay.date).format('MMM D') : '—'}
          </div>
          <div className="stat-sub">{bestDay ? `Sentiment: +${bestDay.avgSentiment.toFixed(3)}` : ''}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Worst Day</div>
          <div className="stat-value" style={{ fontSize: 18, paddingTop: 4 }}>
            {worstDay ? dayjs(worstDay.date).format('MMM D') : '—'}
          </div>
          <div className="stat-sub">{worstDay ? `Sentiment: ${worstDay.avgSentiment.toFixed(3)}` : ''}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Busiest Day</div>
          <div className="stat-value" style={{ fontSize: 18, paddingTop: 4 }}>
            {busiestDay?.count > 0 ? dayjs(busiestDay.date).format('MMM D') : '—'}
          </div>
          <div className="stat-sub">{busiestDay?.count > 0 ? `${busiestDay.count} articles` : ''}</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            {mode === 'sentiment' ? 'Daily Sentiment Score' : 'Daily Article Volume'}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {mode === 'sentiment' ? 'Negative' : 'Less'}
            </span>
            {mode === 'sentiment'
              ? ['#c03020', '#d06040', '#8b90a0', '#3ecf8e', '#1a7a4a'].map((c) => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                ))
              : [0.1, 0.3, 0.5, 0.7, 1].map((a) => (
                  <div key={a} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(167,139,250,${a})` }} />
                ))
            }
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {mode === 'sentiment' ? 'Positive' : 'More'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spinner" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Day labels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 20 }}>
                {DAYS.map((d, i) => (
                  <div key={d} style={{ height: 14, fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                    {i % 2 === 1 ? d : ''}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div>
                {/* Month labels */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 4, height: 16 }}>
                  {weeks.map((week, wi) => {
                    const firstDay = week.find((d) => d !== null);
                    if (!firstDay) return <div key={wi} style={{ width: 14 }} />;
                    const d = dayjs(firstDay.date);
                    const showMonth = d.date() <= 7;
                    return (
                      <div key={wi} style={{ width: 14, fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {showMonth ? MONTHS[d.month()] : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Cells */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {week.map((day, di) => {
                        if (!day) return <div key={di} style={{ width: 14, height: 14 }} />;
                        const color = mode === 'sentiment'
                          ? getSentimentColor(day.avgSentiment, day.count)
                          : getCountColor(day.count, maxCount);

                        return (
                          <div
                            key={di}
                            style={{
                              width: 14, height: 14, borderRadius: 3,
                              background: color, cursor: day.count > 0 ? 'pointer' : 'default',
                              transition: 'transform 0.1s',
                              position: 'relative',
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.4)';
                              setTooltip({
                                date: day.date,
                                count: day.count,
                                avgSentiment: day.avgSentiment,
                                positive: day.positiveCount,
                                negative: day.negativeCount,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              setTooltip(null);
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 80,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          zIndex: 9999,
          pointerEvents: 'none',
          minWidth: 160,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            {dayjs(tooltip.date).format('dddd, MMM D YYYY')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>📰 {tooltip.count} articles</div>
          <div style={{ fontSize: 12, color: tooltip.avgSentiment > 0 ? '#3ecf8e' : '#f87171' }}>
            {tooltip.avgSentiment > 0 ? '↑' : '↓'} Sentiment: {tooltip.avgSentiment.toFixed(3)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 8 }}>
            <span style={{ color: '#3ecf8e' }}>+{tooltip.positive}</span>
            <span style={{ color: '#f87171' }}>-{tooltip.negative}</span>
          </div>
        </div>
      )}

      {/* Weekly pattern analysis */}
      {!isLoading && heatmapData.length > 0 && (
        <div className="card">
          <div className="card-title">Day-of-Week Patterns</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {DAYS.map((dayName, dowIndex) => {
              const dayArticles = heatmapData.filter((d) => dayjs(d.date).day() === dowIndex && d.count > 0);
              const avgCount = dayArticles.length ? dayArticles.reduce((s, d) => s + d.count, 0) / dayArticles.length : 0;
              const avgSent = dayArticles.length ? dayArticles.reduce((s, d) => s + d.avgSentiment, 0) / dayArticles.length : 0;
              return (
                <div key={dayName} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg3)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{dayName}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{avgCount.toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>avg articles</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: avgSent > 0 ? '#3ecf8e' : avgSent < 0 ? '#f87171' : 'var(--text3)' }}>
                    {avgSent > 0 ? '+' : ''}{avgSent.toFixed(3)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>sentiment</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
