import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, TrendingUp, Newspaper, Zap, Menu, X, BookOpen, Bell, BarChart2, Search, Shield, Calendar, Globe, Share2 } from 'lucide-react';
import './styles/global2.css';
import Dashboard from './pages/Dashboard';
import Trends from './pages/Trends';
import Articles from './pages/Articles';
import Insights from './pages/Insights';
import Briefing from './pages/Briefing';
import Watchlist from './pages/Watchlist';
import Stocks from './pages/Stocks';
import SmartSearch from './pages/SmartSearch';
import Sources from './pages/Sources';
import Heatmap from './pages/Heatmap';
import GeoPage from './pages/GeoPage';
import SocialGenerator from './pages/SocialGenerator';


const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 60000 } },
});

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trends', icon: TrendingUp, label: 'Trends' },
  { to: '/articles', icon: Newspaper, label: 'Articles' },
  { to: '/insights', icon: Zap, label: 'AI Insights' },
  { to: '/briefing', icon: BookOpen, label: 'Intelligence' },
  { to: '/watchlist', icon: Bell, label: 'Watchlist' },
  { to: '/stocks', icon: BarChart2, label: 'Markets' },
  { to: '/search', icon: Search, label: 'Smart Search' },
  { to: '/sources', icon: Shield, label: 'Sources' },
  { to: '/heatmap', icon: Calendar, label: 'Heatmap' },
  { to: '/geo', icon: Globe, label: 'World Map' },
  { to: '/social', icon: Share2, label: 'Social Posts' },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isLight = theme === 'light';

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app-root">

          {/* Dark overlay for mobile */}
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />

          {/* ── SIDEBAR ── */}
          <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>

            {/* Logo row */}
            <div className="sidebar-logo-row">
              <div>
                <div className="sidebar-brand">PULSE</div>
                <div className="sidebar-sub">News Intelligence</div>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="toggle-btn"
                title={isLight ? 'Switch to Dark' : 'Switch to Light'}
              >
                <span>{isLight ? '🌙' : '☀️'}</span>
              </button>
            </div>

            {/* Nav links */}
            <nav className="sidebar-nav">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Live dot */}
            <div className="sidebar-footer">
              <span className="pulse-dot" />
              <span>Live monitoring</span>
            </div>
          </aside>

          {/* ── MAIN AREA ── */}
          <div className="main-area">

            {/* Mobile topbar — only shows on small screens */}
            <div className="topbar">
              <div className="sidebar-brand" style={{ fontSize: 18 }}>PULSE</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={toggleTheme}
                  className="toggle-btn"
                >
                  <span>{isLight ? '🌙' : '☀️'}</span>
                </button>
                <button
                  className="hamburger"
                  onClick={() => setSidebarOpen(o => !o)}
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>

            {/* Page content */}
            <main className="page-main">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/articles" element={<Articles />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/briefing" element={<Briefing />} />
<Route path="/watchlist" element={<Watchlist />} />
<Route path="/stocks" element={<Stocks />} />
<Route path="/search" element={<SmartSearch />} />
<Route path="/sources" element={<Sources />} />
<Route path="/heatmap" element={<Heatmap />} />
<Route path="/geo" element={<GeoPage />} />
<Route path="/social" element={<SocialGenerator />} />
              </Routes>
            </main>
          </div>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  );
}

// import { useState, useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { Toaster } from 'react-hot-toast';
// import { LayoutDashboard, TrendingUp, Newspaper, Zap, Menu, X ,BookOpen, Bell, BarChart2} from 'lucide-react';
// import './styles/global2.css';
// import Dashboard from './pages/Dashboard';
// import Trends from './pages/Trends';
// import Articles from './pages/Articles';
// import Insights from './pages/Insights';
// import Briefing from './pages/Briefing';
// import Watchlist from './pages/Watchlist';
// import Stocks from './pages/Stocks';


// const queryClient = new QueryClient({
//   defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 60000 } },
// });

// const NAV = [
//   { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
//   { to: '/trends', icon: TrendingUp, label: 'Trends' },
//   { to: '/articles', icon: Newspaper, label: 'Articles' },
//   { to: '/insights', icon: Zap, label: 'AI Insights' },
//   { to: '/briefing', icon: BookOpen, label: 'Intelligence' },
//   { to: '/watchlist', icon: Bell, label: 'Watchlist' },
//   { to: '/stocks', icon: BarChart2, label: 'Markets' },
// ];

// export default function App() {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

//   useEffect(() => {
//     document.documentElement.setAttribute('data-theme', theme);
//     localStorage.setItem('theme', theme);
//   }, [theme]);

//   const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
//   const isLight = theme === 'light';

//   return (
//     <QueryClientProvider client={queryClient}>
//       <Router>
//         <div className="app-root">

//           {/* Dark overlay for mobile */}
//           <div
//             className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
//             onClick={() => setSidebarOpen(false)}
//           />

//           {/* ── SIDEBAR ── */}
//           <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>

//             {/* Logo row */}
//             <div className="sidebar-logo-row">
//               <div>
//                 <div className="sidebar-brand">PULSE</div>
//                 <div className="sidebar-sub">News Intelligence</div>
//               </div>

//               {/* Theme toggle */}
//               <button
//                 onClick={toggleTheme}
//                 className="toggle-btn"
//                 title={isLight ? 'Switch to Dark' : 'Switch to Light'}
//               >
//                 <span>{isLight ? '🌙' : '☀️'}</span>
//               </button>
//             </div>

//             {/* Nav links */}
//             <nav className="sidebar-nav">
//               {NAV.map(({ to, icon: Icon, label }) => (
//                 <NavLink
//                   key={to}
//                   to={to}
//                   end={to === '/'}
//                   className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
//                   onClick={() => setSidebarOpen(false)}
//                 >
//                   <Icon size={16} />
//                   {label}
//                 </NavLink>
//               ))}
//             </nav>

//             {/* Live dot */}
//             <div className="sidebar-footer">
//               <span className="pulse-dot" />
//               <span>Live monitoring</span>
//             </div>
//           </aside>

//           {/* ── MAIN AREA ── */}
//           <div className="main-area">

//             {/* Mobile topbar — only shows on small screens */}
//             <div className="topbar">
//               <div className="sidebar-brand" style={{ fontSize: 18 }}>PULSE</div>
//               <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
//                 <button
//                   onClick={toggleTheme}
//                   className="toggle-btn"
//                 >
//                   <span>{isLight ? '🌙' : '☀️'}</span>
//                 </button>
//                 <button
//                   className="hamburger"
//                   onClick={() => setSidebarOpen(o => !o)}
//                 >
//                   {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
//                 </button>
//               </div>
//             </div>

//             {/* Page content */}
//             <main className="page-main">
//               <Routes>
//                 <Route path="/" element={<Dashboard />} />
//                 <Route path="/trends" element={<Trends />} />
//                 <Route path="/articles" element={<Articles />} />
//                 <Route path="/insights" element={<Insights />} />
//                 <Route path="/briefing" element={<Briefing />} />
// <Route path="/watchlist" element={<Watchlist />} />
// <Route path="/stocks" element={<Stocks />} />
//               </Routes>
//             </main>
//           </div>
//         </div>

//         <Toaster
//           position="bottom-right"
//           toastOptions={{
//             style: {
//               background: 'var(--bg2)',
//               color: 'var(--text)',
//               border: '1px solid var(--border)',
//               fontFamily: 'DM Sans, sans-serif',
//               fontSize: '13px',
//             },
//           }}
//         />
//       </Router>
//     </QueryClientProvider>
//   );
// }