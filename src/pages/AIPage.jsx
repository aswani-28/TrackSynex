import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import StatusBadge from '../components/StatusBadge';
import {
  createRequest,
  getDefects,
  getRequestConflicts,
  getRequestSummary,
  getRequests,
  recalculatePriority,
} from '../services/api';

const DEPARTMENT_OPTIONS = [
  'Track / Engineering',
  'Signal & Telecom',
  'Electrical / Traction',
  'Works / Civil',
  'Rolling Stock',
  'Operations Control',
  'Other Department',
];

const emptyForm = {
  submitted_by: '',
  department: 'Track / Engineering',
  location: '',
  track_or_route: '',
  issue_type: '',
  description: '',
  severity: 'High',
  safety_impact: 'High',
  urgency: 'High',
  estimated_duration_hours: 4,
  required_resources: '',
  required_staff: '',
  preferred_datetime: '',
  trains_affected: 0,
  passenger_impact: 'Moderate',
  route_priority: 'High',
};

const getBadgeType = (value) => {
  const text = String(value || '').toUpperCase();
  if (text.includes('CRITICAL') || text.includes('P1')) return 'critical';
  if (text.includes('HIGH') || text.includes('P2')) return 'warning';
  if (text.includes('MEDIUM') || text.includes('P3')) return 'info';
  if (text.includes('LOW') || text.includes('P4')) return 'neutral';
  if (text.includes('CONFLICT')) return 'warning';
  if (text.includes('ANALYZING')) return 'info';
  if (text.includes('PRIORITIZED')) return 'success';
  if (text.includes('PENDING')) return 'neutral';
  return 'neutral';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const AIPage = () => {
  const [defects, setDefects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [summary, setSummary] = useState({
    total_requests: 0,
    critical_requests: 0,
    high_priority_requests: 0,
    medium_priority_requests: 0,
    pending_requests: 0,
    conflicts: 0,
    requests_under_analysis: 0,
  });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [filters, setFilters] = useState({
    department: 'All',
    priority: 'All',
    location: 'All',
    status: 'All',
    issueType: 'All',
    date: '',
    search: '',
  });
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [defectData, requestData, summaryData, conflictData] = await Promise.all([
        getDefects({ limit: 10 }),
        getRequests(),
        getRequestSummary(),
        getRequestConflicts(),
      ]);
      setDefects(defectData || []);
      setRequests(requestData || []);
      setSummary(summaryData || {
        total_requests: 0,
        critical_requests: 0,
        high_priority_requests: 0,
        medium_priority_requests: 0,
        pending_requests: 0,
        conflicts: 0,
        requests_under_analysis: 0,
      });
      setConflicts(conflictData || []);
    } catch (err) {
      setDefects([]);
      setRequests([]);
      setSummary({
        total_requests: 0,
        critical_requests: 0,
        high_priority_requests: 0,
        medium_priority_requests: 0,
        pending_requests: 0,
        conflicts: 0,
        requests_under_analysis: 0,
      });
      setConflicts([]);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const queue = useMemo(
    () => [...requests].sort((a, b) => Number(b.priority_score || 0) - Number(a.priority_score || 0)),
    [requests],
  );

  const departmentOptions = useMemo(
    () => ['All', ...new Set(queue.map((request) => request.department).filter(Boolean))],
    [queue],
  );

  const filteredQueue = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return queue.filter((request) => {
      const matchesDepartment = filters.department === 'All' || request.department === filters.department;
      const matchesPriority = filters.priority === 'All' || String(request.priority_level || '').toUpperCase() === filters.priority.toUpperCase();
      const matchesLocation = filters.location === 'All' || (request.location || '').toLowerCase().includes(filters.location.toLowerCase());
      const matchesStatus = filters.status === 'All' || String(request.status || '').toUpperCase() === filters.status.toUpperCase();
      const matchesIssue = filters.issueType === 'All' || (request.issue_type || '').toLowerCase().includes(filters.issueType.toLowerCase());
      const matchesDate = !filters.date || (request.preferred_datetime || '').startsWith(filters.date);
      const matchesSearch = !searchTerm || [request.request_id, request.submitted_by, request.location].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      return matchesDepartment && matchesPriority && matchesLocation && matchesStatus && matchesIssue && matchesDate && matchesSearch;
    });
  }, [queue, filters]);

  const selectedRequest = useMemo(
    () => filteredQueue.find((request) => request.request_id === selectedRequestId) || filteredQueue[0] || queue[0] || null,
    [filteredQueue, queue, selectedRequestId],
  );

  useEffect(() => {
    if (!selectedRequestId && queue.length > 0) {
      setSelectedRequestId(queue[0].request_id);
    }
    if (selectedRequest && !filteredQueue.some((request) => request.request_id === selectedRequest.request_id)) {
      setSelectedRequestId(filteredQueue[0]?.request_id || queue[0]?.request_id || '');
    }
  }, [queue, filteredQueue, selectedRequest, selectedRequestId]);

  const topPriority = useMemo(
    () => [...defects].sort((a, b) => (Number(b.final_priority_score || b.priority_score || 0) - Number(a.final_priority_score || a.priority_score || 0))).slice(0, 10),
    [defects],
  );

  const defectSummary = useMemo(() => {
    const highest = topPriority[0] || {};
    const avgScore = defects.length
      ? defects.reduce((total, item) => total + Number(item.final_priority_score || item.priority_score || 0), 0) / defects.length
      : 0;
    const critical = defects.filter((item) => ['P1 - Immediate', 'P2 - Urgent'].includes(item.urgency_band)).length;
    return {
      highest: Number(highest.final_priority_score || highest.priority_score || 0),
      avgScore,
      critical,
      total: defects.length,
    };
  }, [defects, topPriority]);

  const requestMetrics = useMemo(() => {
    const avgScore = queue.length
      ? queue.reduce((total, item) => total + Number(item.priority_score || 0), 0) / queue.length
      : 0;
    return {
      avgScore,
      critical: queue.filter((item) => String(item.priority_level || '').toUpperCase() === 'CRITICAL').length,
      high: queue.filter((item) => String(item.priority_level || '').toUpperCase() === 'HIGH').length,
      medium: queue.filter((item) => String(item.priority_level || '').toUpperCase() === 'MEDIUM').length,
      low: queue.filter((item) => String(item.priority_level || '').toUpperCase() === 'LOW').length,
      pending: queue.filter((item) => String(item.status || '').toUpperCase() === 'PENDING').length,
      conflicts: queue.filter((item) => String(item.status || '').toUpperCase() === 'CONFLICT').length,
      underAnalysis: queue.filter((item) => String(item.status || '').toUpperCase() === 'ANALYZING').length,
    };
  }, [queue]);

  const recommendations = useMemo(
    () => filteredQueue.slice(0, 3).map((request) => ({
      request_id: request.request_id,
      text: `${request.issue_type || 'Maintenance issue'} in ${request.location || request.track_or_route || 'section'} should be handled before lower-impact work because the score is ${Number(request.priority_score || 0).toFixed(1)} and the expected impact rating is ${request.safety_impact || 'High'}.`,
    })),
    [filteredQueue],
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFormMessage('');

    try {
      const payload = {
        ...form,
        section: form.location,
        estimated_duration_hours: Number(form.estimated_duration_hours || 0),
        trains_affected: Number(form.trains_affected || 0),
        preferred_datetime: form.preferred_datetime || new Date().toISOString(),
      };

      if (!payload.submitted_by || !payload.location || !payload.track_or_route || !payload.issue_type || !payload.description || !payload.required_resources || !payload.required_staff) {
        throw new Error('Please complete the requester, location, issue, staffing, and resource details before submitting.');
      }

      await createRequest(payload);
      setFormMessage('Request submitted successfully. The AI priority engine has queued it for analysis.');
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to submit the maintenance request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculate = async (requestId) => {
    try {
      setError('');
      await recalculatePriority(requestId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to recalculate priority for the selected request.');
    }
  };

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading AI prioritization…</div></div>;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-title-block">
          <p className="eyebrow">Optimization intelligence</p>
          <h1>AI Priority & Request Workflow</h1>
        </div>
      </header>

      <div className="filters-panel">
        <div className="filter-group">
          <label htmlFor="priority-search">Search</label>
          <input id="priority-search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Request ID, requester, location" />
        </div>
        <div className="filter-group">
          <label htmlFor="priority-department">Department</label>
          <select id="priority-department" value={filters.department} onChange={(event) => updateFilter('department', event.target.value)}>
            {departmentOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="priority-level">Priority</label>
          <select id="priority-level" value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
            <option value="All">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="priority-location">Location</label>
          <select id="priority-location" value={filters.location} onChange={(event) => updateFilter('location', event.target.value)}>
            <option value="All">All</option>
            {[...new Set(queue.map((request) => request.location).filter(Boolean))].map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="priority-status">Status</label>
          <select id="priority-status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="All">All</option>
            <option value="PENDING">Pending</option>
            <option value="ANALYZING">Analyzing</option>
            <option value="PRIORITIZED">Prioritized</option>
            <option value="CONFLICT">Conflict</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="priority-date">Preferred date</label>
          <input id="priority-date" type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} />
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total requests</span>
          <strong>{summary.total_requests || queue.length}</strong>
        </div>
        <div className="summary-card critical">
          <span>Critical</span>
          <strong>{summary.critical_requests || requestMetrics.critical}</strong>
        </div>
        <div className="summary-card warning">
          <span>High</span>
          <strong>{summary.high_priority_requests || requestMetrics.high}</strong>
        </div>
        <div className="summary-card">
          <span>Medium</span>
          <strong>{requestMetrics.medium}</strong>
        </div>
        <div className="summary-card neutral">
          <span>Low</span>
          <strong>{requestMetrics.low}</strong>
        </div>
        <div className="summary-card">
          <span>Under analysis</span>
          <strong>{summary.requests_under_analysis || requestMetrics.underAnalysis}</strong>
        </div>
        <div className="summary-card">
          <span>Conflicts</span>
          <strong>{summary.conflicts || conflicts.length || requestMetrics.conflicts}</strong>
        </div>
      </div>

      <div className="panel request-panel">
        <div className="panel-header">
          <h2>Submit maintenance request</h2>
        </div>
        <form className="request-form" onSubmit={handleSubmit}>
          <div className="request-form-grid">
            <div className="filter-group">
              <label htmlFor="submitted_by">Requester</label>
              <input id="submitted_by" value={form.submitted_by} onChange={(e) => updateField('submitted_by', e.target.value)} placeholder="Staff name / requester ID" />
            </div>
            <div className="filter-group">
              <label htmlFor="department">Department</label>
              <select id="department" value={form.department} onChange={(e) => updateField('department', e.target.value)}>
                {DEPARTMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="location">Railway section / location</label>
              <input id="location" value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g. Vijayawada–Nuzvid" />
            </div>
            <div className="filter-group">
              <label htmlFor="track_or_route">Track / route</label>
              <input id="track_or_route" value={form.track_or_route} onChange={(e) => updateField('track_or_route', e.target.value)} placeholder="e.g. UP Mainline / B-12" />
            </div>
            <div className="filter-group">
              <label htmlFor="issue_type">Issue type</label>
              <input id="issue_type" value={form.issue_type} onChange={(e) => updateField('issue_type', e.target.value)} placeholder="Track defect / Signal fault / OHE issue" />
            </div>
            <div className="filter-group">
              <label htmlFor="severity">Severity</label>
              <select id="severity" value={form.severity} onChange={(e) => updateField('severity', e.target.value)}>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Minor">Minor</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="safety_impact">Safety impact</label>
              <select id="safety_impact" value={form.safety_impact} onChange={(e) => updateField('safety_impact', e.target.value)}>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="urgency">Urgency</label>
              <select id="urgency" value={form.urgency} onChange={(e) => updateField('urgency', e.target.value)}>
                <option value="Immediate">Immediate</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="estimated_duration_hours">Estimated maintenance duration (hrs)</label>
              <input id="estimated_duration_hours" type="number" min="1" step="0.5" value={form.estimated_duration_hours} onChange={(e) => updateField('estimated_duration_hours', e.target.value)} />
            </div>
            <div className="filter-group">
              <label htmlFor="required_resources">Required resources</label>
              <input id="required_resources" value={form.required_resources} onChange={(e) => updateField('required_resources', e.target.value)} placeholder="Track gang, cranes, etc." />
            </div>
            <div className="filter-group">
              <label htmlFor="required_staff">Required staff</label>
              <input id="required_staff" value={form.required_staff} onChange={(e) => updateField('required_staff', e.target.value)} placeholder="Engineer + patrol team" />
            </div>
            <div className="filter-group">
              <label htmlFor="preferred_datetime">Preferred date/time</label>
              <input id="preferred_datetime" type="datetime-local" value={form.preferred_datetime} onChange={(e) => updateField('preferred_datetime', e.target.value)} />
            </div>
            <div className="filter-group">
              <label htmlFor="trains_affected">Trains affected</label>
              <input id="trains_affected" type="number" min="0" value={form.trains_affected} onChange={(e) => updateField('trains_affected', e.target.value)} />
            </div>
            <div className="filter-group">
              <label htmlFor="passenger_impact">Passenger impact</label>
              <select id="passenger_impact" value={form.passenger_impact} onChange={(e) => updateField('passenger_impact', e.target.value)}>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="route_priority">Route priority</label>
              <select id="route_priority" value={form.route_priority} onChange={(e) => updateField('route_priority', e.target.value)}>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="filter-group span-two">
              <label htmlFor="description">Issue description</label>
              <textarea id="description" value={form.description} onChange={(e) => updateField('description', e.target.value)} rows="4" placeholder="Describe the maintenance issue, safety risk, and operational impact." />
            </div>
          </div>
          <div className="request-action-row">
            <button type="submit" className="primary-btn" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
            <button type="button" className="secondary-btn" onClick={() => setForm(emptyForm)}>Reset form</button>
          </div>
          {formMessage ? <div className="success-banner">{formMessage}</div> : null}
        </form>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Requests</span>
          <strong>{summary.total_requests || queue.length}</strong>
        </div>
        <div className="summary-card critical">
          <span>Critical</span>
          <strong>{summary.critical_requests || requestMetrics.critical}</strong>
        </div>
        <div className="summary-card warning">
          <span>High priority</span>
          <strong>{summary.high_priority_requests || requestMetrics.high}</strong>
        </div>
        <div className="summary-card">
          <span>Pending</span>
          <strong>{summary.pending_requests || requestMetrics.pending}</strong>
        </div>
        <div className="summary-card">
          <span>Conflicts</span>
          <strong>{summary.conflicts || conflicts.length || requestMetrics.conflicts}</strong>
        </div>
        <div className="summary-card success">
          <span>Avg. score</span>
          <strong>{requestMetrics.avgScore.toFixed(1)}</strong>
        </div>
      </div>

      <div className="panel-grid two-column">
        <div className="panel table-panel">
          <div className="panel-header">
            <h2>AI priority queue</h2>
          </div>
          <div className="table-scroll-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Issue</th>
                  <th>Location</th>
                  <th>Safety</th>
                  <th>Urgency</th>
                  <th>Trains</th>
                  <th>Duration</th>
                  <th>Priority</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="13"><div className="empty-state compact">No requests match the selected AI priority filters.</div></td>
                  </tr>
                ) : (
                  filteredQueue.map((request) => (
                    <tr key={request.request_id} onClick={() => setSelectedRequestId(request.request_id)} style={{ cursor: 'pointer' }}>
                      <td>{request.request_id}</td>
                      <td>{request.submitted_by}</td>
                      <td>{request.department}</td>
                      <td>{request.issue_type}</td>
                      <td>{request.location}</td>
                      <td><StatusBadge label={request.safety_impact || 'High'} type={getBadgeType(request.safety_impact)} /></td>
                      <td><StatusBadge label={request.urgency || 'High'} type={getBadgeType(request.urgency)} /></td>
                      <td>{request.trains_affected || 0}</td>
                      <td>{Number(request.estimated_duration_hours || 0).toFixed(1)}h</td>
                      <td><StatusBadge label={request.priority_level || 'LOW'} type={getBadgeType(request.priority_level)} /></td>
                      <td>{Number(request.priority_score || 0).toFixed(1)}</td>
                      <td><StatusBadge label={request.status || 'PENDING'} type={getBadgeType(request.status)} /></td>
                      <td>
                        <button type="button" className="secondary-btn small-btn" onClick={(event) => {
                          event.stopPropagation();
                          handleRecalculate(request.request_id);
                        }}>Recalculate</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel table-panel">
          <div className="panel-header">
            <h2>Conflicts</h2>
          </div>
          {conflicts.length === 0 ? (
            <div className="empty-state compact">No overlapping maintenance conflicts detected.</div>
          ) : (
            <div className="list-stack">
              {conflicts.map((conflict) => (
                <div key={`${conflict.request_id}-${conflict.conflicting_request_id}`} className="detail-card conflict-card">
                  <div className="detail-card__topline">
                    <strong>{conflict.request_id} / {conflict.conflicting_request_id}</strong>
                    <StatusBadge label="Conflict" type="warning" />
                  </div>
                  <div className="detail-card__meta">
                    <span>{conflict.section}</span>
                    <span>{conflict.reason}</span>
                  </div>
                  <div className="detail-card__time">Time: {conflict.time}</div>
                  <div className="detail-card__time">Recommended window: {conflict.recommended_window}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRequest ? (
        <div className="panel">
          <div className="panel-header">
            <h2>Priority score details — {selectedRequest.request_id}</h2>
          </div>
          <div className="detail-grid">
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>AI Priority Score</strong>
                <StatusBadge label={String(selectedRequest.priority_level || 'LOW')} type={getBadgeType(selectedRequest.priority_level)} />
              </div>
              <div className="detail-card__meta">
                <span>Score</span>
                <strong>{Number(selectedRequest.priority_score || 0).toFixed(1)}</strong>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>Safety risk</strong>
              </div>
              <div className="detail-card__meta">
                <span>{selectedRequest.safety_impact || 'High'}</span>
                <strong>{selectedRequest.severity || 'High'}</strong>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>Operational impact</strong>
              </div>
              <div className="detail-card__meta">
                <span>Passenger impact</span>
                <strong>{selectedRequest.passenger_impact || 'Moderate'}</strong>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>Maintenance window</strong>
              </div>
              <div className="detail-card__meta">
                <span>Duration</span>
                <strong>{Number(selectedRequest.estimated_duration_hours || 0).toFixed(1)}h</strong>
              </div>
            </div>
          </div>
          <div className="ai-reason-box">
            <h4>AI recommendation</h4>
            <p>{selectedRequest.ai_priority_reason || 'AI analysis is in progress and a score explanation will appear when the model produces a result.'}</p>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-header">
          <h2>AI recommendations</h2>
        </div>
        <div className="list-stack">
          {recommendations.length === 0 ? (
            <div className="empty-state compact">No AI recommendations are currently available.</div>
          ) : (
            recommendations.map((recommendation) => (
              <div key={recommendation.request_id} className="detail-card">
                <div className="detail-card__topline">
                  <strong>{recommendation.request_id}</strong>
                  <StatusBadge label="AI RECOMMENDATION" type="info" />
                </div>
                <div className="detail-card__meta">
                  <span>{recommendation.text}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Top 10 prioritized defects</h2>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="defect_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="rule_priority_score" fill="#7dd3fc" radius={[6, 6, 0, 0]} />
              <Bar dataKey="ml_priority_score" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              <Bar dataKey="final_priority_score" fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Defect</th>
              <th>Section</th>
              <th>Department</th>
              <th>Urgency</th>
              <th>Rule</th>
              <th>ML</th>
              <th>Final</th>
            </tr>
          </thead>
          <tbody>
            {topPriority.map((task, index) => (
              <tr key={task.defect_id}>
                <td>{index + 1}</td>
                <td>{task.defect_id}</td>
                <td>{task.section_id}</td>
                <td>{task.department}</td>
                <td><StatusBadge label={task.urgency_band} type={task.urgency_band?.startsWith('P1') ? 'P1' : task.urgency_band?.startsWith('P2') ? 'P2' : 'P3'} /></td>
                <td>{Number(task.rule_priority_score || 0).toFixed(1)}</td>
                <td>{Number(task.ml_priority_score || 0).toFixed(1)}</td>
                <td>{Number(task.final_priority_score || 0).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {queue.length > 0 ? (
        <div className="panel table-panel">
          <div className="panel-header">
            <h2>AI recommendation log</h2>
          </div>
          <div className="table-scroll-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Department</th>
                  <th>Issue</th>
                  <th>Priority score</th>
                  <th>Priority level</th>
                  <th>Preferred time</th>
                  <th>AI reason</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((request) => (
                  <tr key={`reason-${request.request_id}`}>
                    <td>{request.request_id}</td>
                    <td>{request.department}</td>
                    <td>{request.issue_type}</td>
                    <td>{Number(request.priority_score || 0).toFixed(1)}</td>
                    <td><StatusBadge label={request.priority_level || 'LOW'} type={getBadgeType(request.priority_level)} /></td>
                    <td>{formatDateTime(request.preferred_datetime)}</td>
                    <td>{request.ai_priority_reason || 'AI analysis queued.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AIPage;
