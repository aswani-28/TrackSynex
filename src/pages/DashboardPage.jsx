import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { computeAvailability, getComparison, getDefects, getSchedule, getSlots, getUnscheduled } from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    defects: [],
    comparison: { weekly: [], monthly: [] },
    slots: [],
    schedule: [],
    unscheduled: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        const [defects, comparison, slots, schedule, unscheduled] = await Promise.all([
          getDefects(),
          getComparison(),
          getSlots({ horizon: 'weekly' }),
          getSchedule('weekly'),
          getUnscheduled('weekly'),
        ]);

        setData({ defects, comparison, slots, schedule, unscheduled });
      } catch (err) {
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const weeklyComparison = data.comparison?.weekly || [];
  const optimizedPlan = weeklyComparison.find((plan) => plan.plan === 'Optimized') || weeklyComparison[0] || {};
  const availability = computeAvailability(data.slots, data.schedule);

  const criticalDefects = useMemo(
    () => data.defects.filter((item) => ['P1 - Immediate', 'P2 - Urgent'].includes(item.urgency_band)).length,
    [data.defects],
  );

  const priorityTasks = useMemo(
    () => [...data.defects].sort((a, b) => (Number(b.final_priority_score || b.priority_score || 0) - Number(a.final_priority_score || a.priority_score || 0))).slice(0, 5),
    [data.defects],
  );

  const urgencyDistribution = useMemo(() => {
    const map = {};
    data.defects.forEach((item) => {
      const label = item.urgency_band || 'Unknown';
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [data.defects]);

  const departmentBreakdown = useMemo(() => {
    const map = {};
    data.defects.forEach((item) => {
      const dept = item.department || 'Unknown';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [data.defects]);

  const sectionSummary = useMemo(() => {
    const map = {};
    data.schedule.forEach((item) => {
      const section = item.section_id || 'Unknown';
      map[section] = (map[section] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [data.schedule]);

  const timelineBlocks = useMemo(() => {
    if (!data.schedule.length) return [];
    const scheduleWithTimes = data.schedule
      .map((item) => {
        const start = new Date(item.start_datetime);
        const end = item.end_datetime ? new Date(item.end_datetime) : new Date(start.getTime() + (Number(item.duration_hours || 0) * 60 * 60 * 1000));
        return {
          ...item,
          start,
          end,
          startTime: start.getTime(),
          endTime: end.getTime(),
        };
      })
      .filter((item) => Number.isFinite(item.startTime) && Number.isFinite(item.endTime));

    const startMin = Math.min(...scheduleWithTimes.map((item) => item.startTime));
    const endMax = Math.max(...scheduleWithTimes.map((item) => item.endTime));
    const totalSpan = Math.max(endMax - startMin, 1);

    return scheduleWithTimes.map((item) => {
      const offset = ((item.startTime - startMin) / totalSpan) * 100;
      const width = Math.max(((item.endTime - item.startTime) / totalSpan) * 100, 8);
      return {
        ...item,
        offset,
        width,
        startLabel: item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endLabel: item.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
  }, [data.schedule]);

  const quickActions = [
    { label: 'Maintenance Tasks', to: '/maintenance-tasks' },
    { label: 'AI Priority', to: '/ai-priority' },
    { label: 'Block Planning', to: '/block-planning' },
    { label: 'Train Schedule', to: '/schedule' },
    { label: 'Conflicts', to: '/conflicts' },
    { label: 'Reports', to: '/reports' },
  ];

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading railway operations data…</div></div>;
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="panel error-panel">
          <span>{error}</span>
          <button type="button" className="secondary-btn" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header command-header">
        <div>
          <p className="eyebrow">Railway operations overview</p>
          <h1>RAILWAY OPERATIONS COMMAND CENTER</h1>
        </div>
        <div className="header-actions">
          <StatusBadge label="System live" type="available" />
          <div className="live-rail-monitor" aria-label="Live railway operations">
            <span className="live-rail-track" aria-hidden="true" />
            <svg className="live-rail-train" viewBox="0 0 48 24" aria-hidden="true">
              <path d="M7 4h25a7 7 0 0 1 7 7v5H7V4Z" />
              <path d="M12 8h8m3 0h8M7 16h32" />
              <circle cx="14" cy="19" r="2" />
              <circle cx="34" cy="19" r="2" />
              <path d="M39 11h4l2 5h-6" />
            </svg>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard title="Active maintenance tasks" value={data.defects.length} subtitle="Recorded defects" tone="primary" />
        <StatCard title="Critical tasks" value={criticalDefects} subtitle="P1 + P2 backlog" tone="critical" />
        <StatCard title="Planned blocks" value={data.schedule.length} subtitle="Occupied slots" tone="info" />
        <StatCard title="AI priority tasks" value={priorityTasks.length} subtitle="Top queued actions" tone="warning" />
        <StatCard title="Asset availability" value={`${Math.max(0, 100 - Math.round(availability.utilization))}%`} subtitle={`${availability.available} slots free`} tone="success" />
        <StatCard title="Operational conflicts" value={data.unscheduled.length} subtitle="Capacity-constrained cases" tone="critical" />
      </div>

      <div className="dashboard-grid">
        <div className="panel dashboard-panel wide-panel">
          <div className="panel-header">
            <h2>Railway network overview</h2>
            <StatusBadge label="Sections live" type="available" />
          </div>
          <div className="rail-network-panel">
            <div className="rail-network-track" aria-hidden="true">
              <span className="rail-network-node node-a" />
              <span className="rail-network-node node-b" />
              <span className="rail-network-node node-c" />
              <span className="rail-network-node node-d" />
            </div>
            <div className="rail-network-legend">
              {sectionSummary.slice(0, 5).map((section) => (
                <div key={section.name} className="network-legend-item">
                  <span className="legend-dot" />
                  <span>{section.name}</span>
                  <strong>{section.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel dashboard-panel">
          <div className="panel-header">
            <h2>AI maintenance priority</h2>
            <StatusBadge label="Ranked" type="info" />
          </div>
          <div className="priority-list">
            {priorityTasks.map((task, index) => (
              <div key={task.defect_id} className="priority-row">
                <div className="priority-rank">#{index + 1}</div>
                <div className="priority-copy">
                  <strong>{task.defect_id}</strong>
                  <span>{task.section_id} · {task.department}</span>
                </div>
                <div className="priority-meta">
                  <StatusBadge label={task.urgency_band} type={task.urgency_band?.startsWith('P1') ? 'P1' : task.urgency_band?.startsWith('P2') ? 'P2' : 'P3'} />
                  <strong>{Number(task.final_priority_score || task.priority_score || 0).toFixed(1)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel dashboard-panel">
        <div className="panel-header">
          <h2>Today's block planning</h2>
          <StatusBadge label="Occupied slots only" type="neutral" />
        </div>
        <div className="timeline-shell">
          <div className="timeline-axis">
            {['00:00', '06:00', '12:00', '18:00', '24:00'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="timeline-rows">
            {timelineBlocks.length ? timelineBlocks.map((item) => (
              <div key={item.slot_id} className="timeline-row">
                <div className="timeline-section">{item.section_id}</div>
                <div className="timeline-track">
                  <div className="timeline-bar" style={{ left: `${item.offset}%`, width: `${Math.max(item.width, 10)}%` }}>
                    <span>{item.slot_id}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-state compact">No occupied block data available for this horizon.</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel dashboard-panel">
          <div className="panel-header">
            <h2>Train schedule vs maintenance</h2>
            <StatusBadge label="Occupied slots" type="neutral" />
          </div>
          <div className="list-stack compact-list">
            {data.schedule.slice(0, 5).map((slot) => (
              <div key={slot.slot_id} className="detail-row">
                <div>
                  <strong>{slot.section_id}</strong>
                  <span>{slot.start_datetime} → {slot.end_datetime}</span>
                </div>
                <StatusBadge label={slot.assigned_defect_count ? `${slot.assigned_defect_count} task(s)` : 'Maintenance'} type="info" />
              </div>
            ))}
          </div>
        </div>

        <div className="panel dashboard-panel">
          <div className="panel-header">
            <h2>Critical conflicts</h2>
            <StatusBadge label="Capacity constrained" type="warning" />
          </div>
          <div className="list-stack compact-list">
            {data.unscheduled.slice(0, 5).map((item) => (
              <div key={item.defect_id} className="detail-row">
                <div>
                  <strong>{item.defect_id}</strong>
                  <span>{item.section_id} · {item.urgency_band}</span>
                </div>
                <StatusBadge label={item.unscheduled_reason || 'Unscheduled'} type={item.urgency_band?.startsWith('P1') ? 'P1' : 'warning'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel dashboard-panel">
          <div className="panel-header">
            <h2>Department workload</h2>
          </div>
          <div className="workload-chart">
            {departmentBreakdown.map((dept) => (
              <div key={dept.name} className="workload-row">
                <div className="workload-header">
                  <span>{dept.name}</span>
                  <strong>{dept.count}</strong>
                </div>
                <div className="workload-bar-track">
                  <div className="workload-bar" style={{ width: `${(dept.count / Math.max(...departmentBreakdown.map((entry) => entry.count), 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel dashboard-panel">
          <div className="panel-header">
            <h2>Asset availability</h2>
            <StatusBadge label="Real inventory" type="success" />
          </div>
          <div className="workload-chart">
            {sectionSummary.slice(0, 5).map((section) => {
              const pct = Math.max(0, 100 - (section.count / Math.max(data.schedule.length || 1, 1)) * 100);
              return (
                <div key={section.name} className="workload-row">
                  <div className="workload-header">
                    <span>{section.name}</span>
                    <strong>{Math.round(pct)}%</strong>
                  </div>
                  <div className="workload-bar-track">
                    <div className="workload-bar availability-bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel-grid two-column">
        <div className="panel">
          <div className="panel-header">
            <h2>Operational comparison</h2>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="plan" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="clearance_pct" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Urgency mix</h2>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={urgencyDistribution} dataKey="count" nameKey="name" innerRadius={42} outerRadius={82} paddingAngle={2}>
                  {urgencyDistribution.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel dashboard-panel">
        <div className="panel-header">
          <h2>Quick actions</h2>
        </div>
        <div className="quick-actions-grid">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to} className="quick-action-card">
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
