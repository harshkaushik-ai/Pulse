import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getStockWatchlist, getStockCorrelation } from '../utils/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', maxWidth: 280 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: 12, color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(p.name === 'Price' ? 2 : 3) : p.value}</strong>
        </div>
      ))}
      {payload[0]?.payload?.headlines?.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Headlines:</div>
          {payload[0].payload.headlines.slice(0, 2).map((h, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2, lineHeight: 1.4 }}>· {h.slice(0, 60)}...</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Stocks() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');

  const { data: watchlistData } = useQuery({
  queryKey: ['stockWatchlist'],
  queryFn: () => getStockWatchlist().then(r => r.data),
});

const watchlist = watchlistData?.stocks || [];
const sectors = watchlistData?.sectors || [];
const [selectedSector, setSelectedSector] = useState('');

const filteredStocks = selectedSector
  ? watchlist.filter(s => s.sector === selectedSector)
  : watchlist;

  const { data: correlation, isLoading } = useQuery({
    queryKey: ['stockCorrelation', selectedSymbol],
    queryFn: () => getStockCorrelation(selectedSymbol).then(r => r.data),
    refetchInterval: 900000,
  });

  const latestPrice = correlation?.data?.filter(d => d.price)?.[correlation.data.filter(d => d.price).length - 1];
  const firstPrice = correlation?.data?.find(d => d.price);
  const priceChange = latestPrice && firstPrice ? latestPrice.price - firstPrice.price : 0;
  const pricePct = firstPrice ? (priceChange / firstPrice.price * 100) : 0;

  // Sample every 4th point for cleaner chart
  const chartData = (correlation?.data || []).filter((_, i) => i % 4 === 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Markets</h1>
          <p className="page-sub">News sentiment correlated with stock price movements</p>
        </div>
      </div>


     {/* Sector filter */}
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
  <button
    onClick={() => setSelectedSector('')}
    style={{
      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      border: `1px solid ${!selectedSector ? 'var(--accent)' : 'var(--border)'}`,
      background: !selectedSector ? 'var(--accent)' : 'transparent',
      color: !selectedSector ? '#fff' : 'var(--text3)',
      cursor: 'pointer',
    }}
  >
    All
  </button>
  {sectors.map(s => (
    <button
      key={s}
      onClick={() => setSelectedSector(s)}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        border: `1px solid ${selectedSector === s ? 'var(--accent)' : 'var(--border)'}`,
        background: selectedSector === s ? 'var(--accent)' : 'transparent',
        color: selectedSector === s ? '#fff' : 'var(--text3)',
        cursor: 'pointer',
      }}
    >
      {s}
    </button>
  ))}
</div>
{/* Stock Dropdown */}
<div style={{ marginBottom: 16 }}>
  <select
    value={selectedSymbol}
    onChange={(e) => setSelectedSymbol(e.target.value)}
    style={{
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid var(--border)",
      background: "var(--bg2)",
      color: "var(--text1)",
      fontSize: 14,
      fontWeight: 600,
      minWidth: 260,
      cursor: "pointer",
    }}
  >
    {filteredStocks.map((stock) => (
      <option key={stock.symbol} value={stock.symbol}>
        {stock.symbol} — {stock.name}
      </option>
    ))}
  </select>
</div>
{/* Stock buttons */}
{/* <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  {filteredStocks.map(stock => (
    <button
      key={stock.symbol}
      onClick={() => setSelectedSymbol(stock.symbol)}
      style={{
        padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
        border: `1px solid ${selectedSymbol === stock.symbol ? 'var(--accent)' : 'var(--border)'}`,
        background: selectedSymbol === stock.symbol ? 'rgba(167,139,250,0.1)' : 'var(--bg2)',
        color: selectedSymbol === stock.symbol ? 'var(--accent)' : 'var(--text2)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{stock.symbol}</span>
      <span style={{ color: 'var(--text3)', marginLeft: 4 }}>{stock.name}</span>
    </button>
  ))}
</div> */}

      {/* Stock selector */}
      {/* <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(watchlist || []).map(stock => (
          <button
            key={stock.symbol}
            onClick={() => setSelectedSymbol(stock.symbol)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: `1px solid ${selectedSymbol === stock.symbol ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedSymbol === stock.symbol ? 'var(--accent-muted, rgba(167,139,250,0.1))' : 'var(--bg2)',
              color: selectedSymbol === stock.symbol ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {stock.symbol} · {stock.name}
          </button>
        ))}
      </div> */}

      {/* Price overview */}
      {correlation && latestPrice && (
        <div className="stats-grid">
          <div className="stat-card gold">
            <div className="stat-label">Current Price</div>
            <div className="stat-value">${latestPrice.price.toFixed(2)}</div>
            <div className="stat-sub">{selectedSymbol}</div>
          </div>
          <div className={`stat-card ${priceChange >= 0 ? 'green' : 'red'}`}>
            <div className="stat-label">5-Day Change</div>
            <div className="stat-value" style={{ color: priceChange >= 0 ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {priceChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {pricePct.toFixed(2)}%
            </div>
            <div className="stat-sub">${Math.abs(priceChange).toFixed(2)} {priceChange >= 0 ? 'gain' : 'loss'}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">News Articles</div>
            <div className="stat-value">{correlation.articleCount}</div>
            <div className="stat-sub">Last 5 days</div>
          </div>
          <div className="stat-card gold">
            <div className="stat-label">Data Points</div>
            <div className="stat-value">{correlation.data?.length || 0}</div>
            <div className="stat-sub">Hourly intervals</div>
          </div>
        </div>
      )}

      {/* Main correlation chart */}
      <div className="card">
        <div className="card-title">Price vs News Sentiment — {selectedSymbol} (5 Days)</div>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spinner" />
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
            No data available. Market may be closed.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData}>
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--text3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => dayjs(v).format('MMM D HH:mm')}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                yAxisId="price"
                tick={{ fill: 'var(--text3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={v => `$${v}`}
              />
              <YAxis
                yAxisId="sentiment"
                orientation="right"
                domain={[-1, 1]}
                tick={{ fill: 'var(--text3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <YAxis
                yAxisId="news"
                orientation="right"
                tick={false}
                axisLine={false}
                width={0}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)', paddingTop: 12 }} />
              <Bar yAxisId="news" dataKey="newsCount" name="News Articles" fill="rgba(167,139,250,0.2)" radius={[2,2,0,0]} />
              <Line yAxisId="price" type="monotone" dataKey="price" name="Price" stroke="#fbbf24" strokeWidth={2.5} dot={false} />
              <Line yAxisId="sentiment" type="monotone" dataKey="avgSentiment" name="Sentiment" stroke="#34d399" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, fontStyle: 'italic' }}>
          Purple bars = news volume · Gold line = stock price · Green dashed = news sentiment score
        </p>
      </div>

      {/* Keywords tracked */}
      {correlation && (
        <div className="card">
          <div className="card-title">Tracked Keywords for {selectedSymbol}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(correlation.keywords || []).map(kw => (
              <span key={kw} style={{
                padding: '5px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                fontSize: 12,
                color: 'var(--text2)',
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}