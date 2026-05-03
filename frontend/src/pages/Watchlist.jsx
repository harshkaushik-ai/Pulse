import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bell, Plus, Trash2, BellOff, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import socket from '../utils/socket.js';
import {
  getWatchlist, addToWatchlist, removeFromWatchlist,
  getAlerts, markAlertRead, markAllAlertsRead,
} from '../utils/api';

dayjs.extend(relativeTime);

const COLORS = ['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fb923c', '#fbbf24'];

export default function Watchlist() {
  const [keyword, setKeyword] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [activeTab, setActiveTab] = useState('watchlist');
  const [liveAlerts, setLiveAlerts] = useState([]);
  const qc = useQueryClient();

  const { data: watchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getWatchlist().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts().then(r => r.data),
    refetchInterval: 10000,
  });

  // Real-time alerts via WebSocket
  useEffect(() => {
    socket.emit('subscribe:watchlist');

    socket.on('alert', (alert) => {
      setLiveAlerts(prev => [alert, ...prev.slice(0, 4)]);
      toast(`🔔 ${alert.message}`, {
        duration: 6000,
        style: {
          background: 'var(--bg2)',
          color: 'var(--text)',
          border: `1px solid ${alert.type === 'breaking' ? 'var(--red)' : 'var(--accent)'}`,
        },
      });
      qc.invalidateQueries(['alerts']);
    });

    return () => socket.off('alert');
  }, [qc]);

  const addItem = useMutation({
    mutationFn: () => addToWatchlist({ keyword: keyword.toLowerCase().trim(), threshold, color: selectedColor }),
    onSuccess: () => {
      toast.success(`"${keyword}" added to watchlist`);
      setKeyword('');
      qc.invalidateQueries(['watchlist']);
    },
    onError: () => toast.error('Failed to add keyword'),
  });

  const removeItem = useMutation({
    mutationFn: (id) => removeFromWatchlist(id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries(['watchlist']); },
  });

  const markRead = useMutation({
    mutationFn: (id) => markAlertRead(id),
    onSuccess: () => qc.invalidateQueries(['alerts']),
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllAlertsRead(),
    onSuccess: () => { toast.success('All marked as read'); qc.invalidateQueries(['alerts']); },
  });

  const unreadCount = (alerts || []).filter(a => !a.isRead).length;

  const inputStyle = {
    padding: '10px 14px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-sub">Track keywords and get real-time alerts when they spike</p>
        </div>
        <div className="period-tabs">
          <button className={`period-tab ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>
            👁 Keywords
          </button>
          <button className={`period-tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')} style={{ position: 'relative' }}>
            🔔 Alerts
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 4,
                background: 'var(--red)', color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: 10,
                padding: '1px 5px', minWidth: 16, textAlign: 'center',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Live alert banner */}
      {liveAlerts.length > 0 && (
        <div style={{
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Bell size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            <strong>Live:</strong> {liveAlerts[0].message}
          </span>
          <button onClick={() => setLiveAlerts([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* ── WATCHLIST TAB ── */}
      {activeTab === 'watchlist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Add keyword */}
          <div className="card">
            <div className="card-title">Add Keyword to Watch</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Keyword</div>
                <input
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && keyword && addItem.mutate()}
                  placeholder="e.g. bitcoin, climate, election..."
                  style={inputStyle}
                />
              </div>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Alert threshold</div>
                <input
                  type="number"
                  value={threshold}
                  onChange={e => setThreshold(parseInt(e.target.value) || 5)}
                  min={1} max={100}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Color</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: c, border: selectedColor === c ? '2px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => keyword && addItem.mutate()}
                disabled={!keyword || addItem.isPending}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Watchlist items */}
          <div className="card">
            <div className="card-title">Tracked Keywords ({(watchlist || []).length})</div>
            {(!watchlist || watchlist.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <BellOff size={32} style={{ marginBottom: 12 }} />
                <p>No keywords tracked yet. Add some above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {watchlist.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    background: 'var(--bg3)',
                    borderRadius: 10,
                    border: `1px solid var(--border)`,
                    borderLeft: `4px solid ${item.color}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.keyword}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        Alert when ≥ {item.threshold} mentions/hour
                        {item.lastAlertAt && ` · Last alert ${dayjs(item.lastAlertAt).fromNow()}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        padding: '3px 10px',
                        background: item.isActive ? 'rgba(52,211,153,0.1)' : 'rgba(160,168,200,0.1)',
                        border: `1px solid ${item.isActive ? 'var(--green)' : 'var(--border)'}`,
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        color: item.isActive ? 'var(--green)' : 'var(--text3)',
                        textTransform: 'uppercase',
                      }}>
                        {item.isActive ? '● Active' : '○ Paused'}
                      </div>
                      <button
                        onClick={() => removeItem.mutate(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {unreadCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => markAllRead.mutate()}>
                <CheckCheck size={14} /> Mark all read
              </button>
            </div>
          )}

          <div className="card">
            <div className="card-title">Alert History</div>
            {(!alerts || alerts.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <Bell size={32} style={{ marginBottom: 12 }} />
                <p>No alerts yet. They'll appear here when keywords spike.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => !alert.isRead && markRead.mutate(alert.id)}
                    style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      padding: '14px 16px',
                      background: alert.isRead ? 'transparent' : 'rgba(167,139,250,0.05)',
                      border: `1px solid ${alert.isRead ? 'var(--border)' : 'rgba(167,139,250,0.2)'}`,
                      borderRadius: 10,
                      cursor: alert.isRead ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: alert.type === 'breaking' ? 'rgba(248,113,113,0.15)' : 'rgba(167,139,250,0.15)',
                      fontSize: 18,
                    }}>
                      {alert.type === 'breaking' ? '🔥' : '🔔'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{alert.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 12 }}>
                        <span>{dayjs(alert.triggeredAt).fromNow()}</span>
                        <span>Count: {alert.count}</span>
                        {alert.velocity > 0 && <span>+{(alert.velocity * 100).toFixed(0)}% velocity</span>}
                      </div>
                    </div>
                    {!alert.isRead && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}