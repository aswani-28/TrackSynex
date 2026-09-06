import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import {
  AIIcon,
  AnalyticsIcon,
  BlockIcon,
  ConflictIcon,
  DashboardIcon,
  DepartmentIcon,
  MaintenanceIcon,
  ReportIcon,
  ScheduleIcon,
  ThemeToggle,
} from './components/Branding';
import CinematicIntro from './components/CinematicIntro';
import TracksynexLogo from './components/TracksynexLogo';
import AIPage from './pages/AIPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BlockPlanningPage from './pages/BlockPlanningPage';
import ConflictsPage from './pages/ConflictsPage';
import DashboardPage from './pages/DashboardPage';
import DepartmentsPage from './pages/DepartmentsPage';
import MaintenanceTasksPage from './pages/MaintenanceTasksPage';
import ReportsPage from './pages/ReportsPage';
import SchedulePage from './pages/SchedulePage';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/maintenance-tasks', label: 'Maintenance Tasks', icon: <MaintenanceIcon /> },
  { to: '/ai-priority', label: 'AI Priority', icon: <AIIcon /> },
  { to: '/block-planning', label: 'Block Planning', icon: <BlockIcon /> },
  { to: '/conflicts', label: 'Conflicts', icon: <ConflictIcon /> },
  { to: '/departments', label: 'Departments', icon: <DepartmentIcon /> },
  { to: '/reports', label: 'Reports', icon: <ReportIcon /> },
  { to: '/schedule', label: 'Train Schedule', icon: <ScheduleIcon /> },
  { to: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
];

const AppLayout = () => {
  const location = useLocation();
  const [introComplete, setIntroComplete] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('tracksynex-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentPageTitle = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname);
    return match?.label || 'Operations Dashboard';
  }, [location.pathname]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('tracksynex-theme', theme);
  }, [theme]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <>
      <CinematicIntro
        onComplete={() => setIntroComplete(true)}
        replayTrigger={replayCount}
      />

      <div
        className={`app-shell ${introComplete ? 'app-shell-ready' : ''}`}
        style={{ '--sidebar-width': sidebarCollapsed ? '94px' : '270px' }}
      >
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label="Toggle navigation menu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>

        <div
          className={`mobile-drawer-backdrop ${mobileNavOpen ? 'visible' : ''}`}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />

        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileNavOpen ? 'mobile-open' : ''}`}>
          <div className="brand-box">
            <div className="brand-inline">
              <TracksynexLogo compact={sidebarCollapsed} brandDestination />
              <button
                type="button"
                className={`sidebar-collapse-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="sidebar-footer">
              <button
                type="button"
                className="sidebar-replay-link"
                onClick={() => {
                  setIntroComplete(false);
                  setReplayCount((c) => c + 1);
                }}
                title="Replay Cinematic Train Animation"
              >
                <span className="status-dot" />
                <span>Replay Train Intro</span>
              </button>
            </div>
          )}
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div className="topbar-meta">
              <p className="eyebrow">Indian Railways Central Operations Command • Prayagraj / NCR Division</p>
              <h2>{currentPageTitle}</h2>
            </div>
            <div className="topbar-actions">
              <button
                type="button"
                className="topbar-replay-btn"
                onClick={() => {
                  setIntroComplete(false);
                  setReplayCount((c) => c + 1);
                }}
                title="Replay High-Speed Train Animation"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12v-2a8 8 0 1 1 2.34 5.66L4 18" />
                  <path d="M4 14h4v4" />
                </svg>
                <span>Train Animation</span>
              </button>
              <span className="pill success">LIVE • CORRIDOR ACTIVE</span>
              <span className="pill muted">NCR / Prayagraj Division</span>
              <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} />
            </div>
          </header>

          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/maintenance-tasks" element={<MaintenanceTasksPage />} />
            <Route path="/ai-priority" element={<AIPage />} />
            <Route path="/block-planning" element={<BlockPlanningPage />} />
            <Route path="/conflicts" element={<ConflictsPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;
