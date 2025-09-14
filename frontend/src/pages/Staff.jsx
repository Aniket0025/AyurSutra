import React, { useState, useEffect } from "react";
import { Hospital, User } from "@/services";
import { 
  UserCheck, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Phone,
  Mail,
  Award,
  MapPin,
  Briefcase
} from "lucide-react";
import AddStaffModal from "../components/staff/AddStaffModal";

export default function Staff({ currentUser }) {
  const [effectiveUser, setEffectiveUser] = useState(currentUser);
  const [staff, setStaff] = useState([]);
  const [hospitals, setHospitals] = useState({});
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterHospital, setFilterHospital] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Resolve current user if not provided as prop
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!currentUser) {
          const me = await User.me();
          if (mounted) setEffectiveUser(me);
        } else {
          setEffectiveUser(currentUser);
        }
      } catch {
        if (mounted) setEffectiveUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  useEffect(() => {
    if (effectiveUser) {
      loadStaff(effectiveUser);
    }
  }, [effectiveUser]);

  const loadStaff = async (userCtx = effectiveUser) => {
    setIsLoading(true);
    try {
      let staffData = [];
      if (!userCtx) {
        staffData = [];
      } else if (userCtx.role === 'super_admin') {
        const hospitalData = await Hospital.list();
        const hospitalMap = hospitalData.reduce((acc, h) => ({ ...acc, [h.id]: h.name }), {});
        setHospitals(hospitalMap);
        const lists = await Promise.all(hospitalData.map(h => Hospital.listStaff(h.id).catch(() => [])));
        staffData = lists.flat();
      } else if (userCtx.role === 'hospital_admin' || userCtx.role === 'admin') {
        if (userCtx.hospital_id) {
          staffData = await Hospital.listStaff(userCtx.hospital_id);
        } else {
          staffData = [];
        }
      } else {
        staffData = [];
      }
      setStaff(staffData);
    } catch (error) {
      console.error("Error loading staff:", error);
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    let filtered = staff.filter(member => {
      const name = (member.full_name || member.name || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      const spec = (member.specialization || member.department || '').toLowerCase();
      const matchesSearch = name.includes(term) || email.includes(term) || spec.includes(term);
      const matchesRole = filterRole === 'all' || member.role === filterRole;
      const matchesHospital = filterHospital === 'all' || member.hospital_id === filterHospital;
      return matchesSearch && matchesRole && (effectiveUser?.role === 'super_admin' ? matchesHospital : true);
    });
    setFilteredStaff(filtered);
  }, [staff, searchTerm, filterRole, filterHospital, currentUser]);


  const handleAddStaff = () => {
    setSelectedStaff(null);
    setIsAddModalOpen(true);
  }

  const handleEditStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setIsAddModalOpen(true);
  };
  
  const handleDeleteStaff = async (staffMember) => {
    const name = staffMember.full_name || staffMember.name || 'this staff member';
    if (!window.confirm(`Remove ${name}? This cannot be undone.`)) return;
    try {
      const hospitalId = effectiveUser?.role === 'super_admin' ? staffMember.hospital_id : effectiveUser?.hospital_id;
      if (!hospitalId) throw new Error('Missing hospital id');
      await Hospital.removeStaff(hospitalId, staffMember.id);
      await loadStaff(effectiveUser);
      window.showNotification?.({ type: 'success', title: 'Staff Removed', message: `${name} has been removed.`});
    } catch(e) {
      console.error("Failed to delete staff:", e);
      window.showNotification?.({ type: 'error', title: 'Error', message: e?.details?.message || e?.message || 'Failed to remove staff member.'});
    }
  }
  
  const uniqueHospitalIds = [...new Set(staff.map(s => s.hospital_id).filter(Boolean))].sort();

  const getRoleColor = (role) => {
    const colors = {
      doctor: 'bg-blue-100 text-blue-700',
      therapist: 'bg-green-100 text-green-700',
      hospital_admin: 'bg-purple-100 text-purple-700',
      support: 'bg-orange-100 text-orange-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const StaffCard = ({ staffMember }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-semibold">
            {staffMember.full_name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{staffMember.full_name || staffMember.name}</h3>
            <p className="text-gray-500 text-sm">{staffMember.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => handleEditStaff(staffMember)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit Staff">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDeleteStaff(staffMember)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Staff">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* If hospital admin without hospital_id, guide to assign hospital */}
      {effectiveUser?.role === 'hospital_admin' && !effectiveUser?.hospital_id && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6">
          Your account is not linked to a hospital yet. Please go to the Hospitals page and assign your hospital to start adding staff.
        </div>
      )}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
            <Briefcase className="w-4 h-4" />
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(staffMember.role)}`}>{staffMember.role.replace('_', ' ')}</span>
            {staffMember.specialization && <span className="text-gray-500">• {staffMember.specialization}</span>}
        </div>
        {effectiveUser?.role === 'super_admin' && staffMember.hospital_id && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{hospitals[staffMember.hospital_id] || `ID: ${staffMember.hospital_id}`}</span>
          </div>
        )}
        {staffMember.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" /><span>{staffMember.phone}</span></div>}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-500">Manage doctors, therapists and administrative staff</p>
          </div>
        </div>
        <button onClick={handleAddStaff} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300">
          <Plus className="w-5 h-5" />
          Assign Staff
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search staff by name, email, or specialization..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="therapist">Therapists</option>
              <option value="hospital_admin">Admins</option>
              <option value="support">Support</option>
            </select>
            {effectiveUser?.role === 'super_admin' && (
              <select value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                <option value="all">All Hospitals</option>
                {uniqueHospitalIds.map(hospitalId => <option key={hospitalId} value={hospitalId}>{hospitals[hospitalId] || hospitalId}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Doctors</p>
              <p className="text-3xl font-bold text-gray-900">{filteredStaff.filter(s => s.role === 'doctor').length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold">Dr</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Therapists</p>
              <p className="text-3xl font-bold text-gray-900">{filteredStaff.filter(s => s.role === 'therapist').length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center font-bold">Th</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Support</p>
              <p className="text-3xl font-bold text-gray-900">{filteredStaff.filter(s => s.role === 'support').length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-2xl flex items-center justify-center font-bold">Sp</div>
          </div>
        </div>
      </div>

      {/* Grouped by Role */}
      <div className="space-y-10">
        {/* Doctors */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Doctors</h2>
            <span className="text-sm text-gray-500">{filteredStaff.filter(s => s.role === 'doctor').length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.filter(s => s.role === 'doctor').map((staffMember) => (
              <StaffCard key={staffMember.id} staffMember={staffMember} />
            ))}
            {filteredStaff.filter(s => s.role === 'doctor').length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">No doctors assigned.</div>
            )}
          </div>
        </section>

        {/* Therapists */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Therapists</h2>
            <span className="text-sm text-gray-500">{filteredStaff.filter(s => s.role === 'therapist').length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.filter(s => s.role === 'therapist').map((staffMember) => (
              <StaffCard key={staffMember.id} staffMember={staffMember} />
            ))}
            {filteredStaff.filter(s => s.role === 'therapist').length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">No therapists assigned.</div>
            )}
          </div>
        </section>

        {/* Support */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Support Staff</h2>
            <span className="text-sm text-gray-500">{filteredStaff.filter(s => s.role === 'support').length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.filter(s => s.role === 'support').map((staffMember) => (
              <StaffCard key={staffMember.id} staffMember={staffMember} />
            ))}
            {filteredStaff.filter(s => s.role === 'support').length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">No support staff assigned.</div>
            )}
          </div>
        </section>
      </div>

      {(!isLoading && staff.length === 0) && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-dashed">
          No staff members found. Click "Assign Staff" to add your first staff member.
        </div>
      )}

      <AddStaffModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onStaffAdded={() => loadStaff(effectiveUser)} staffMember={selectedStaff} currentUser={effectiveUser} />
    </div>
  );
}