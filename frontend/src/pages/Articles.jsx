import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Search, Filter, ExternalLink, Sparkles } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getArticles } from '../utils/api';

dayjs.extend(relativeTime);

const CATEGORIES = ['', 'general', 'technology', 'business', 'science', 'health', 'politics', 'world', 'sports'];
const SENTIMENTS = ['', 'positive', 'negative', 'neutral'];

const selectStyle = {
  padding: '8px 12px',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  outline: 'none',
};

export default function Articles() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [summaries, setSummaries] = useState({});
  const [summarizing, setSummarizing] = useState({});

  const summarize = async (article) => {
    if (summaries[article.id] || summarizing[article.id]) return;
    setSummarizing((p) => ({ ...p, [article.id]: true }));
    try {
      const res = await api.post('/analytics/summarize', { articleId: article.id });
      setSummaries((p) => ({ ...p, [article.id]: res.data }));
    } catch {
      toast.error('Could not summarize');
    } finally {
      setSummarizing((p) => ({ ...p, [article.id]: false }));
    }
  };

const { data, isLoading } = useQuery({
  queryKey: ['articles', { page, search, category, sentiment }],

  queryFn: async () => {
    const res = await getArticles({
      page,
      limit: 25,
      search: search || undefined,
      category: category || undefined,
      sentiment: sentiment || undefined,
    });
    return res.data;
  },

  placeholderData: (prev) => prev,
});

  const articles = data?.data || [];
  const pagination = data?.pagination || {};

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="fade-in w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Articles</h1>
          <p className="page-sub">Browse and search all scraped news articles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search articles..."
                style={{ ...selectStyle, width: '100%', paddingLeft: 32 }}
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            {search && (
              <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                Clear
              </button>
            )}
          </form>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={14} style={{ color: 'var(--text3)' }} />
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
            </select>
            <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(1); }} style={selectStyle}>
              {SENTIMENTS.map(s => <option key={s} value={s}>{s || 'All Sentiments'}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Count */}
      {pagination.total > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 4 }}>
          {pagination.total.toLocaleString()} articles · Page {pagination.page} of {pagination.pages}
        </div>
      )}

      {/* Articles */}
      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" />
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            No articles found. Try scraping first or adjust your filters.
          </div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="article-item">
              {article.imageUrl && (
                <img
                  src={article.imageUrl}
                  alt=""
                  className="article-thumb"
                  onError={e => e.target.style.display = 'none'}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="article-title">{article.title}</div>
                <div className="article-meta">
                  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{article.source}</span>
                  <span>·</span>
                  <span className={`badge badge-${article.sentimentLabel}`}>{article.sentimentLabel}</span>
                  <span>·</span>
                  <span>{dayjs(article.publishedAt).fromNow()}</span>
                  {article.category && (
                    <>
                      <span>·</span>
                      <span style={{
                        background: 'var(--bg3)', borderRadius: 4,
                        padding: '1px 6px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5
                      }}>
                        {article.category}
                      </span>
                    </>
                  )}
                  <a href={article.url} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ marginLeft: 'auto', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ExternalLink size={11} />
                  </a>
                </div>
                {article.description && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
                    {article.description.slice(0, 150)}{article.description.length > 150 ? '...' : ''}
                  </p>
                )}
                {/* Summarize button */}
                {!summaries[article.id] ? (
                  <button
                    onClick={() => summarize(article)}
                    disabled={summarizing[article.id]}
                    style={{
                      marginTop: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      border: '1px solid var(--border)', borderRadius: 6,
                      background: 'transparent', color: 'var(--accent)',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Sparkles size={10} />
                    {summarizing[article.id] ? 'Summarizing...' : 'AI Summary'}
                  </button>
                ) : (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>
                      🤖 {summaries[article.id].tldr}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {summaries[article.id].bullets?.map((b, i) => (
                        <li key={i} style={{ fontSize: 11, color: 'var(--text2)', paddingLeft: 12, position: 'relative', marginBottom: 2 }}>
                          <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>›</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            ← Prev
          </button>
          <span style={{ padding: '8px 16px', color: 'var(--text2)', fontSize: 13 }}>
            {page} / {pagination.pages}
          </span>
          <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}




// import { useState } from 'react';
// import { useQuery } from "@tanstack/react-query";
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// import { Search, Filter, ExternalLink } from 'lucide-react';
// import { getArticles } from '../utils/api';

// dayjs.extend(relativeTime);

// const CATEGORIES = ['', 'general', 'technology', 'business', 'science', 'health', 'politics', 'world', 'sports'];
// const SENTIMENTS = ['', 'positive', 'negative', 'neutral'];

// const selectStyle = {
//   padding: '8px 12px',
//   background: 'var(--bg3)',
//   border: '1px solid var(--border)',
//   borderRadius: 8,
//   color: 'var(--text)',
//   fontFamily: 'DM Sans, sans-serif',
//   fontSize: 13,
//   outline: 'none',
// };

// export default function Articles() {
//   const [page, setPage] = useState(1);
//   const [search, setSearch] = useState('');
//   const [category, setCategory] = useState('');
//   const [sentiment, setSentiment] = useState('');
//   const [searchInput, setSearchInput] = useState('');

// const { data, isLoading } = useQuery({
//   queryKey: ['articles', { page, search, category, sentiment }],

//   queryFn: async () => {
//     const res = await getArticles({
//       page,
//       limit: 25,
//       search: search || undefined,
//       category: category || undefined,
//       sentiment: sentiment || undefined,
//     });
//     return res.data;
//   },

//   placeholderData: (prev) => prev,
// });

//   const articles = data?.data || [];
//   const pagination = data?.pagination || {};

//   const handleSearch = (e) => {
//     e.preventDefault();
//     setSearch(searchInput);
//     setPage(1);
//   };

//   return (
//     <div className="fade-in w-full">
//       <div className="page-header">
//         <div>
//           <h1 className="page-title">Articles</h1>
//           <p className="page-sub">Browse and search all scraped news articles</p>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="card" style={{ padding: '16px 20px' }}>
//         <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
//           <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
//             <div style={{ position: 'relative', flex: 1 }}>
//               <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
//               <input
//                 value={searchInput}
//                 onChange={e => setSearchInput(e.target.value)}
//                 placeholder="Search articles..."
//                 style={{ ...selectStyle, width: '100%', paddingLeft: 32 }}
//               />
//             </div>
//             <button type="submit" className="btn btn-primary">Search</button>
//             {search && (
//               <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
//                 Clear
//               </button>
//             )}
//           </form>

//           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
//             <Filter size={14} style={{ color: 'var(--text3)' }} />
//             <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} style={selectStyle}>
//               {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
//             </select>
//             <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(1); }} style={selectStyle}>
//               {SENTIMENTS.map(s => <option key={s} value={s}>{s || 'All Sentiments'}</option>)}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Count */}
//       {pagination.total > 0 && (
//         <div style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 4 }}>
//           {pagination.total.toLocaleString()} articles · Page {pagination.page} of {pagination.pages}
//         </div>
//       )}

//       {/* Articles */}
//       <div className="card">
//         {isLoading ? (
//           <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
//             <span className="spinner" />
//           </div>
//         ) : articles.length === 0 ? (
//           <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
//             No articles found. Try scraping first or adjust your filters.
//           </div>
//         ) : (
//           articles.map((article) => (
//             <div key={article.id} className="article-item">
//               {article.imageUrl && (
//                 <img
//                   src={article.imageUrl}
//                   alt=""
//                   className="article-thumb"
//                   onError={e => e.target.style.display = 'none'}
//                 />
//               )}
//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <div className="article-title">{article.title}</div>
//                 <div className="article-meta">
//                   <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{article.source}</span>
//                   <span>·</span>
//                   <span className={`badge badge-${article.sentimentLabel}`}>{article.sentimentLabel}</span>
//                   <span>·</span>
//                   <span>{dayjs(article.publishedAt).fromNow()}</span>
//                   {article.category && (
//                     <>
//                       <span>·</span>
//                       <span style={{
//                         background: 'var(--bg3)', borderRadius: 4,
//                         padding: '1px 6px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5
//                       }}>
//                         {article.category}
//                       </span>
//                     </>
//                   )}
//                   <a href={article.url} target="_blank" rel="noreferrer"
//                     onClick={e => e.stopPropagation()}
//                     style={{ marginLeft: 'auto', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
//                     <ExternalLink size={11} />
//                   </a>
//                 </div>
//                 {article.description && (
//                   <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
//                     {article.description.slice(0, 150)}{article.description.length > 150 ? '...' : ''}
//                   </p>
//                 )}
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       {/* Pagination */}
//       {pagination.pages > 1 && (
//         <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
//           <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
//             ← Prev
//           </button>
//           <span style={{ padding: '8px 16px', color: 'var(--text2)', fontSize: 13 }}>
//             {page} / {pagination.pages}
//           </span>
//           <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
//             Next →
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }