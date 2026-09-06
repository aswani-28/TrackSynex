import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

import { getComparison, getDefects, getSchedule, getSlots } from '../services/api';

const COLORS = ['#7dd3fc', '#fbbf24', '#34d399', '#f87171', '#a78bfa'];

const AnalyticsPage = () => {
  const [defects, setDefects] = useState([]);
  const [comparison, setComparison] = useState({ weekly: [], monthly: [] });
  const [slots, setSlots] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [defectsData, comparisonData, slotsData, scheduleData] = await Promise.all([
          getDefects(),
          getComparison(),
          getSlots({ horizon: 'weekly' }),
          getSchedule('weekly'),
        ]);

        setDefects(defectsData || []);
        setComparison(comparisonData || { weekly: [], monthly: [] });
        setSlots(slotsData || []);
        setSchedule(scheduleData || []);
      } catch (err) {
        setError(err.message || 'Unable to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const urgencyStats = useMemo(() => {
    const map = {};
    defects.forEach((item) => {
      const key = item.urgency_band || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [defects]);

  const departmentStats = useMemo(() => {
    const map = {};
    defects.forEach((item) => {
      const key = item.department || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [defects]);

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading analytics…</div></div>;
  }

  if (error) {
    return <div className="page-shell"><div className="panel error-panel">{error}</div></div>;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operational insights</p>
          <h1>Analytics</h1>
        </div>
      </header>

      <div className="panel-grid two-column">
        <div className="panel">
          <div className="panel-header"><h2>Weekly plan metrics</h2></div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparison.weekly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" />
                <XAxis dataKey="plan" tick={{ fill: '#dfe8f5', fontSize: 11 }} />
                <YAxis tick={{ fill: '#dfe8f5', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="clearance_pct" fill="#5eead4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Urgency mix</h2></div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={urgencyStats} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {urgencyStats.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel-grid two-column">
        <div className="panel">
          <div className="panel-header"><h2>Department counts</h2></div>
          <div className="list-stack compact-list">
            {departmentStats.map((dept) => (
              <div className="department-row" key={dept.name}>
                <span>{dept.name}</span>
                <strong>{dept.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Capacity snapshot</h2></div>
          <div className="optimization-summary">
            <div><span>Total slots</span><strong>{slots.length}</strong></div>
            <div><span>Occupied</span><strong>{schedule.length}</strong></div>
            <div><span>Available</span><strong>{Math.max(0, slots.length - schedule.length)}</strong></div>
            <div><span>Defect backlog</span><strong>{defects.length}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
