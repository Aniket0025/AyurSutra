import { useEffect, useState } from 'react';
import { User, Hospital, Patient, Appointments } from '@/services';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function OfficeAppointments({ currentUser }) {
  const [me, setMe] = useState(currentUser);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: '', time: '', duration: 30, notes: '' });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ full_name: '', phone: '', gender: '', address: '' });
  const [creatingPatient, setCreatingPatient] = useState(false);

  useEffect(() => { (async () => { if (!me) setMe(await User.me().catch(()=>null)); })(); }, [me]);

  useEffect(() => {
    (async () => {
      const user = me || await User.me().catch(()=>null);
      if (!user?.hospital_id) { setPatients([]); setDoctors([]); return; }
      try {
        const [pts, staff] = await Promise.all([
          Patient.filter({ hospital_id: user.hospital_id }).catch(()=>[]),
          Hospital.listStaff(user.hospital_id).catch(()=>[]),
        ]);
        setPatients(pts || []);
        setDoctors((staff || []).filter(u => u.role === 'doctor'));
      } catch {
        setPatients([]); setDoctors([]);
      }
    })();
  }, [me]);

  const handleBook = async (e) => {
    e?.preventDefault?.();
    const user = me || await User.me().catch(()=>null);
    if (!user?.hospital_id) return window.showNotification?.({ type: 'error', title: 'Clinic missing', message: 'Your account is not linked to a clinic.' });
    if (!form.patientId || !form.doctorId || !form.date || !form.time) return window.showNotification?.({ type: 'error', title: 'Missing details', message: 'Select patient, doctor, date and time.' });
    try {
      setBusy(true);
      const start = new Date(`${form.date}T${form.time}:00`);
      const end = new Date(start.getTime() + (Number(form.duration) || 30) * 60000);
      await Appointments.book({
        hospital_id: user.hospital_id,
        staff_id: form.doctorId,
        type: 'doctor',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: form.notes || `Booked by ${user.full_name || 'staff'}`,
        patient_user_id: (patients.find(p=>String(p.id)===String(form.patientId))?.user_id) || undefined,
        patient_record_id: form.patientId,
      });
      window.showNotification?.({ type: 'success', title: 'Appointment booked', message: 'The appointment has been created.' });
      setForm({ patientId: '', doctorId: '', date: '', time: '', duration: 30, notes: '' });
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Booking failed', message: err?.message || 'Unable to create appointment' });
    } finally { setBusy(false); }
  };

  const handleCreatePatient = async (e) => {
    e?.preventDefault?.();
    if (!newPatient.full_name) return window.showNotification?.({ type: 'error', title: 'Name required', message: 'Please enter patient name.' });
    try {
      setCreatingPatient(true);
      const payload = {
        full_name: newPatient.full_name,
        phone: newPatient.phone,
        gender: newPatient.gender,
        address: newPatient.address,
        ...(form.doctorId ? { doctor_id: form.doctorId } : {}),
      };
      const created = await Patient.create(payload);
      window.showNotification?.({ type: 'success', title: 'Patient added', message: `Created ${created.full_name}` });
      // Refresh lists
      const user = me || await User.me().catch(()=>null);
      const pts = await Patient.filter(user?.hospital_id ? { hospital_id: user.hospital_id } : {});
      setPatients(pts);
      setForm(f => ({ ...f, patientId: created.id }));
      setShowAddPatient(false);
      setNewPatient({ full_name: '', phone: '', gender: '', address: '' });
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Create failed', message: err?.message || 'Unable to create patient' });
    } finally { setCreatingPatient(false); }
  };

  return (
    <div className="p-3 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
          <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-xs md:text-base">Book appointments for patients with specific doctors</p>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 md:p-6 shadow-xl border border-white/50">
        <div className="mb-3">
          <button type="button" onClick={()=>setShowAddPatient(v=>!v)} className="text-sm px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
            {showAddPatient ? 'Close Add Patient' : 'Add New Patient'}
          </button>
        </div>
        {showAddPatient && (
          <form onSubmit={handleCreatePatient} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 p-3 border rounded-xl bg-gray-50">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Full Name</label>
              <input type="text" value={newPatient.full_name} onChange={(e)=>setNewPatient(p=>({ ...p, full_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Phone</label>
              <input type="tel" value={newPatient.phone} onChange={(e)=>setNewPatient(p=>({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Gender</label>
              <select value={newPatient.gender} onChange={(e)=>setNewPatient(p=>({ ...p, gender: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Address</label>
              <input type="text" value={newPatient.address} onChange={(e)=>setNewPatient(p=>({ ...p, address: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <button type="submit" disabled={creatingPatient} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-50">
                {creatingPatient ? 'Creating...' : 'Create Patient'}
              </button>
            </div>
          </form>
        )}

        <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Patient</label>
            <select value={form.patientId} onChange={(e)=>setForm(f=>({ ...f, patientId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select patient</option>
              {patients.map(p => (<option key={p.id} value={p.id}>{p.full_name || p.name}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Doctor</label>
            <select value={form.doctorId} onChange={(e)=>setForm(f=>({ ...f, doctorId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select doctor</option>
              {doctors.map(d => (<option key={d.id} value={d.id}>{d.full_name || d.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e)=>setForm(f=>({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Time</label>
            <input type="time" value={form.time} onChange={(e)=>setForm(f=>({ ...f, time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
            <input type="number" min="10" step="5" value={form.duration} onChange={(e)=>setForm(f=>({ ...f, duration: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="md:col-span-6">
            <label className="block text-xs text-gray-600 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e)=>setForm(f=>({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Optional notes" />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white disabled:opacity-50">{busy ? 'Booking...' : 'Book Appointment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
