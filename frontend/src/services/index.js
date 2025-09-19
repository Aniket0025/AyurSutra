export { User } from './user';

// Determine API base URL with a safe runtime fallback.
// In production on Vercel, we prefer same-origin '/api' (empty base) and use vercel.json rewrites.
let API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
try {
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  // If not on localhost but API_BASE is empty or points to localhost, fall back to same-origin
  if (!isLocalhost) {
    if (!API_BASE || /localhost:\d+/.test(String(API_BASE))) {
      API_BASE = '';
    }
  }
} catch {}

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

// Helper to transform backend patient -> UI shape expected by pages/components
function mapPatientForUI(p) {
  const id = p.id || p._id;
  // Derive a display patient_id as a short token for UI if not present
  const patient_id = p.patient_id || (id ? String(id).slice(-6).toUpperCase() : undefined);
  // Derive age from dob if available
  let age = p.age;
  if (!age && p.dob) {
    try {
      const dob = new Date(p.dob);
      const diff = Date.now() - dob.getTime();
      age = Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
    } catch {}
  }
  return {
    ...p,
    id,
    patient_id,
    full_name: p.full_name || p.name,
    age,
    address: p.address,
    email: p.email,
    phone: p.phone,
    gender: p.gender,
    medical_history: p.medical_history,
    // Fields used by UI but stored under metadata on backend
    current_conditions: Array.isArray(p.current_conditions)
      ? p.current_conditions
      : Array.isArray(p.metadata?.current_conditions) ? p.metadata.current_conditions : [],
    allergies: Array.isArray(p.allergies)
      ? p.allergies
      : Array.isArray(p.metadata?.allergies) ? p.metadata.allergies : [],
    assigned_doctor: p.assigned_doctor || p.metadata?.assigned_doctor || '',
    progress_score: typeof p.progress_score === 'number'
      ? p.progress_score
      : (typeof p.metadata?.progress_score === 'number' ? p.metadata.progress_score : 0),
    guardian_ids: Array.isArray(p.guardian_ids)
      ? p.guardian_ids
      : (Array.isArray(p.metadata?.guardian_ids) ? p.metadata.guardian_ids : []),
  };
}

export const Patient = {
  async list() {
    const data = await api('/api/patients');
    return (data?.patients || []).map(normalizeId).map(mapPatientForUI);
  },
  async withRecords(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients/with-records${qs ? `?${qs}` : ''}`);
    const arr = Array.isArray(data?.patients) ? data.patients : [];
    // Each item is { patient, appointment_count, last_appointment }
    return arr.map((row) => {
      const p = mapPatientForUI(normalizeId(row.patient || {}));
      return {
        ...p,
        appointment_count: row.appointment_count || 0,
        last_appointment: row.last_appointment || null,
      };
    });
  },
  async filter(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients${qs ? `?${qs}` : ''}`);
    return (data?.patients || []).map(normalizeId).map(mapPatientForUI);
  },
  async get(id) {
    const data = await api(`/api/patients/${id}`);
    const p = normalizeId(data?.patient || {});
    return mapPatientForUI(p);
  },
  async create(body) {
    // Map UI fields to backend payload
    const payload = {
      name: body.full_name || body.name,
      email: body.email,
      phone: body.phone,
      dob: body.dob,
      gender: body.gender,
      address: body.address,
      medical_history: body.medical_history || body.medicalHistory,
      // Persist UI-only fields inside metadata
      metadata: {
        ...(body.metadata || {}),
        current_conditions: Array.isArray(body.current_conditions)
          ? body.current_conditions
          : (typeof body.currentConditions === 'string' ? body.currentConditions.split(',').map(s=>s.trim()).filter(Boolean) : (body.currentConditions || [])),
        allergies: Array.isArray(body.allergies)
          ? body.allergies
          : (typeof body.allergies === 'string' ? body.allergies.split(',').map(s=>s.trim()).filter(Boolean) : []),
        assigned_doctor: body.assigned_doctor || body.assignedDoctor || '',
        progress_score: typeof body.progress_score === 'number' ? body.progress_score : (Number(body.progressScore) || 0),
        guardian_ids: Array.isArray(body.guardian_ids) ? body.guardian_ids : (body.guardianId ? [body.guardianId] : []),
      },
      // Any additional UI-only fields will be ignored by backend schema
    };
    const data = await api('/api/patients', { method: 'POST', body: payload });
    return mapPatientForUI(normalizeId(data?.patient || {}));
  },
  async update(id, body) {
    const payload = {
      name: body.full_name || body.name,
      email: body.email,
      phone: body.phone,
      dob: body.dob,
      gender: body.gender,
      address: body.address,
      medical_history: body.medical_history || body.medicalHistory,
      metadata: {
        ...(body.metadata || {}),
        current_conditions: Array.isArray(body.current_conditions)
          ? body.current_conditions
          : (typeof body.currentConditions === 'string' ? body.currentConditions.split(',').map(s=>s.trim()).filter(Boolean) : (body.currentConditions || [])),
        allergies: Array.isArray(body.allergies)
          ? body.allergies
          : (typeof body.allergies === 'string' ? body.allergies.split(',').map(s=>s.trim()).filter(Boolean) : []),
        assigned_doctor: body.assigned_doctor || body.assignedDoctor || '',
        progress_score: typeof body.progress_score === 'number' ? body.progress_score : (Number(body.progressScore) || 0),
        guardian_ids: Array.isArray(body.guardian_ids) ? body.guardian_ids : (body.guardianId ? [body.guardianId] : []),
      },
    };
    const data = await api(`/api/patients/${id}`, { method: 'PUT', body: payload });
    return mapPatientForUI(normalizeId(data?.patient || {}));
  },
  async delete(id) {
    await api(`/api/patients/${id}`, { method: 'DELETE' });
    return true;
  },
  async syncFromAppointments(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients/sync-from-appointments${qs ? `?${qs}` : ''}`, { method: 'POST' });
    return data;
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
  async confirm(id) {
    const data = await api(`/api/appointments/${id}/confirm`, { method: 'POST' });
    return normalizeId(data?.appointment);
  },
  async complete(id) {
    const data = await api(`/api/appointments/${id}/complete`, { method: 'POST' });
    return normalizeId(data?.appointment);
  },
  async mineForStaff() {
    const data = await api('/api/appointments/staff/mine');
    return (data?.appointments || []).map(normalizeId);
  },
};

// Stubs kept for compile-time imports that may exist elsewhere
export const Feedback = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };
export const Notification = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };
export const ConsultationLog = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };
