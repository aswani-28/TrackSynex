import { useEffect, useMemo, useState } from 'react';

import { getDefects } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const MaintenanceTasksPage = () => {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('all');
  const [department, setDepartment] = useState('all');
  const [sortKey, setSortKey] = useState('priority-desc');

  const loadDefects = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDefects();
      setDefects(data || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch maintenance tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefects();
  }, []);

  const departments = useMemo(
    () => [...new Set(defects.map((task) => task.department).filter(Boolean))].sort(),
    [defects],
  );

  const filteredDefects = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...defects].filter((task) => {
      const matchesSearch =
        !query ||
        [task.defect_id, task.department, task.section_id, task.location, task.defect_type]
          .join(' ')
          .toLowerCase()
          .includes(query);

      const matchesUrgency = urgency === 'all' || task.urgency_band === urgency;
      const matchesDepartment = department === 'all' || task.department === department;

      return matchesSearch && matchesUrgency && matchesDepartment;
    });

    sorted.sort((a, b) => {
      const aScore = Number(a.final_priority_score || a.priority_score || 0);
      const bScore = Number(b.final_priority_score || b.priority_score || 0);
      const aDuration = Number(a.estimated_duration_hours || 0);
      const bDuration = Number(b.estimated_duration_hours || 0);

      switch (sortKey) {
        case 'score-asc':
          return aScore - bScore;
        case 'score-desc':
          return bScore - aScore;
        case 'duration-asc':
          return aDuration - bDuration;
        case 'duration-desc':
          return bDuration - aDuration;
        case 'section':
          return (a.section_id || '').localeCompare(b.section_id || '');
        case 'department':
          return (a.department || '').localeCompare(b.department || '');
        default:
          return bScore - aScore;
      }
    });

    return sorted;
  }, [defects, search, urgency, department, sortKey]);

  const summary = useMemo(() => {
    const critical = defects.filter((task) => ['P1 - Immediate', 'P2 - Urgent'].includes(task.urgency_band)).length;
    const avgScore = defects.length
      ? defects.reduce((total, task) => total + Number(task.final_priority_score || task.priority_score || 0), 0) / defects.length
      : 0;
    return {
      tasks: defects.length,
      critical,
      avgScore,
      departments: departments.length,
    };
  }, [defects, departments]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="panel loading-panel">Loading maintenance tasks…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="panel error-panel">
          <span>{error}</span>
          <button type="button" className="secondary-btn" onClick={loadDefects}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-title-block">
          <p className="eyebrow">Maintenance operations</p>
          <h1>Maintenance Tasks</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-btn" onClick={loadDefects}>Refresh</button>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total tasks</span>
          <strong>{summary.tasks}</strong>
        </div>
        <div className="summary-card critical">
          <span>Critical backlog</span>
          <strong>{summary.critical}</strong>
        </div>
        <div className="summary-card">
          <span>Average score</span>
          <strong>{summary.avgScore.toFixed(1)}</strong>
        </div>
        <div className="summary-card">
          <span>Departments</span>
          <strong>{summary.departments}</strong>
        </div>
      </div>

      <div className="panel filters-panel">
        <div className="filter-group">
          <label htmlFor="task-search">Search</label>
          <input id="task-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find defect, section, or location" />
        </div>
        <div className="filter-group">
          <label htmlFor="task-urgency">Urgency</label>
          <select id="task-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="all">All</option>
            <option value="P1 - Immediate">P1 - Immediate</option>
            <option value="P2 - Urgent">P2 - Urgent</option>
            <option value="P3 - Planned">P3 - Planned</option>
            <option value="P4 - Routine">P4 - Routine</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="task-department">Department</label>
          <select id="task-department" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="task-sort">Sort</label>
          <select id="task-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="score-desc">Priority score: high to low</option>
            <option value="score-asc">Priority score: low to high</option>
            <option value="duration-desc">Duration: long to short</option>
            <option value="duration-asc">Duration: short to long</option>
            <option value="section">Section</option>
            <option value="department">Department</option>
          </select>
        </div>
      </div>

      <div className="panel table-panel">
        {filteredDefects.length === 0 ? (
          <div className="empty-state">
            <h3>No matching maintenance tasks</h3>
            <p>Try resetting the filters or searching for a different section or defect reference.</p>
            <button type="button" className="secondary-btn" onClick={() => { setSearch(''); setUrgency('all'); setDepartment('all'); }}>Reset filters</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Location</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Duration</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefects.map((task) => (
                <tr key={task.defect_id}>
                  <td>
                    <div className="row-label">{task.defect_id}</div>
                    <small>{task.defect_type}</small>
                  </td>
                  <td>
                    <div>{task.section_id}</div>
                    <small>{task.location}</small>
                  </td>
                  <td>{task.department}</td>
                  <td>
                    <StatusBadge
                      label={task.urgency_band}
                      type={task.urgency_band?.startsWith('P1') ? 'P1' : task.urgency_band?.startsWith('P2') ? 'P2' : 'P3'}
                    />
                  </td>
                  <td>{Number(task.estimated_duration_hours || 0).toFixed(1)}h</td>
                  <td>{Number(task.final_priority_score || task.priority_score || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MaintenanceTasksPage;
