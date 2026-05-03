import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import {
  Sparkles, Copy, RefreshCw, TrendingUp, Clock,
  CheckCircle, ChevronDown, ChevronUp, Zap, Edit3,
  ExternalLink, RotateCcw, Share2
} from 'lucide-react';
import api from '../utils/api';

dayjs.extend(relativeTime);

// ── Platform definitions ──
const PLATFORMS = [
  { id: 'twitter',   label: 'Twitter / X',  emoji: '𝕏',  color: '#1DA1F2', limit: 280  },
  { id: 'linkedin',  label: 'LinkedIn',      emoji: '💼', color: '#0A66C2', limit: 3000 },
  { id: 'instagram', label: 'Instagram',     emoji: '📸', color: '#E1306C', limit: 2200 },
  { id: 'facebook',  label: 'Facebook',      emoji: '👥', color: '#1877F2', limit: 500  },
  { id: 'threads',   label: 'Threads',       emoji: '🧵', color: '#000000', limit: 500  },
  { id: 'reddit',    label: 'Reddit',        emoji: '🤖', color: '#FF4500', limit: 40000},
];

const TONES = [
  { id: 'professional',  label: 'Professional', emoji: '🎯' },
  { id: 'casual',        label: 'Casual',       emoji: '😊' },
  { id: 'humorous',      label: 'Humorous',     emoji: '😄' },
  { id: 'urgent',        label: 'Breaking',     emoji: '🚨' },
  { id: 'educational',   label: 'Educational',  emoji: '📚' },
  { id: 'controversial', label: 'Spicy 🌶️',    emoji: '🔥' },
  { id: 'inspirational', label: 'Inspiring',    emoji: '✨' },
];

const ENGAGEMENT_COLOR = {
  low:    '#8b90a0',
  medium: '#60a5fa',
  high:   '#f0a500',
  viral:  '#f472b6',
};

const POST_TIME_EMOJI = {
  morning:   '🌅',
  afternoon: '☀️',
  evening:   '🌆',
  night:     '🌙',
};

// ── Char counter ring ──
const CharRing = ({ count, limit }) => {
  const pct = Math.min(count / limit, 1);
  const over = count > limit;
  const r = 16, circ = 2 * Math.PI * r;
  const color = over ? '#f87171' : pct > 0.85 ? '#fb923c' : '#3ecf8e';
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <svg width="40" height="40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--bg3)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 9, fontWeight: 700,
        color: over ? '#f87171' : 'var(--text3)',
      }}>
        {over ? `-${count - limit}` : limit - count}
      </div>
    </div>
  );
};

// ── Single post card ──
const PostCard = ({ post, platform, onCopy, onRewrite }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const textRef = useRef(null);

  const platformCfg = PLATFORMS.find((p) => p.id === platform);
  const currentContent = editing ? editedContent : post.content;
  const charCount = currentContent.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${platformCfg?.color}18, transparent)`,
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 18 }}>{platformCfg?.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: platformCfg?.color }}>
              {platformCfg?.label}
            </span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
              background: `${ENGAGEMENT_COLOR[post.estimatedEngagement]}20`,
              color: ENGAGEMENT_COLOR[post.estimatedEngagement],
              border: `1px solid ${ENGAGEMENT_COLOR[post.estimatedEngagement]}40`,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {post.estimatedEngagement} engagement
            </span>
            {post.bestPostTime && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {POST_TIME_EMOJI[post.bestPostTime]} Best: {post.bestPostTime}
              </span>
            )}
          </div>
          {post.hook && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>
              Hook: {post.hook}
            </div>
          )}
        </div>

        {/* Char ring */}
        <CharRing count={charCount} limit={platformCfg?.limit || 280} />

        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Post content */}
          <div style={{ padding: '16px 18px', position: 'relative' }}>
            {editing ? (
              <textarea
                ref={textRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                style={{
                  width: '100%', minHeight: 140, background: 'var(--bg3)',
                  border: '1px solid var(--accent)', borderRadius: 10,
                  color: 'var(--text)', fontFamily: 'inherit', fontSize: 14,
                  lineHeight: 1.7, padding: 14, resize: 'vertical', outline: 'none',
                }}
                autoFocus
              />
            ) : (
              <div style={{
                fontSize: 14, color: 'var(--text)', lineHeight: 1.75,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {post.content}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div style={{
            display: 'flex', gap: 8, padding: '10px 16px',
            borderTop: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)', background: copied ? 'rgba(52,211,153,0.1)' : 'var(--bg3)',
                color: copied ? '#3ecf8e' : 'var(--text2)', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              onClick={() => { setEditing((e) => !e); if (editing) setEditedContent(post.content); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`,
                background: editing ? 'rgba(167,139,250,0.1)' : 'var(--bg3)',
                color: editing ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer',
              }}
            >
              <Edit3 size={13} />
              {editing ? 'Done editing' : 'Edit'}
            </button>

            {editing && (
              <button
                onClick={() => setEditedContent(post.content)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text3)', cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {/* Cross-post to other platforms */}
              <button
                onClick={() => onRewrite?.(editing ? editedContent : post.content)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text2)', cursor: 'pointer',
                }}
              >
                <Share2 size={13} /> Cross-post
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Rewrite modal ──
const RewriteModal = ({ content, fromPlatform, onClose, onDone }) => {
  const [toPlatform, setToPlatform] = useState('linkedin');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const rewrite = async () => {
    setLoading(true);
    try {
      const res = await api.post('/social/rewrite', { content, fromPlatform, toPlatform, tone });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rewrite failed');
    } finally {
      setLoading(false);
    }
  };

  const platCfg = PLATFORMS.find((p) => p.id === toPlatform);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 28, width: '100%', maxWidth: 560,
        maxHeight: '85vh', overflowY: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            ↗️ Cross-post to another platform
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Target platform:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {PLATFORMS.filter((p) => p.id !== fromPlatform).map((p) => (
            <button key={p.id} onClick={() => setToPlatform(p.id)} style={{
              padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: `1px solid ${toPlatform === p.id ? p.color : 'var(--border)'}`,
              background: toPlatform === p.id ? `${p.color}18` : 'var(--bg3)',
              color: toPlatform === p.id ? p.color : 'var(--text2)', cursor: 'pointer',
            }}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Tone:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {TONES.map((t) => (
            <button key={t.id} onClick={() => setTone(t.id)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: `1px solid ${tone === t.id ? 'var(--accent)' : 'var(--border)'}`,
              background: tone === t.id ? 'rgba(167,139,250,0.1)' : 'var(--bg3)',
              color: tone === t.id ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer',
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={rewrite} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={14} />}
          Rewrite for {platCfg?.label}
        </button>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{result.charCount} chars {result.withinLimit ? '✅' : '⚠️ over limit'}</span>
              <button onClick={() => { navigator.clipboard.writeText(result.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg3)', color: copied ? '#3ecf8e' : 'var(--text2)', cursor: 'pointer' }}>
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid var(--border)' }}>
              {result.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main page ──
export default function SocialGenerator() {
  const [platform, setPlatform] = useState('twitter');
  const [tone, setTone]         = useState('professional');
  const [topic, setTopic]       = useState('');
  const [customContext, setCustomContext] = useState('');
  const [count, setCount]       = useState(3);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis]     = useState(true);
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState(null);
  const [rewriteContent, setRewriteContent] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Trending topics for quick pick
  const { data: trendingTopics } = useQuery({
    queryKey: ['socialTrending'],
    queryFn: () => api.get('/social/trending-topics').then((r) => r.data),
    refetchInterval: 300000,
  });

  const generate = async () => {
    if (!topic.trim() && !trendingTopics?.length) {
      toast.error('Enter a topic or wait for trending topics to load');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await api.post('/social/generate', {
        topic: topic.trim() || undefined,
        platform,
        tone,
        count,
        customContext,
        includeHashtags,
        includeEmojis,
      });
      setResults(res.data);
      toast.success(`${res.data.posts.length} posts generated!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed. Check GROQ_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const platCfg = PLATFORMS.find((p) => p.id === platform);

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)', fontFamily: 'inherit',
    fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
  };

  return (
    <div className="fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Social Post Generator</h1>
          <p className="page-sub">Turn today's news into viral social media content — powered by AI</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: 'rgba(52,211,153,0.1)', color: '#3ecf8e',
            border: '1px solid rgba(52,211,153,0.3)',
          }}>
            ● Live news context
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT PANEL — Config ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Platform picker */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
              Platform
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  style={{
                    padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    border: `2px solid ${platform === p.id ? p.color : 'var(--border)'}`,
                    background: platform === p.id ? `${p.color}15` : 'var(--bg3)',
                    color: platform === p.id ? p.color : 'var(--text2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{p.emoji}</span>
                  <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <div>{p.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>
                      {p.limit >= 1000 ? `${(p.limit / 1000).toFixed(0)}k` : p.limit} chars
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tone picker */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
              Tone
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${tone === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: tone === t.id ? 'rgba(167,139,250,0.12)' : 'var(--bg3)',
                    color: tone === t.id ? 'var(--accent)' : 'var(--text2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic input */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
              Topic
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
              placeholder="e.g. AI regulation, Bitcoin crash, climate summit..."
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
              Leave empty to use today's top trending topic automatically
            </p>

            {/* Trending quick picks */}
            {trendingTopics?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>🔥 Trending now:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {trendingTopics.slice(0, 6).map((t) => (
                    <button
                      key={t.keyword}
                      onClick={() => setTopic(t.keyword)}
                      style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${topic === t.keyword ? 'var(--accent)' : 'var(--border)'}`,
                        background: topic === t.keyword ? 'rgba(167,139,250,0.1)' : 'var(--bg3)',
                        color: topic === t.keyword ? 'var(--accent)' : 'var(--text3)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {t.isBreaking && '🔥'}
                      {t.keyword}
                      <span style={{ opacity: 0.6 }}>×{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced options */}
          <div className="card" style={{ padding: 20 }}>
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none',
                color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
              }}
            >
              <span>⚙️ Advanced options</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Post count */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                    Number of posts: <strong style={{ color: 'var(--accent)' }}>{count}</strong>
                  </div>
                  <input type="range" min="1" max="5" value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
                    <span>1</span><span>5</span>
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { label: '#️⃣ Hashtags', val: includeHashtags, set: setIncludeHashtags },
                    { label: '😊 Emojis',   val: includeEmojis,   set: setIncludeEmojis   },
                  ].map(({ label, val, set }) => (
                    <button key={label} onClick={() => set((v) => !v)} style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${val ? 'var(--green)' : 'var(--border)'}`,
                      background: val ? 'rgba(52,211,153,0.1)' : 'var(--bg3)',
                      color: val ? 'var(--green)' : 'var(--text3)', cursor: 'pointer',
                    }}>
                      {val ? '✓ ' : ''}{label}
                    </button>
                  ))}
                </div>

                {/* Custom context */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                    Extra context / instructions:
                  </div>
                  <textarea
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    placeholder="e.g. Focus on impact for small businesses, mention our brand, avoid mentioning competitors..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={loading}
            style={{
              justifyContent: 'center', fontSize: 14, padding: '14px',
              borderRadius: 12, gap: 8,
              background: loading ? 'var(--bg3)' : `linear-gradient(135deg, var(--accent), #f472b6)`,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(167,139,250,0.3)',
            }}
          >
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating...</>
              : <><Sparkles size={16} /> Generate {count} Post{count > 1 ? 's' : ''} for {platCfg?.label}</>
            }
          </button>
        </div>

        {/* ── RIGHT PANEL — Results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Empty state */}
          {!loading && !results && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✍️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Ready to create content
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' }}>
                Pick a platform, choose your tone, enter a topic or pick a trending one — then hit Generate!
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                {PLATFORMS.map((p) => (
                  <div key={p.id} style={{ fontSize: 28 }}>{p.emoji}</div>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: 'var(--bg3)', borderRadius: 4, width: '40%', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 4, width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  </div>
                  {[100, 80, 90, 70].map((w, j) => (
                    <div key={j} style={{ height: 13, background: 'var(--bg3)', borderRadius: 4, width: `${w}%`, marginBottom: 8, animation: `pulse 1.5s ease-in-out ${j * 0.1}s infinite` }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <>
              {/* Result meta bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '10px 16px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 12,
              }}>
                <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, color: 'var(--text)' }}>
                  <strong>{results.posts.length} posts</strong> generated for
                  <strong style={{ color: platCfg?.color }}> {results.platform}</strong>
                </span>
                {results.topic && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    · Topic: <strong style={{ color: 'var(--text2)' }}>{results.topic}</strong>
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  · {results.sourceCount} articles analyzed
                </span>
                <button
                  onClick={generate}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: '1px solid var(--border)', background: 'var(--bg3)',
                    color: 'var(--text2)', cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={11} /> Regenerate
                </button>
              </div>

              {/* Post cards */}
              {results.posts.map((post, i) => (
                <PostCard
                  key={i}
                  post={post}
                  platform={platform}
                  onCopy={() => toast.success('Copied to clipboard!')}
                  onRewrite={(content) => setRewriteContent({ content, fromPlatform: platform })}
                />
              ))}

              {/* Source articles */}
              {results.articles?.length > 0 && (
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
                    📰 Source articles used
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {results.articles.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span className={`badge badge-${a.sentimentLabel}`} style={{ flexShrink: 0 }}>{a.sentimentLabel}</span>
                        <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>{a.source}</span>
                        <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cross-post modal */}
      {rewriteContent && (
        <RewriteModal
          content={rewriteContent.content}
          fromPlatform={rewriteContent.fromPlatform}
          onClose={() => setRewriteContent(null)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 900px) {
          .social-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
