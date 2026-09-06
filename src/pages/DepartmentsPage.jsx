import { useEffect, useMemo, useState } from 'react';

import { getDefects } from '../services/api';

const DepartmentsPage = () => {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDefects();
      setDefects(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load department overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const departmentStats = useMemo(() => {
    const map = {};
    defects.forEach((item) => {
      const key = item.department || 'Unknown';
      map[key] = map[key] || { name: key, count: 0, totalScore: 0 };
      map[key].count += 1;
      map[key].totalScore += Number(item.final_priority_score || item.priority_score || 0);
    });

    return Object.values(map).map((stat) => ({
      ...stat,
      averagePriority: stat.count ? stat.totalScore / stat.count : 0,
      criticalBacklog: defects.filter(
        (item) => item.department === stat.name && ['P1 - Immediate', 'P2 - Urgent'].includes(item.urgency_band),
      ).length,
    }));
  }, [defects]);

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading department analytics…</div></div>;
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="panel error-panel">
          <span>{error}</span>
          <button type="button" className="secondary-btn" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-title-block">
          <p className="eyebrow">Departmental view</p>
          <h1>Departments</h1>
        </div>
      </header>

      <div className="summary-grid">
        {departmentStats.map((row) => (
          <div className="summary-card" key={row.name}>
            <span>{row.name}</span>
            <strong>{row.count}</strong>
          </div>
        ))}
      </div>

      <div className="panel table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Tasks</th>
              <th>Average priority</th>
              <th>Critical backlog</th>
            </tr>
          </thead>
          <tbody>
            {departmentStats.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.count}</td>
                <td>{row.averagePriority.toFixed(1)}</td>
                <td>{row.criticalBacklog}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentsPage;
