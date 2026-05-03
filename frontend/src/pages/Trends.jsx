import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts';
import { getTrends, getKeywordTimeSeries } from '../utils/api';

const PERIODS = ['1h', '6h', '24h', '7d'];
const COLORS = ['#f0a500', '#3ecf8e', '#5b8ef0', '#e05c3a', '#b06ef0', '#00c9e0', '#f07050', '#a0d080'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: 12, color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.keyword}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>Count: {d.count}</div>
      <div style={{ fontSize: 12, color: d.avgSentiment > 0 ? 'var(--green)' : d.avgSentiment < 0 ? 'var(--red)' : 'var(--text2)' }}>
        Sentiment: {d.avgSentiment?.toFixed(3)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
        Velocity: {(d.trendVelocity * 100).toFixed(0)}%
      </div>
    </div>
  );
};

export default function Trends() {
  const [period, setPeriod] = useState('24h');
  const [selectedKeyword, setSelectedKeyword] = useState(null);


const { data: trendsData, isLoading } = useQuery({
  queryKey: ["trends", period],
  queryFn: () => getTrends(period, 30).then((r) => r.data),
  refetchInterval: 120000,
});

const { data: timeseries, isLoading: tsLoading } = useQuery({
  queryKey: ["timeseries", selectedKeyword],
  queryFn: () =>
    getKeywordTimeSeries(selectedKeyword, 7).then((r) => r.data),
  enabled: !!selectedKeyword,
});

  const trends = trendsData?.trends || [];
  const maxCount = trends[0]?.count || 1;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trend Analysis</h1>
          <p className="page-sub">Keyword frequency and momentum over time</p>
        </div>
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button key={p} className={`period-tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Bar chart */}
        <div className="card">
          <div className="card-title">Top Keywords — {period}</div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spinner" />
            </div>
          ) : trends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              No trends yet. Scrape articles first.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={trends.slice(0, 15)} layout="vertical" barSize={12}>
                <XAxis type="number" tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="keyword" tick={{ fill: '#8b90a0', fontSize: 11 }}
                  tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}
                  onClick={(d) => setSelectedKeyword(d.keyword)} style={{ cursor: 'pointer' }}>
                  {trends.slice(0, 15).map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]}
                      opacity={selectedKeyword === entry.keyword ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Time series */}
        <div className="card">
          <div className="card-title">
            {selectedKeyword ? `"${selectedKeyword}" — 7 Day Trend` : 'Click a keyword to see its timeline'}
          </div>
          {!selectedKeyword && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--text3)', fontSize: 13 }}>
              ← Select a keyword from the chart
            </div>
          )}
          {selectedKeyword && tsLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spinner" />
            </div>
          )}
          {selectedKeyword && !tsLoading && timeseries && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeseries.data || []}>
                <XAxis dataKey="date" tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => dayjs(v).format('MMM D')} />
                <YAxis yAxisId="count" tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                <YAxis yAxisId="sent" orientation="right" domain={[-1, 1]}
                  tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                <Line yAxisId="count" type="monotone" dataKey="count" name="Mentions"
                  stroke="#f0a500" strokeWidth={2} dot={{ fill: '#f0a500', r: 3 }} />
                <Line yAxisId="sent" type="monotone" dataKey="avgSentiment" name="Sentiment"
                  stroke="#3ecf8e" strokeWidth={2} dot={{ fill: '#3ecf8e', r: 3 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Full table */}
      <div className="card">
        <div className="card-title">All Trends — {period}</div>
        {trends.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>No data. Run a scrape first.</p>
        ) : (
          <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#', 'Keyword', 'Mentions', 'Avg Sentiment', 'Velocity', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trends.slice(0, 20).map((t, i) => (
                <tr key={t.id}
                  style={{ borderBottom: '1px solid rgba(35,38,48,0.5)', cursor: 'pointer' }}
                  onClick={() => setSelectedKeyword(t.keyword)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', color: 'var(--text3)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: selectedKeyword === t.keyword ? 'var(--accent)' : 'var(--text)' }}>
                    {t.keyword}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{t.count}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      color: t.avgSentiment > 0.05 ? 'var(--green)' : t.avgSentiment < -0.05 ? 'var(--red)' : 'var(--text2)',
                      fontFamily: 'DM Mono, monospace', fontSize: 12
                    }}>
                      {t.avgSentiment?.toFixed(3)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      color: t.trendVelocity > 0 ? 'var(--green)' : t.trendVelocity < 0 ? 'var(--red)' : 'var(--text2)',
                      fontFamily: 'DM Mono, monospace', fontSize: 12
                    }}>
                      {t.trendVelocity > 0 ? '+' : ''}{(t.trendVelocity * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {t.isBreaking
                      ? <span className="badge badge-breaking">🔥 Breaking</span>
                      : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}