import React, { useState, useEffect } from "react";
import { Hospital } from "@/services";
import { User } from "@/services";
import { Patient } from "@/services";
import { TherapySession } from "@/services";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  Calendar,
  Activity,
  TrendingUp,
  Star,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Globe
} from "lucide-react";
import { format } from "date-fns";

export default function HospitalsPage({ currentUser }) {
  const [effectiveUser, setEffectiveUser] = useState(currentUser);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalStats, setHospitalStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Ensure we have a user even if not passed as prop (Routes children don't get cloneElement props)
  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      (async () => {
        try {
          const me = await User.me();
          if (mounted) setEffectiveUser(me);
        } catch {
          if (mounted) setEffectiveUser(null);
        }
      })();
    } else {
      setEffectiveUser(currentUser);
    }
    return () => { mounted = false; };
  }, [currentUser]);

  useEffect(() => {
    if (effectiveUser?.role === 'super_admin' || effectiveUser?.role === 'admin' || effectiveUser?.role === 'hospital_admin') {
      loadHospitals();
    }
  }, [effectiveUser?.role]);

  const loadHospitals = async () => {
    setIsLoading(true);
    try {
      const hospitalsData = await Hospital.list('-created_date', 100);
      setHospitals(hospitalsData);

      // Load stats for each hospital
      const statsPromises = hospitalsData.map(async (hospital) => {
        try {
          const [patients, sessions] = await Promise.all([
            Patient.filter({ hospital_id: hospital.id }).catch(() => []),
            TherapySession.filter({ hospital_id: hospital.id }).catch(() => [])
          ]);

          const todaySessions = sessions.filter(s => {
            try {
              return format(new Date(s.scheduled_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            } catch {
              return false;
            }
          });

          const completedSessions = sessions.filter(s => s.status === 'completed');

          return {
            hospitalId: hospital.id,
            totalPatients: patients.length,
            totalSessions: sessions.length,
            todaySessions: todaySessions.length,
            completedSessions: completedSessions.length,
            completionRate: sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0
          };
        } catch (error) {
          return {
            hospitalId: hospital.id,
            totalPatients: 0,
            totalSessions: 0,
            todaySessions: 0,
            completedSessions: 0,
            completionRate: 0
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat.hospitalId] = stat;
      });
      setHospitalStats(statsMap);

    } catch (error) {
      console.error("Error loading hospitals:", error);
    }
    setIsLoading(false);
  };

  const handleAddHospital = async (hospitalData) => {
    try {
      await Hospital.create(hospitalData);
      loadHospitals();
      setShowAddModal(false);
      window.showNotification?.({
        type: 'success',
        title: 'Hospital Added',
        message: `${hospitalData.name} has been successfully added to the platform.`,
        autoClose: true
      });
    } catch (error) {
      console.error("Error adding hospital:", error);
      window.showNotification?.({
        type: 'error',
        title: 'Error',
        message: 'Failed to add hospital. Please try again.',
        autoClose: true
      });
    }
  };

  const handleDeleteHospital = async (hospitalId, hospitalName, opts = {}) => {
    const { skipConfirm = false } = opts;
    if (!skipConfirm) {
      const ok = window.confirm(`Are you sure you want to delete ${hospitalName}? This action cannot be undone.`);
      if (!ok) return;
    }
    try {
      await Hospital.delete(hospitalId);
      // Reload list from server to avoid any stale state
      await loadHospitals();
      window.showNotification?.({
        type: 'success',
        title: 'Hospital Deleted',
        message: `${hospitalName} has been removed from the platform.`,
        autoClose: true
      });
    } catch (error) {
      console.error('Error deleting hospital:', error);
      window.showNotification?.({
        type: 'error',
        title: 'Delete failed',
        message: error?.details?.message || error?.message || 'Failed to delete hospital. Please try again.',
        autoClose: true
      });
      throw error;
    }
  };

  const filteredHospitals = hospitals.filter(hospital => {
    const matchesSearch = hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hospital.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || hospital.subscription_plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const HospitalCard = ({ hospital }) => {
    const stats = hospitalStats[hospital.id] || {};
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
      >
        {/* Hospital Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {hospital.logo_url ? (
              <img
                src={hospital.logo_url}
                alt={hospital.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{hospital.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{hospital.address || 'Address not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  hospital.subscription_plan === 'enterprise' 
                    ? 'bg-purple-100 text-purple-700'
                    : hospital.subscription_plan === 'premium'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {hospital.subscription_plan?.toUpperCase() || 'BASIC'}
                </span>
                {hospital.established_year && (
                  <span className="text-xs text-gray-500">Est. {hospital.established_year}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setSelectedHospital(hospital);
                setShowDetailsModal(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteHospital(hospital.id, hospital.name)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hospital Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-lg font-bold text-blue-600">{stats.totalPatients || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Patients</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-lg font-bold text-green-600">{stats.todaySessions || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-lg font-bold text-purple-600">{stats.totalSessions || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Sessions</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
              <span className="text-lg font-bold text-orange-600">{stats.completionRate || 0}%</span>
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>

        {/* Hospital Contact Info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{hospital.email || '—'}</span>
          </div>
          <div className="text-xs">
            Added {hospital.created_date ? format(new Date(hospital.created_date), 'MMM dd, yyyy') : 'Recently'}
          </div>
        </div>
      </motion.div>
    );
  };

  if (effectiveUser === undefined) {
    return (
      <div className="p-8 text-center text-gray-500">Loading...</div>
    );
  }
  if (!effectiveUser || !['super_admin','admin','hospital_admin'].includes(effectiveUser.role)) {
    return (
      <div className="p-8 text-center">
        <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-500 mb-2">Access Denied</h2>
        <p className="text-gray-400">Only Admins can manage hospitals.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <Building className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Management</h1>
            <p className="text-gray-500">Manage and monitor all hospitals on the platform</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          Assign Hospital
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Hospitals</p>
              <p className="text-3xl font-bold text-gray-900">{hospitals.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900">
                {Object.values(hospitalStats).reduce((sum, stats) => sum + (stats.totalPatients || 0), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900">
                {Object.values(hospitalStats).reduce((sum, stats) => sum + (stats.totalSessions || 0), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Avg. Completion</p>
              <p className="text-3xl font-bold text-gray-900">
                {hospitals.length > 0 
                  ? Math.round(Object.values(hospitalStats).reduce((sum, stats) => sum + (stats.completionRate || 0), 0) / hospitals.length)
                  : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search hospitals by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All Plans</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Hospitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredHospitals.map((hospital) => (
            <HospitalCard key={hospital.id} hospital={hospital} />
          ))}
        </AnimatePresence>
      </div>

      {filteredHospitals.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No hospitals found</h3>
          <p className="text-gray-400">
            {searchTerm || filterPlan !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Start by adding your first hospital to the platform.'
            }
          </p>
        </div>
      )}

      {/* Assign/Add Hospital Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 text-white flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Assign Hospital</h3>
                    <p className="text-sm text-gray-500">Create a hospital record and assign it to the system</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowAddModal(false)}>✕</button>
              </div>

              <HospitalForm
                onSubmit={async (data) => { await handleAddHospital(data); }}
                onCancel={() => setShowAddModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedHospital && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => { setSelectedHospital(null); setShowDetailsModal(false); setConfirmingDelete(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 text-white flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Hospital Details</h3>
                    <p className="text-sm text-gray-500">View hospital information</p>
                  </div>
                </div>
                <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => { setSelectedHospital(null); setShowDetailsModal(false); setConfirmingDelete(false); }}>✕</button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Name</div>
                  <div className="font-medium text-gray-900">{selectedHospital.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Email</div>
                  <div className="font-medium text-gray-900">{selectedHospital.email || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium text-gray-900">{selectedHospital.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Address</div>
                  <div className="font-medium text-gray-900">{selectedHospital.address || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">City</div>
                  <div className="font-medium text-gray-900">{selectedHospital.city || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">State</div>
                  <div className="font-medium text-gray-900">{selectedHospital.state || '—'}</div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                {confirmingDelete ? (
                  <div className="text-sm text-red-600">Are you sure you want to delete this hospital? This action cannot be undone.</div>
                ) : <div />}
                <div className="flex items-center gap-3">
                  {!confirmingDelete && (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                      onClick={() => { setSelectedHospital(null); setShowDetailsModal(false); setConfirmingDelete(false); }}
                    >Close</button>
                  )}
                  {confirmingDelete ? (
                    <>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                        onClick={() => setConfirmingDelete(false)}
                      >Cancel</button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700"
                        onClick={async () => {
                          try {
                            await handleDeleteHospital(selectedHospital.id, selectedHospital.name, { skipConfirm: true });
                          } finally {
                            setSelectedHospital(null);
                            setShowDetailsModal(false);
                            setConfirmingDelete(false);
                          }
                        }}
                      >Confirm Delete</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700"
                      onClick={() => setConfirmingDelete(true)}
                    >Delete</button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HospitalForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    admin_email: '',
    admin_password: ''
  });
  const [saving, setSaving] = useState(false);

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      window.showNotification?.({ type: 'error', title: 'Validation', message: 'Hospital Name is required' });
      return;
    }
    if (form.admin_email && !form.admin_password) {
      window.showNotification?.({ type: 'error', title: 'Validation', message: 'Please enter a password for the hospital admin' });
      return;
    }
    if (form.admin_password && String(form.admin_password).length < 6) {
      window.showNotification?.({ type: 'error', title: 'Validation', message: 'Admin password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        email: form.email?.trim() || '',
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        city: form.city?.trim() || '',
        state: form.state?.trim() || '',
        admin_email: form.admin_email?.trim() || undefined,
        admin_password: form.admin_password || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
          <input name="name" value={form.name} onChange={update} required className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={update} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" value={form.phone} onChange={update} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input name="address" value={form.address} onChange={update} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input name="city" value={form.city} onChange={update} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input name="state" value={form.state} onChange={update} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Admin Email</label>
          <input name="admin_email" type="email" value={form.admin_email} onChange={update} placeholder="admin@example.com" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Admin Password</label>
          <input name="admin_password" type="password" value={form.admin_password} onChange={update} placeholder="••••••" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={(e) => { e.preventDefault(); onCancel?.(); }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white hover:opacity-95 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save & Assign'}
        </button>
      </div>
    </form>
  );
}