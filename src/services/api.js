const defaultBase = '/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultBase;

const buildUrl = (path, params = {}) => {
  const target = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const url = new URL(target, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const apiFetch = async (path, params = {}, options = {}) => {
  const response = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const errorPayload = await response.json();
      if (errorPayload && typeof errorPayload === 'object') {
        if (Array.isArray(errorPayload.detail)) {
          message = errorPayload.detail.map((item) => item.msg || item).join(', ');
        } else if (errorPayload.detail) {
          message = errorPayload.detail;
        } else if (errorPayload.message) {
          message = errorPayload.message;
        }
      }
    } catch {
      // Ignore invalid JSON and fall back to the HTTP status message.
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

export const getHealth = () => apiFetch('/health');

export const getDefects = ({ urgency, limit } = {}) =>
  apiFetch('/defects', {
    urgency: urgency || undefined,
    limit: limit || undefined,
  });

export const getSlots = ({ horizon } = {}) =>
  apiFetch('/slots', {
    horizon: horizon || undefined,
  });

export const getSchedule = (horizon) => apiFetch(`/schedules/${horizon}`);

export const getAvailableBlocks = ({ horizon } = {}) => getSlots({ horizon });

export const getTrainTimetable = ({ horizon } = {}) =>
  getSlots({ horizon }).then((slots) =>
    (Array.isArray(slots) ? slots.filter((slot) => {
      const source = String(slot.source || '').toLowerCase();
      return source.includes('timetable') || source.includes('train');
    }) : []),
  );

export const getAssignedBlocks = ({ horizon } = {}) => getSchedule(horizon || 'weekly');

export const getUnscheduled = (horizon) => apiFetch(`/unscheduled/${horizon}`);

export const getClassifications = (horizon) => apiFetch(`/classifications/${horizon}`);

export const getComparison = () => apiFetch('/comparison');

export const getAIRecommendations = async ({ horizon = 'weekly' } = {}) => {
  const [requests, blocks, assigned, conflicts] = await Promise.all([
    getRequests(),
    getAvailableBlocks({ horizon }),
    getAssignedBlocks({ horizon }),
    getRequestConflicts(),
  ]);

  return {
    requests: requests || [],
    blocks: blocks || [],
    assignedBlocks: assigned || [],
    conflicts: conflicts || [],
  };
};

export const createRequest = (payload) =>
  fetch(buildUrl('/requests'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const errorPayload = await response.json();
        if (errorPayload && errorPayload.detail) {
          message = Array.isArray(errorPayload.detail) ? errorPayload.detail.map((item) => item.msg || item).join(', ') : errorPayload.detail;
        }
      } catch {
        // Ignore invalid JSON fallback.
      }
      throw new Error(message);
    }
    return response.json();
  });

export const getRequests = () => apiFetch('/requests');

export const getRequestSummary = () => apiFetch('/requests/summary');

export const getRequestConflicts = () => apiFetch('/requests/conflicts');

export const recalculatePriority = (requestId) =>
  fetch(buildUrl(`/requests/${requestId}/recalculate-priority`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  }).then(async (response) => {
    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const errorPayload = await response.json();
        if (errorPayload && errorPayload.detail) {
          message = Array.isArray(errorPayload.detail) ? errorPayload.detail.map((item) => item.msg || item).join(', ') : errorPayload.detail;
        }
      } catch {
        // Ignore invalid JSON fallback.
      }
      throw new Error(message);
    }
    return response.json();
  });

export const getRequestStatus = (requestId) => apiFetch(`/requests/${requestId}/status`);

export const computeAvailability = (inventory = [], scheduled = []) => {
  const occupiedIds = new Set((scheduled || []).map((item) => item.slot_id).filter(Boolean));
  const available = (inventory || []).filter((slot) => !occupiedIds.has(slot.slot_id));

  return {
    total: inventory.length,
    occupied: scheduled.length,
    available: available.length,
    utilization: inventory.length ? (scheduled.length / inventory.length) * 100 : 0,
    availableSlots: available,
    occupiedSlotIds: occupiedIds,
  };
};

export default {
  getHealth,
  getDefects,
  getSlots,
  getAvailableBlocks,
  getTrainTimetable,
  getSchedule,
  getAssignedBlocks,
  getUnscheduled,
  getClassifications,
  getComparison,
  getAIRecommendations,
  createRequest,
  getRequests,
  getRequestSummary,
  getRequestConflicts,
  recalculatePriority,
  getRequestStatus,
  computeAvailability,
};
