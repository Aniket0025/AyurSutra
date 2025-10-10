import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardPlus, Download, FileText, Printer, Search, Trash2 } from 'lucide-react';
import { User, Patient } from '@/services';

// local persistence helpers
const STORAGE_KEY = 'ayursutra_prescriptions_v1';
function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveAll(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export default function PrescriptionRecords() {
  const [me, setMe] = useState(null);
  const [role, setRole] = useState('guest');
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [loading, setLoading] = useState(false);

  // form state (includes Panchakarma-specific fields)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    complaints: '',
    advice: '',
    meds: [ { name: '', dosage: '', frequency: '', duration: '' } ],
    pk_plan: {
      procedures: '', // e.g., Abhyanga, Swedana
      oils: '',       // e.g., Dashmool Taila
      basti: '',      // e.g., Niruha/Anuvasan
      diet: '',       // Pathya-Apathya
    },
    clinical: {
      vitals: { bp: '', pulse: '', temp: '', spo2: '' },
      diagnosis: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      follow_up: '', // date
      consent: false,
    }
  });

  // fetch current user and patient list (if doctor/admin)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const u = await User.me();
        setMe(u || null);
        const r = u?.role || 'guest';
        setRole(r);
        if (r === 'patient') {
          setSelectedPatientId(u?.id || u?._id || '');
          setSelectedPatientName(u?.full_name || u?.name || 'You');
        } else {
          // Pull from real DB using Patient service, then prefer doctor-assigned subset
          let pts = [];
          try {
            if (Patient && typeof Patient.list === 'function') {
              pts = await Patient.list();
            }
          } catch (e) { console.warn('PrescriptionRecords: Patient.list failed', e); }
          const myId = u?.id || u?._id;
          const hospId = u?.hospital_id;
          const filtered = (pts || []).filter(p => (!hospId || p.hospital_id === hospId) && (!myId || p.assigned_doctor_id === myId || p.assigned_doctor === (u?.full_name || u?.name)));
          const pool = filtered.length ? filtered : pts;
          const mapped = (pool || []).map(p => ({ id: p.id || p._id, name: p.full_name || p.name || 'Patient', email: p.email }));
          setPatientOptions(mapped);
          // If only one patient, auto-select
          if (mapped.length === 1) { setSelectedPatientId(mapped[0].id); setSelectedPatientName(mapped[0].name); }
        }
      } finally { setLoading(false); }
    })();
  }, []);

  // Auto-select when search narrows to a single option
  useEffect(() => {
    if (!patientSearch) return;
    const q = patientSearch.trim().toLowerCase();
    const filtered = patientOptions.filter(p => (p.name||'').toLowerCase().includes(q) || String(p.id||'').toLowerCase().includes(q));
    if (filtered.length === 1) {
      const only = filtered[0];
      if (only.id !== selectedPatientId) {
        setSelectedPatientId(only.id);
        setSelectedPatientName(only.name);
      }
    }
  }, [patientSearch, patientOptions, selectedPatientId]);

  // Debounced server-side search using Patient.filter
  useEffect(() => {
    let t;
    const run = async () => {
      const q = patientSearch.trim();
      if (!q) return; // keep current options
      try {
        if (Patient && typeof Patient.filter === 'function') {
          const res = await Patient.filter({ name: q });
          // Prefer doctor-assigned
          const myId = me?.id || me?._id;
          const hospId = me?.hospital_id;
          const preferred = (res || []).filter(p => (!hospId || p.hospital_id === hospId) && (p.assigned_doctor_id === myId || p.assigned_doctor === (me?.full_name || me?.name)));
          const pool = preferred.length ? preferred : res;
          const mapped = (pool || []).map(p => ({ id: p.id || p._id, name: p.full_name || p.name || 'Patient', email: p.email }));
          setPatientOptions(mapped);
        }
      } catch (e) { console.warn('PrescriptionRecords: Patient.filter failed', e); }
    };
    t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const all = loadAll();
  const scoped = useMemo(() => {
    return all.filter(p => (!me?.hospital_id || p.hospital_id === me.hospital_id) && (!selectedPatientId || p.patient_id === selectedPatientId));
  }, [all, me?.hospital_id, selectedPatientId]);

  const canWrite = role === 'doctor' || role === 'clinic_admin' || role === 'super_admin';

  const addMedRow = () => setForm(f => ({ ...f, meds: [...f.meds, { name: '', dosage: '', frequency: '', duration: '' }] }));
  const removeMedRow = (i) => setForm(f => ({ ...f, meds: f.meds.filter((_, idx) => idx !== i) }));
  const updateMed = (i, key, val) => setForm(f => ({ ...f, meds: f.meds.map((m, idx) => idx===i? { ...m, [key]: val } : m) }));

  const handleSave = () => {
    if (!selectedPatientId) { window.showNotification?.({ type: 'error', title: 'Prescription', message: 'Select a patient first.' }); return; }
    const entry = {
      id: crypto.randomUUID(),
      hospital_id: me?.hospital_id,
      patient_id: selectedPatientId,
      patient_name: selectedPatientName,
      doctor_id: me?.id || me?._id,
      doctor_name: me?.full_name || me?.name,
      created_at: new Date().toISOString(),
      ...form,
    };
    const items = loadAll();
    items.unshift(entry);
    saveAll(items);
    window.showNotification?.({ type: 'success', title: 'Prescription', message: 'Saved successfully.' });
    // reset minimal
    setForm({ date: new Date().toISOString().slice(0,10), complaints: '', advice: '', meds: [ { name: '', dosage: '', frequency: '', duration: '' } ] });
  };

  const deleteEntry = (id) => {
    const items = loadAll().filter(p => p.id !== id);
    saveAll(items);
    window.showNotification?.({ type: 'success', title: 'Prescription', message: 'Deleted.' });
  };

  const printEntry = (entry) => {
    const doc = window.open('', '_blank');
    if (!doc) return;
    doc.document.write(`<!doctype html><html><head><title>Prescription</title><style>
      body{font-family:Inter,system-ui,sans-serif;padding:24px}
      h1{font-size:20px;margin:0 0 8px}
      .muted{color:#6b7280}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    </style></head><body>`);
    doc.document.write(`<h1>Prescription</h1>
      <div class="muted">${new Date(entry.date || entry.created_at).toLocaleString()}</div>
      <div><strong>Patient:</strong> ${entry.patient_name || entry.patient_id}</div>
      <div><strong>Doctor:</strong> ${entry.doctor_name || ''}</div>
      <hr/>
      <div><strong>Complaints:</strong><br/>${(entry.complaints||'').replace(/\n/g,'<br/>')}</div>
      <div style="margin-top:8px"><strong>Advice:</strong><br/>${(entry.advice||'').replace(/\n/g,'<br/>')}</div>
      <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${(entry.meds||[]).map(m=>`<tr><td>${m.name||''}</td><td>${m.dosage||''}</td><td>${m.frequency||''}</td><td>${m.duration||''}</td></tr>`).join('')}</tbody></table>`);
    doc.document.write('</body></html>');
    doc.document.close();
    doc.focus();
    doc.print();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Prescription & Records</h1>
            <p className="text-gray-500 text-sm">Create and view patient prescriptions. Patients can see their own prescriptions only.</p>
          </div>
        </div>
        <Link to="/DoctorDashboard" className="hidden md:inline-flex text-sm px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Back to Dashboard</Link>
      </div>

      {/* Patient scope */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        {role === 'patient' ? (
          <div className="text-sm text-gray-600">Viewing your records{selectedPatientName?` for ${selectedPatientName}`:''}.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  className="w-full pl-10 pr-4 py-2 border rounded-xl"
                  value={patientSearch}
                  onChange={(e)=>setPatientSearch(e.target.value)}
                  placeholder="Search patient by name or ID"
                />
              </div>
              <select
                className="mt-2 w-full px-3 py-2 border rounded-xl bg-white"
                value={selectedPatientId}
                onChange={(e)=>{
                  const id = e.target.value; setSelectedPatientId(id);
                  const obj = patientOptions.find(p=>String(p.id)===String(id)); setSelectedPatientName(obj?.name||'');
                }}
              >
                <option value="">Select patient...</option>
                {patientOptions
                  .filter(p=>{
                    const q = patientSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (p.name||'').toLowerCase().includes(q) || String(p.id||'').toLowerCase().includes(q);
                  })
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {String(p.id).slice(-6)}</option>
                  ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">{selectedPatientId?`Selected: ${selectedPatientName}`:'No patient selected'}</div>
          </div>
        )}
      </div>

      {/* Create form (doctors/admins only) */}
      {canWrite && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><ClipboardPlus className="w-4 h-4 text-indigo-600"/> New Prescription</h2>
            <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white disabled:opacity-50" disabled={!selectedPatientId} onClick={handleSave}>Save</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500">Complaints</label>
              <input className="w-full px-3 py-2 border rounded-lg" value={form.complaints} onChange={e=>setForm(f=>({...f, complaints:e.target.value}))} placeholder="e.g., lower back pain, headache" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500">Medicines</label>
            <div className="space-y-2">
              {form.meds.map((m,i)=> (
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <input className="px-3 py-2 border rounded-lg" placeholder="Medicine" value={m.name} onChange={e=>updateMed(i,'name',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Dosage" value={m.dosage} onChange={e=>updateMed(i,'dosage',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Frequency" value={m.frequency} onChange={e=>updateMed(i,'frequency',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Duration" value={m.duration} onChange={e=>updateMed(i,'duration',e.target.value)} />
                  <button className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={()=>removeMedRow(i)}><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              <button className="px-3 py-1.5 rounded-md border" onClick={addMedRow}>+ Add medicine</button>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500">Advice / Notes</label>
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" value={form.advice} onChange={e=>setForm(f=>({...f, advice:e.target.value}))} />
          </div>
        </div>
      )}

      {/* Records list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Records</h2>
          <div className="text-sm text-gray-500">{scoped.length} total</div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : scoped.length === 0 ? (
          <div className="text-sm text-gray-500">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Doctor</th>
                  <th className="py-2 pr-4">Complaints</th>
                  <th className="py-2 pr-4">Medicines</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scoped.map((p)=> (
                  <tr key={p.id}>
                    <td className="py-2 pr-4">{new Date(p.date || p.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{p.patient_name || p.patient_id}</td>
                    <td className="py-2 pr-4">{p.doctor_name || '-'}</td>
                    <td className="py-2 pr-4">{p.complaints || '-'}</td>
                    <td className="py-2 pr-4">{(p.meds||[]).map(m=>m.name).filter(Boolean).join(', ')}</td>
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <button className="px-2 py-1 rounded-md border" onClick={()=>printEntry(p)} title="Print"><Printer className="w-4 h-4"/></button>
                      <button className="px-2 py-1 rounded-md border" onClick={()=>printEntry(p)} title="Download"><Download className="w-4 h-4"/></button>
                      {canWrite && <button className="px-2 py-1 rounded-md border" onClick={()=>deleteEntry(p.id)} title="Delete"><Trash2 className="w-4 h-4"/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
