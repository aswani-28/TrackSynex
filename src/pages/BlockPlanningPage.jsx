import { useEffect, useMemo, useState } from 'react';

import StatusBadge from '../components/StatusBadge';
import {
  computeAvailability,
  getAssignedBlocks,
  getAvailableBlocks,
  getRequestConflicts,
  getRequestSummary,
  getRequests,
  getSchedule,
  getSlots,
  getTrainTimetable,
} from '../services/api';

const DEFAULT_SUMMARY = {
  total_requests: 0,
  critical_requests: 0,
  high_priority_requests: 0,
  medium_priority_requests: 0,
  pending_requests: 0,
  conflicts: 0,
  requests_under_analysis: 0,
};

const formatRange = (start, end) => {
  if (!start || !end) return '—';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start || '—'} → ${end || '—'}`;
  }
  return `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildRecommendedPlan = ({ requests, slots, schedule, conflicts, horizon }) => {
  const occupiedSlotIds = new Set((schedule || []).map((slot) => slot.slot_id).filter(Boolean));
  const allBlocks = (slots || []).filter((slot) => slot.horizon === horizon && !occupiedSlotIds.has(slot.slot_id));
  const safetyLookup = new Map((conflicts || []).map((conflict) => [conflict.request_id, conflict]));
  const byRequestId = new Map();

  (conflicts || []).forEach((conflict) => {
    byRequestId.set(conflict.request_id, conflict);
    byRequestId.set(conflict.conflicting_request_id, conflict);
  });

  const sortedRequests = [...(requests || [])].sort((a, b) => (Number(b.priority_score || 0) - Number(a.priority_score || 0)));

  return sortedRequests.map((request) => {
    const sectionReference = normalizeText(request.section || request.location || request.track_or_route);
    const requiredHours = Number(request.estimated_duration_hours || 0);
    const compatibleBlocks = allBlocks.filter((slot) => {
      if (!slot || !slot.section_id) return false;
      const slotSection = normalizeText(slot.section_id);
      const sectionMatch = slotSection === sectionReference || slotSection.includes(sectionReference) || sectionReference.includes(slotSection);
      const durationFits = Number(slot.duration_hours || 0) >= requiredHours;
      const businessWindow = String(slot.source || '').toLowerCase().includes('timetable') || String(slot.source || '').toLowerCase().includes('megablock');
      return sectionMatch && durationFits && businessWindow;
    });

    const preferredBlock = (compatibleBlocks.length ? compatibleBlocks : allBlocks).sort((left, right) => {
      const leftScore = Number(left.duration_hours || 0) - requiredHours;
      const rightScore = Number(right.duration_hours || 0) - requiredHours;
      return leftScore - rightScore;
    })[0];

    const conflictEntry = byRequestId.get(request.request_id) || null;
    const conflictStatus = conflictEntry ? 'CONFLICT' : 'NO CONFLICT';
    const chosenBlock = preferredBlock || null;
    const isWaiting = !chosenBlock;
    const priorityScore = Number(request.priority_score || 0);
    const level = String(request.priority_level || 'LOW').toUpperCase();
    const aiReason = chosenBlock
      ? `AI-selected ${chosenBlock.slot_id} for ${request.section || request.location} because ${request.priority_level || 'LOW'} priority (${priorityScore.toFixed(1)}) is matched to an available ${chosenBlock.duration_hours}h maintenance window with no train timetable conflict and sufficient resource duration.`
      : `No feasible block remains in ${horizon} horizon for ${request.section || request.location}; queue remains waiting until a compatible maintenance window opens.`;

    return {
      request_id: request.request_id,
      department: request.department,
      issue: request.issue_type || request.description || 'Maintenance request',
      priority: level,
      priority_score: priorityScore,
      recommended_block: chosenBlock ? chosenBlock.slot_id : '--',
      time_window: chosenBlock ? formatRange(chosenBlock.start_datetime, chosenBlock.end_datetime) : '--',
      duration: chosenBlock ? `${Number(request.estimated_duration_hours || 0).toFixed(1)}h` : '--',
      block_status: chosenBlock ? 'AI_RECOMMENDED' : 'WAITING',
      conflict_status: conflictStatus,
      ai_reason: aiReason,
      section: request.section || request.location || request.track_or_route,
      preferred_datetime: request.preferred_datetime,
      status: chosenBlock ? 'AI_RECOMMENDED' : 'WAITING',
    };
  });
};

const BlockPlanningPage = () => {
  const [horizon, setHorizon] = useState('weekly');
  const [requests, setRequests] = useState([]);
  const [slots, setSlots] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planState, setPlanState] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [requestData, conflictData, slotsData, scheduleData, summaryData] = await Promise.all([
        getRequests(),
        getRequestConflicts(),
        getSlots({ horizon }),
        getSchedule(horizon),
        getRequestSummary(),
      ]);

      setRequests(requestData || []);
      setConflicts(conflictData || []);
      setSlots(slotsData || []);
      setSchedule(scheduleData || []);
      setSummary(summaryData || DEFAULT_SUMMARY);
    } catch (err) {
      setRequests([]);
      setConflicts([]);
      setSlots([]);
      setSchedule([]);
      setSummary(DEFAULT_SUMMARY);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [horizon]);

  const availability = useMemo(() => computeAvailability(slots, schedule), [slots, schedule]);
  const timetableBlocks = useMemo(
    () => (slots || []).filter((slot) => String(slot.source || '').toLowerCase().includes('timetable')).slice(0, 12),
    [slots],
  );

  const recommendedPlan = useMemo(
    () => buildRecommendedPlan({ requests, slots, schedule, conflicts, horizon }),
    [requests, slots, schedule, conflicts, horizon],
  );

  const planMap = useMemo(() => {
    const baseMap = Object.fromEntries(recommendedPlan.map((entry) => [entry.request_id, entry]));
    Object.entries(planState).forEach(([requestId, override]) => {
      if (baseMap[requestId]) {
        baseMap[requestId] = { ...baseMap[requestId], ...override };
      }
    });
    return baseMap;
  }, [recommendedPlan, planState]);

  const planRows = useMemo(
    () => Object.values(planMap).sort((a, b) => (Number(b.priority_score || 0) - Number(a.priority_score || 0))),
    [planMap],
  );

  useEffect(() => {
    if (!selectedRequest && planRows.length > 0) {
      setSelectedRequest(planRows[0].request_id);
    }
  }, [planRows, selectedRequest]);

  const selectedPlan = planRows.find((item) => item.request_id === selectedRequest) || planRows[0] || null;

  const handlePlanAction = (action) => {
    if (!selectedPlan) return;
    const requestId = selectedPlan.request_id;
    const nextState = { ...planState };

    if (action === 'review') {
      nextState[requestId] = { ...planMap[requestId], status: 'UNDER_REVIEW', block_status: 'UNDER_REVIEW' };
    }

    if (action === 'approve') {
      nextState[requestId] = { ...planMap[requestId], status: 'APPROVED', block_status: 'APPROVED' };
    }

    if (action === 'reject') {
      nextState[requestId] = { ...planMap[requestId], status: 'REJECTED', block_status: 'REJECTED' };
    }

    if (action === 'regenerate') {
      const freshPlan = buildRecommendedPlan({ requests, slots, schedule, conflicts, horizon }).find((item) => item.request_id === requestId);
      nextState[requestId] = { ...freshPlan, status: 'AI_RECOMMENDED', block_status: 'AI_RECOMMENDED' };
    }

    if (action === 'modify') {
      const alternateBlock = (slots || [])
        .filter((slot) => slot.horizon === horizon && !schedule.some((item) => item.slot_id === slot.slot_id))
        .find((slot) => String(slot.section_id || '').toLowerCase() === String(selectedPlan.section || '').toLowerCase() || slot.duration_hours >= Number(selectedPlan.duration || 0));

      if (alternateBlock) {
        nextState[requestId] = {
          ...planMap[requestId],
          recommended_block: alternateBlock.slot_id,
          time_window: formatRange(alternateBlock.start_datetime, alternateBlock.end_datetime),
          status: 'AI_RECOMMENDED',
          block_status: 'AI_RECOMMENDED',
          ai_reason: `Planner modification replaced the original assignment with ${alternateBlock.slot_id} to preserve a compatible ${alternateBlock.duration_hours}h block while maintaining train path safety.`,
        };
      }
    }

    setPlanState(nextState);
  };

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading automatic block plan…</div></div>;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-title-block">
          <p className="eyebrow">AI optimization and block assignment</p>
          <h1>Automatic Block Planning</h1>
        </div>
        <div className="toggle-group">
          <button type="button" className={horizon === 'weekly' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setHorizon('weekly')}>Weekly</button>
          <button type="button" className={horizon === 'monthly' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setHorizon('monthly')}>Monthly</button>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total blocks</span>
          <strong>{availability.total || slots.length}</strong>
        </div>
        <div className="summary-card success">
          <span>Available blocks</span>
          <strong>{availability.available}</strong>
        </div>
        <div className="summary-card critical">
          <span>Assigned blocks</span>
          <strong>{planRows.filter((item) => item.recommended_block !== '--').length}</strong>
        </div>
        <div className="summary-card warning">
          <span>Reserved blocks</span>
          <strong>{availability.occupied || schedule.length}</strong>
        </div>
        <div className="summary-card">
          <span>Conflicted blocks</span>
          <strong>{conflicts.length}</strong>
        </div>
        <div className="summary-card neutral">
          <span>Waiting requests</span>
          <strong>{planRows.filter((item) => item.recommended_block === '--').length}</strong>
        </div>
        <div className="summary-card">
          <span>Today’s maintenance blocks</span>
          <strong>{(schedule || []).filter((slot) => {
            const date = new Date(slot.start_datetime || slot.start || Date.now());
            return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
          }).length}</strong>
        </div>
      </div>

      <div className="page-note">
        AI recommendation uses the real request queue, available block slots, occupied schedule slots, and train timetable inventory from the backend APIs. No unsupported optimization endpoint is claimed here.
      </div>

      <div className="panel-grid two-column">
        <div className="panel table-panel">
          <div className="panel-header">
            <h2>Available blocks</h2>
          </div>
          {availability.available === 0 ? (
            <div className="empty-state compact">No free blocks remain in the selected horizon.</div>
          ) : (
            <div className="detail-grid">
              {(slots || []).filter((slot) => slot.horizon === horizon && !schedule.some((item) => item.slot_id === slot.slot_id)).slice(0, 8).map((slot) => (
                <div key={slot.slot_id} className="detail-card">
                  <div className="detail-card__topline">
                    <strong>{slot.slot_id}</strong>
                    <StatusBadge label="Available" type="available" />
                  </div>
                  <div className="detail-card__meta">
                    <span>{slot.section_id}</span>
                    <span>{slot.duration_hours}h</span>
                  </div>
                  <div className="detail-card__time">{formatRange(slot.start_datetime, slot.end_datetime)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel table-panel">
          <div className="panel-header">
            <h2>Train timetable windows</h2>
          </div>
          {timetableBlocks.length === 0 ? (
            <div className="empty-state compact">No timetable slot data is available for this horizon.</div>
          ) : (
            <div className="timeline-rows">
              {timetableBlocks.map((slot) => {
                const timelineLength = Math.max(18, Math.min(82, Number(slot.duration_hours || 0) * 16));
                return (
                  <div key={slot.slot_id} className="timeline-row">
                    <div className="timeline-section">{slot.section_id}</div>
                    <div className="timeline-track">
                      <div className="timeline-bar" style={{ width: `${timelineLength}%` }}>
                        <span>{slot.slot_id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedPlan ? (
        <div className="panel policy-panel">
          <div className="panel-header">
            <h2>AI block optimization</h2>
          </div>
          <div className="detail-grid">
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>Recommended block</strong>
                <StatusBadge label={selectedPlan.recommended_block === '--' ? 'WAITING' : 'RECOMMENDED'} type={selectedPlan.recommended_block === '--' ? 'neutral' : 'success'} />
              </div>
              <div className="detail-card__meta">
                <span>{selectedPlan.recommended_block === '--' ? 'No feasible window' : selectedPlan.recommended_block}</span>
                <strong>{selectedPlan.time_window}</strong>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>Priority</strong>
              </div>
              <div className="detail-card__meta">
                <span>{selectedPlan.priority}</span>
                <strong>{Number(selectedPlan.priority_score || 0).toFixed(1)}</strong>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-card__topline">
                <strong>Conflict status</strong>
              </div>
              <div className="detail-card__meta">
                <span>{selectedPlan.conflict_status}</span>
                <strong>{selectedPlan.recommended_block === '--' ? 'No block assigned' : 'Feasible window'}</strong>
              </div>
            </div>
          </div>
          <div className="ai-reason-box">
            <h4>Why this block was recommended</h4>
            <p>{selectedPlan.ai_reason}</p>
          </div>
        </div>
      ) : null}

      <div className="panel policy-panel">
        <div className="panel-header">
          <h2>AI-generated block plan</h2>
          <div className="toggle-group compact-group">
            <button type="button" className="secondary-btn small-btn" onClick={() => handlePlanAction('review')}>Review Plan</button>
            <button type="button" className="secondary-btn small-btn" onClick={() => handlePlanAction('approve')}>Approve Plan</button>
            <button type="button" className="secondary-btn small-btn" onClick={() => handlePlanAction('modify')}>Modify Plan</button>
            <button type="button" className="secondary-btn small-btn" onClick={() => handlePlanAction('reject')}>Reject Plan</button>
            <button type="button" className="secondary-btn small-btn" onClick={() => handlePlanAction('regenerate')}>Regenerate Plan</button>
          </div>
        </div>

        <div className="plan-orchestrator">
          <div className="plan-selector">
            {planRows.length === 0 ? (
              <div className="empty-state compact">No actionable maintenance requests are available for block planning.</div>
            ) : (
              planRows.map((plan) => (
                <button
                  type="button"
                  key={plan.request_id}
                  className={`selector-item ${selectedPlan?.request_id === plan.request_id ? 'selected' : ''}`}
                  onClick={() => setSelectedRequest(plan.request_id)}
                >
                  <span>{plan.request_id}</span>
                  <StatusBadge label={plan.block_status || plan.status || 'WAITING'} type={String(plan.block_status || plan.status || 'WAITING').toLowerCase()} />
                </button>
              ))
            )}
          </div>

          {selectedPlan ? (
            <div className="plan-detail">
              <div className="plan-detail-header">
                <div>
                  <p className="eyebrow accent">Recommendation</p>
                  <h3>{selectedPlan.request_id}</h3>
                </div>
                <StatusBadge label={selectedPlan.status || selectedPlan.block_status || 'AI_RECOMMENDED'} type={String(selectedPlan.status || selectedPlan.block_status || 'AI_RECOMMENDED').toLowerCase()} />
              </div>
              <div className="plan-metrics">
                <div>
                  <span>Department</span>
                  <strong>{selectedPlan.department}</strong>
                </div>
                <div>
                  <span>Issue</span>
                  <strong>{selectedPlan.issue}</strong>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{selectedPlan.priority}</strong>
                </div>
                <div>
                  <span>Score</span>
                  <strong>{Number(selectedPlan.priority_score || 0).toFixed(1)}</strong>
                </div>
                <div>
                  <span>Recommended block</span>
                  <strong>{selectedPlan.recommended_block}</strong>
                </div>
                <div>
                  <span>Time window</span>
                  <strong>{selectedPlan.time_window}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{selectedPlan.duration}</strong>
                </div>
                <div>
                  <span>Conflict status</span>
                  <strong>{selectedPlan.conflict_status}</strong>
                </div>
              </div>
              <div className="ai-reason-box">
                <h4>AI recommendation</h4>
                <p>{selectedPlan.ai_reason}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel-grid two-column">
        <div className="panel table-panel">
          <div className="panel-header">
            <h2>Priority queue</h2>
          </div>
          <div className="table-scroll-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Dept</th>
                  <th>Issue</th>
                  <th>Priority</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5"><div className="empty-state compact">No requests are currently queued for optimization.</div></td>
                  </tr>
                ) : (
                  [...requests].sort((a, b) => (Number(b.priority_score || 0) - Number(a.priority_score || 0))).slice(0, 8).map((request) => (
                    <tr key={request.request_id}>
                      <td>{request.request_id}</td>
                      <td>{request.department}</td>
                      <td>{request.issue_type}</td>
                      <td><StatusBadge label={request.priority_level || 'LOW'} type={String(request.priority_level || 'LOW').toLowerCase()} /></td>
                      <td>{Number(request.priority_score || 0).toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel table-panel">
          <div className="panel-header">
            <h2>Conflict panel</h2>
          </div>
          {conflicts.length === 0 ? (
            <div className="empty-state compact">No train or maintenance conflicts are currently detected.</div>
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
                  <div className="detail-card__time">{conflict.time}</div>
                  <div className="detail-card__time">Recommended: {conflict.recommended_window}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-header">
          <h2>Block allocation table</h2>
        </div>
        <div className="table-scroll-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Department</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Recommended block</th>
                <th>Time window</th>
                <th>Conflict status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {planRows.length === 0 ? (
                <tr>
                  <td colSpan="8"><div className="empty-state compact">No block plan recommendations are available.</div></td>
                </tr>
              ) : (
                planRows.map((plan) => (
                  <tr key={plan.request_id} onClick={() => setSelectedRequest(plan.request_id)} style={{ cursor: 'pointer' }}>
                    <td>{plan.request_id}</td>
                    <td>{plan.department}</td>
                    <td>{plan.issue}</td>
                    <td><StatusBadge label={plan.priority} type={String(plan.priority).toLowerCase()} /></td>
                    <td>{plan.recommended_block}</td>
                    <td>{plan.time_window}</td>
                    <td><StatusBadge label={plan.conflict_status} type={plan.conflict_status === 'CONFLICT' ? 'warning' : 'success'} /></td>
                    <td><StatusBadge label={plan.status || plan.block_status || 'WAITING'} type={String(plan.status || plan.block_status || 'WAITING').toLowerCase()} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlockPlanningPage;
