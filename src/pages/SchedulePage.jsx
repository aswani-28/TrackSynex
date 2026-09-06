import { useEffect, useMemo, useState } from 'react';

import StatusBadge from '../components/StatusBadge';
import { computeAvailability, getSchedule, getSlots } from '../services/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDuration = (hours) => {
  if (!hours && hours !== 0) return '—';
  const totalMinutes = Number(hours) * 60;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const SchedulePage = () => {
  const [horizon, setHorizon] = useState('weekly');
  const [slots, setSlots] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [slotsData, scheduleData] = await Promise.all([
        getSlots({ horizon }),
        getSchedule(horizon),
      ]);
      setSlots(slotsData || []);
      setSchedule(scheduleData || []);
    } catch (err) {
      setError(err.message || 'Unable to load schedule data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [horizon]);

  const availability = useMemo(() => computeAvailability(slots, schedule), [slots, schedule]);

  const occupiedSchedule = useMemo(
    () =>
      (schedule || []).map((item) => ({
        ...item,
        sectionName: item.section_name || item.section_id || 'Section',
        status: item.assigned_defect_count ? 'Occupied' : 'Planned',
      })),
    [schedule],
  );

  if (loading) {
    return <div className="page-shell"><div className="panel loading-panel">Loading schedule…</div></div>;
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
          <p className="eyebrow">Timetable and availability</p>
          <h1>Train Schedule</h1>
        </div>
        <div className="toggle-group">
          <button type="button" className={horizon === 'weekly' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setHorizon('weekly')}>Weekly</button>
          <button type="button" className={horizon === 'monthly' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setHorizon('monthly')}>Monthly</button>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Available slots</span>
          <strong>{availability.available}</strong>
        </div>
        <div className="summary-card">
          <span>Occupied slots</span>
          <strong>{availability.occupied}</strong>
        </div>
        <div className="summary-card success">
          <span>Inventory</span>
          <strong>{availability.total}</strong>
        </div>
        <div className="summary-card warning">
          <span>Utilization</span>
          <strong>{availability.utilization.toFixed(1)}%</strong>
        </div>
      </div>

      <div className="page-note">
        Schedule data represents occupied slots only. Available capacity is derived from the full slot inventory minus occupied slot IDs.
      </div>

      <div className="panel table-panel schedule-overview-panel">
        <div className="panel-header">
          <h2>{horizon} occupation overview</h2>
          <StatusBadge label="Occupied slots only" type="neutral" />
        </div>

        <div className="schedule-card-grid">
          {occupiedSchedule.length ? (
            occupiedSchedule.slice(0, 6).map((item) => (
              <article key={item.slot_id} className="schedule-card">
                <div className="schedule-card__header">
                  <div>
                    <div className="schedule-card__label">Slot</div>
                    <strong>{item.slot_id}</strong>
                  </div>
                  <StatusBadge label={item.status} type={item.assigned_defect_count ? 'occupied' : 'available'} />
                </div>

                <div className="schedule-card__meta">
                  <div>
                    <span>Section</span>
                    <strong>{item.sectionName}</strong>
                  </div>
                  <div>
                    <span>Density</span>
                    <strong>{item.traffic_density || '—'}</strong>
                  </div>
                </div>

                <div className="schedule-card__timeline">
                  <div>
                    <span>Start</span>
                    <strong>{formatDateTime(item.start_datetime)}</strong>
                  </div>
                  <div>
                    <span>End</span>
                    <strong>{formatDateTime(item.end_datetime)}</strong>
                  </div>
                </div>

                <div className="schedule-card__detail-row">
                  <span>Duration</span>
                  <strong>{formatDuration(item.duration_hours)}</strong>
                </div>

                <div className="schedule-card__detail-row">
                  <span>Assigned defects</span>
                  <strong>{item.assigned_defect_count || 0}</strong>
                </div>

                {item.bundle_type ? (
                  <div className="schedule-card__detail-row">
                    <span>Bundle</span>
                    <strong>{item.bundle_type}</strong>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="empty-state compact">
            <h3>No Schedule Data Available</h3>
              <p>No schedule data was returned for this horizon.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-header"><h2>{horizon} schedule inventory</h2></div>
        <div className="table-scroll-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Slot ID</th>
                <th>Section</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Assigned defects</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const occupied = schedule.some((item) => item.slot_id === slot.slot_id);
                const matched = schedule.find((item) => item.slot_id === slot.slot_id) || {};
                return (
                  <tr key={slot.slot_id}>
                    <td className="row-label">{slot.slot_id}</td>
                    <td>{slot.section_name || slot.section_id || '—'}</td>
                    <td>{formatDateTime(slot.start_datetime)}</td>
                    <td>{formatDateTime(slot.end_datetime)}</td>
                    <td>{formatDuration(slot.duration_hours)}</td>
                    <td>{matched.assigned_defect_count || 0}</td>
                    <td>{slot.source || matched.slot_source || '—'}</td>
                    <td><StatusBadge label={occupied ? 'Occupied' : 'Available'} type={occupied ? 'occupied' : 'available'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
