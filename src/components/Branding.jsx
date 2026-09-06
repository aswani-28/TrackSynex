import TracksynexLogo from './TracksynexLogo';

export { TracksynexLogo };

export const ThemeToggle = ({ theme, onToggle }) => {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7L5.3 5.3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 15.6A7.6 7.6 0 0 1 8.4 4a8 8 0 1 0 11.6 11.6Z" />
        </svg>
      )}
    </button>
  );
};

export const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5V4h7.5v7.5H4Zm8.5 0V4H20v7.5h-7.5ZM4 20v-7.5h7.5V20H4Zm8.5 0V12.5H20V20h-7.5Z"/></svg>
);

export const MaintenanceIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5v-9Zm3 2.5h8M8 15h5"/></svg>
);

export const AIIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5v3.2M12 18.3v3.2M21.5 12h-3.2M5.7 12H2.5M18.3 5.7l-2.2 2.2M7.9 16.1l-2.2 2.2M18.3 18.3l-2.2-2.2M7.9 7.9L5.7 5.7M12 7.2A4.8 4.8 0 1 1 12 16.8A4.8 4.8 0 0 1 12 7.2Z"/></svg>
);

export const BlockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h16M4 15.5h16M7 6v12M17 6v12M8 5.5l4 4 4-4M8 18.5l4-4 4 4"/></svg>
);

export const ScheduleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5v2M17 3.5v2M4.5 8h15M6 6.5h12A1.5 1.5 0 0 1 19.5 8v10A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5Zm2.5 7.5h3v3h-3z"/></svg>
);

export const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.5V9.5M12 18.5V5.5M19 18.5v-7"/></svg>
);

export const ConflictIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8 3.5 18.5h17L12 3.8Zm0 6.2v4.5M12 17.5h.01"/></svg>
);

export const DepartmentIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5V7.5L12 3l8 4.5v11H4Zm8-9.5v9.5M8 10.5h8"/></svg>
);

export const ReportIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h8l4 4V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Zm8 0v4h4M8 12h8M8 16h6"/></svg>
);

export default TracksynexLogo;
