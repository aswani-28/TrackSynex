import { useEffect, useMemo, useState } from 'react';

import { getClassifications, getUnscheduled } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ConflictsPage = () => {
  const [classification, setClassification] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [classifiedData, unscheduledData] = await Promise.all([
        getClassifications('weekly'),
        getUnscheduled('weekly'),
      ]);
      setClassification(classifiedData || []);
      setUnscheduled(unscheduledData || []);
    } catch (err) {
      setError(err.message || 'Unable to load conflict data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reasonBreakdown = useMemo(() => {
    const map = {};
    classification.forEach((item) => {
      const key = item.reason || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [classification]);

  const severityBreakdown = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    unscheduled.forEach((item) => {
      if (item.urgency_band === 'P1 - Immediate') counts.Critical += 1;
      else if (item.urgency_band === 'P2 - Urgent') counts.High += 1;
      else if (item.urgency_band === 'P3 - Planned') counts.Medium += 1;
      else counts.Low += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [unscheduled]);

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading conflict analysis…</div></div>;
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
          <p className="eyebrow">Risk and feasibility</p>
          <h1>Conflicts</h1>
        </div>
      </header>

      <div className="summary-grid">
        {severityBreakdown.map((item) => (
          <div className="summary-card" key={item.name}>
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel table-panel">
        <div className="panel-header"><h2>Unscheduled defect reasons</h2></div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Defect</th>
              <th>Section</th>
              <th>Urgency</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {unscheduled.map((item) => (
              <tr key={item.defect_id}>
                <td>{item.defect_id}</td>
                <td>{item.section_id}</td>
                <td><StatusBadge label={item.urgency_band} type={item.urgency_band?.startsWith('P1') ? 'P1' : item.urgency_band?.startsWith('P2') ? 'P2' : 'P3'} /></td>
                <td>{item.unscheduled_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reasonBreakdown.length > 0 && (
        <div className="panel table-panel">
          <div className="panel-header"><h2>Conflict drivers</h2></div>
          <div className="list-stack">
            {reasonBreakdown.map((item) => (
              <div className="department-row" key={item.name}>
                <span>{item.name}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictsPage;
