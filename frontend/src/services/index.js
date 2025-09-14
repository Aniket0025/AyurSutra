export { User } from './user';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    try {
      const token = localStorage.getItem('ayursutra_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

function normalizeId(x) {
  if (!x) return x;
  const id = x.id || x._id;
  return { id, ...x };
}

export const Hospital = {
  async list() {
    const data = await api('/api/hospitals');
    const arr = data?.hospitals || [];
    return arr.map((h) => normalizeId({
      ...h,
      created_date: h.createdAt,
      updated_date: h.updatedAt,
    }));
  },
  async get(id) {
    const data = await api(`/api/hospitals/${id}`);
    return normalizeId(data?.hospital);
  },
  async create(body) {
    const data = await api('/api/hospitals', { method: 'POST', body });
    return normalizeId(data?.hospital);
  },
  async update(id, body) {
    const data = await api(`/api/hospitals/${id}`, { method: 'PUT', body });
    return normalizeId(data?.hospital);
  },
  async delete(id) {
    await api(`/api/hospitals/${id}`, { method: 'DELETE' });
    return true;
  },
  async assignStaff(hospitalId, body) {
    const data = await api(`/api/hospitals/${hospitalId}/staff`, { method: 'POST', body });
    return normalizeId(data?.user || data);
  },
  async listStaff(hospitalId) {
    const data = await api(`/api/hospitals/${hospitalId}/staff`);
    return (data?.staff || []).map(normalizeId);
  },
  async removeStaff(hospitalId, userId) {
    await api(`/api/hospitals/${hospitalId}/staff/${userId}`, { method: 'DELETE' });
    return true;
  },
};

export const Patient = {
  async list() {
    const data = await api('/api/patients');
    return (data?.patients || []).map(normalizeId);
  },
  async filter(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients${qs ? `?${qs}` : ''}`);
    return (data?.patients || []).map(normalizeId);
  },
};

export const TherapySession = {
  async list() {
    const data = await api('/api/sessions');
    return (data?.sessions || []).map(normalizeId);
  },
  async filter(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/sessions${qs ? `?${qs}` : ''}`);
    return (data?.sessions || []).map(normalizeId);
  },
};

export const Appointments = {
  async book({ hospital_id, staff_id, type, start_time, end_time, notes }) {
    const data = await api('/api/appointments', { method: 'POST', body: { hospital_id, staff_id, type, start_time, end_time, notes } });
    return normalizeId(data?.appointment);
  },
  async mine() {
    const data = await api('/api/appointments/mine');
    return (data?.appointments || []).map(normalizeId);
  },
  async cancel(id) {
    const data = await api(`/api/appointments/${id}/cancel`, { method: 'POST' });
    return normalizeId(data?.appointment);
  },
  async reschedule(id, { start_time, end_time }) {
    const data = await api(`/api/appointments/${id}/reschedule`, { method: 'PATCH', body: { start_time, end_time } });
    return normalizeId(data?.appointment);
  },
};

// Stubs kept for compile-time imports that may exist elsewhere
export const Feedback = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };
export const Notification = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };
export const ConsultationLog = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };
