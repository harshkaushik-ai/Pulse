import { useQuery } from "@tanstack/react-query";
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { ArrowUpRight, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getArticleStats, getSentimentTimeline, getTrends,
  getBreakingTrends, getInsights, runScraper
} from '../utils/api';

dayjs.extend(relativeTime);

const SENTIMENT_COLOR = { positive: '#3ecf8e', negative: '#e05c3a', neutral: '#8b90a0' };

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: 12, color: p.color || 'var(--text)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--text2)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
 const {
  data: stats,
  isLoading: statsLoading
} = useQuery({
  queryKey: ["stats"],
  queryFn: () => getArticleStats().then(r => r.data),
  refetchInterval: 60000,
});

const { data: timeline } = useQuery({
  queryKey: ["timeline", 7],
  queryFn: () => getSentimentTimeline(7).then(r => r.data),
  refetchInterval: 300000,
});

const { data: trendsData } = useQuery({
  queryKey: ["trends", "24h"],
  queryFn: () => getTrends("24h", 10).then(r => r.data),
});

const { data: breaking } = useQuery({
  queryKey: ["breaking"],
  queryFn: () => getBreakingTrends().then(r => r.data),
});

const { data: insights } = useQuery({
  queryKey: ["insights"],
  queryFn: () => getInsights(3).then(r => r.data),
});
  const sentimentDist = stats?.sentimentCounts || [];
  const total = sentimentDist.reduce((s, c) => s + parseInt(c.count), 0) || 1;
  const topTrends = trendsData?.trends || [];
  const maxCount = topTrends[0]?.count || 1;

  const handleScrape = async () => {
    const t = toast.loading('Scraping news...');
    try {
      const r = await runScraper();
      toast.success(`Done! ${r.data.totalSaved} new articles`, { id: t });
    } catch {
      toast.error('Scrape failed', { id: t });
    }
  };

  const getSentimentPct = (label) => {
    const found = sentimentDist.find(s => s.sentimentLabel === label);
    if (!found) return '—';
    return `${((found.count / total) * 100).toFixed(0)}%`;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Real-time news intelligence & trend analysis</p>
        </div>
        <button className="btn btn-primary" onClick={handleScrape}>
          <RefreshCw size={14} /> Scrape Now
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid ">
        <div className="stat-card gold">
          <div className="stat-label">Articles (24h)</div>
          <div className="stat-value">{statsLoading ? '—' : (stats?.total24h || 0).toLocaleString()}</div>
          <div className="stat-sub">Last 24 hours</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Positive Sentiment</div>
          <div className="stat-value">{getSentimentPct('positive')}</div>
          <div className="stat-sub">Of all articles today</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Negative Sentiment</div>
          <div className="stat-value">{getSentimentPct('negative')}</div>
          <div className="stat-sub">Of all articles today</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Articles (7d)</div>
          <div className="stat-value">{statsLoading ? '—' : (stats?.total7d || 0).toLocaleString()}</div>
          <div className="stat-sub">Last 7 days</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2 ">
        <div className="card">
          <div className="card-title">Sentiment Timeline — 7 Days</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline || []}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f0a500" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f0a500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => dayjs(v).format('MMM D')} />
              <YAxis domain={[-1, 1]} tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="avgSentiment" name="Sentiment" stroke="#f0a500"
                fill="url(#sentGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Sentiment Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sentimentDist} barSize={40}>
              <XAxis dataKey="sentimentLabel" tick={{ fill: '#555a6a', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#555a6a', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Articles" radius={[4, 4, 0, 0]}>
                {sentimentDist.map((entry, i) => (
                  <Cell key={i} fill={SENTIMENT_COLOR[entry.sentimentLabel] || '#8b90a0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trends + Insights */}
      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Top Trends — 24h</div>
            <Link to="/trends" style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {topTrends.length === 0 && (
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>No trends yet. Scrape some articles first.</p>
          )}
          {topTrends.slice(0, 8).map((t, i) => (
            <div className="trend-item" key={t.id}>
              <span className="trend-rank mono">#{i + 1}</span>
              <span className="trend-keyword">{t.keyword}</span>
              <div className="trend-bar-wrap">
                <div className="trend-bar" style={{ width: `${(t.count / maxCount) * 100}%` }} />
              </div>
              {t.isBreaking && <span className="badge badge-breaking">🔥</span>}
              <span className="trend-count mono">{t.count}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <Zap size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--accent)' }} />
              AI Insights
            </div>
            <Link to="/insights" style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {(!insights || insights.length === 0) ? (
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>No insights yet. Go to AI Insights to generate.</p>
          ) : (
            insights.slice(0, 3).map((ins) => (
              <div key={ins.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{ins.topic}</span>
                  <span className={`impact-${ins.impactLevel}`} style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                    {ins.impactLevel}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{ins.summary}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Breaking trends */}
      {breaking && breaking.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(224,92,58,0.3)' }}>
          <div className="card-title" style={{ color: 'var(--red)' }}>🔥 Breaking Trends</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {breaking.map((t) => (
              <div key={t.id} style={{
                background: 'rgba(224,92,58,0.1)', border: '1px solid rgba(224,92,58,0.2)',
                borderRadius: 8, padding: '8px 14px'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--red)' }}>{t.keyword}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                  +{(t.trendVelocity * 100).toFixed(0)}% velocity
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}