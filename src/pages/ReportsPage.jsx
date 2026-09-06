import { useEffect, useMemo, useState } from 'react';

import { getComparison, getDefects } from '../services/api';

const ReportsPage = () => {
  const [comparison, setComparison] = useState({ weekly: [], monthly: [] });
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [comparisonData, defectsData] = await Promise.all([getComparison(), getDefects()]);
      setComparison(comparisonData || { weekly: [], monthly: [] });
      setDefects(defectsData || []);
    } catch (err) {
      setError(err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const data = [...(comparison.weekly || []), ...(comparison.monthly || [])];
    return data.map((item) => ({
      ...item,
      label: `${item.plan} (${item.plan.includes('Manual') ? 'Baseline' : 'Optimized'})`,
    }));
  }, [comparison]);

  const backlogSummary = useMemo(() => ({
    total: defects.length,
    high: defects.filter((item) => item.urgency_band === 'P1 - Immediate').length,
    urgent: defects.filter((item) => item.urgency_band === 'P2 - Urgent').length,
    planned: defects.filter((item) => item.urgency_band === 'P3 - Planned').length,
  }), [defects]);

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading reports…</div></div>;
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
          <p className="eyebrow">Management summary</p>
          <h1>Reports</h1>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total defects</span>
          <strong>{backlogSummary.total}</strong>
        </div>
        <div className="summary-card critical">
          <span>High urgency</span>
          <strong>{backlogSummary.high}</strong>
        </div>
        <div className="summary-card warning">
          <span>Urgent tasks</span>
          <strong>{backlogSummary.urgent}</strong>
        </div>
        <div className="summary-card success">
          <span>Planned tasks</span>
          <strong>{backlogSummary.planned}</strong>
        </div>
      </div>

      <div className="panel table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Scheduled</th>
              <th>Unscheduled</th>
              <th>Clearance</th>
              <th>Bundling</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row, index) => (
              <tr key={`${row.plan}-${index}`}>
                <td>{row.plan}</td>
                <td>{row.scheduled_defects}</td>
                <td>{row.unscheduled_defects}</td>
                <td>{Number(row.clearance_pct || 0).toFixed(1)}%</td>
                <td>{Number(row.bundling_rate_pct || 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;
