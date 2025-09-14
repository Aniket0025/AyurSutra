import React, { useState, useEffect } from "react";
import { User } from "@/services";
import { Hospital } from "@/services";
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
  const [staff, setStaff] = useState([]);
  const [hospitals, setHospitals] = useState({});
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterHospital, setFilterHospital] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadStaff();
    }
  }, [currentUser]);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const rolesToFetch = ['doctor', 'therapist', 'hospital_admin', 'support'];
      let baseFilter = { role: { $in: rolesToFetch } };
      
      if (currentUser.role === 'hospital_admin') {
        baseFilter.hospital_id = currentUser.hospital_id;
      }
      
      const staffData = await User.filter(baseFilter, '-created_date', 500);
      setStaff(staffData);

      if (currentUser.role === 'super_admin') {
        const hospitalData = await Hospital.list();
        const hospitalMap = hospitalData.reduce((acc, h) => ({ ...acc, [h.id]: h.name }), {});
        setHospitals(hospitalMap);
      }
    } catch (error) {
      console.error("Error loading staff:", error);
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    let filtered = staff.filter(member => {
        const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             member.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === "all" || member.role === filterRole;
        const matchesHospital = filterHospital === "all" || member.hospital_id === filterHospital;
        return matchesSearch && matchesRole && (currentUser.role === 'super_admin' ? matchesHospital : true);
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
  
  const handleDeleteStaff = async (staffId) => {
      if (!window.confirm("Are you sure you want to remove this staff member?")) return;
      try {
          await User.delete(staffId);
          loadStaff();
          window.showNotification({ type: 'success', title: 'Staff Removed', message: 'Staff member has been successfully removed.'});
      } catch(e) {
          console.error("Failed to delete staff:", e);
          window.showNotification({ type: 'error', title: 'Error', message: 'Failed to remove staff member.'});
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
            <h3 className="text-lg font-bold text-gray-900">{staffMember.full_name}</h3>
            <p className="text-gray-500 text-sm">{staffMember.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => handleEditStaff(staffMember)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit Staff">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDeleteStaff(staffMember.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Staff">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
            <Briefcase className="w-4 h-4" />
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(staffMember.role)}`}>{staffMember.role.replace('_', ' ')}</span>
            {staffMember.specialization && <span className="text-gray-500">• {staffMember.specialization}</span>}
        </div>
        {currentUser.role === 'super_admin' && staffMember.hospital_id && (
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
          Add Staff Member
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
            {currentUser.role === 'super_admin' && (
              <select value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                <option value="all">All Hospitals</option>
                {uniqueHospitalIds.map(hospitalId => <option key={hospitalId} value={hospitalId}>{hospitals[hospitalId] || hospitalId}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((staffMember) => <StaffCard key={staffMember.id} staffMember={staffMember} />)
        ) : (
          <div className="col-span-full text-center py-12">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No staff members found</h3>
          </div>
        )}
      </div>

      <AddStaffModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onStaffAdded={loadStaff} staffMember={selectedStaff} currentUser={currentUser} />
    </div>
  );
}