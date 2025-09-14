
import React, { useState, useEffect } from "react";
import { User } from "@/services";
import { Patient } from "@/services";
import { 
  Shield, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Calendar,
  Phone,
  Mail,
  Users,
  MapPin,
  Clock,
  Heart
} from "lucide-react";
import AssignGuardianModal from "../components/guardians/AssignGuardianModal";

export default function Guardians() {
  const [guardians, setGuardians] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  useEffect(() => {
    loadGuardianData();
  }, []);

  const loadGuardianData = async () => {
    try {
      const userData = await User.list('-created_date');
      const guardiansData = userData.filter(user => user.role === 'guardian');
      setGuardians(guardiansData);

      const patientsData = await Patient.list();
      setPatients(patientsData);
    } catch (error) {
      console.error("Error loading guardian data:", error);
    }
    setIsLoading(false);
  };

  const handleGuardianAssigned = () => {
    loadGuardianData(); // Reload the data after a guardian is assigned
  };

  const getGuardianPatients = (guardianId) => {
    return patients.filter(patient => 
      patient.guardian_ids && patient.guardian_ids.includes(guardianId)
    );
  };

  const filteredGuardians = guardians.filter(guardian =>
    guardian.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guardian.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const GuardianCard = ({ guardian }) => {
    const assignedPatients = getGuardianPatients(guardian.id);

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {guardian.full_name?.charAt(0)?.toUpperCase() || 'G'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{guardian.full_name || 'Guardian'}</h3>
              <p className="text-gray-500">{guardian.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Guardian
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  {assignedPatients.length} Patients
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {guardian.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{guardian.phone}</span>
            </div>
          )}
          
          {guardian.emergency_contact && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Heart className="w-4 h-4" />
              <span>Emergency: {guardian.emergency_contact}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Guardian since {new Date(guardian.created_date).toLocaleDateString()}</span>
          </div>
        </div>

        {assignedPatients.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Patients ({assignedPatients.length})
            </h4>
            <div className="space-y-1">
              {assignedPatients.slice(0, 3).map((patient) => (
                <div key={patient.id} className="text-sm text-gray-600 flex items-center justify-between">
                  <span>{patient.user_id || 'Patient'}</span>
                  <span className="text-xs bg-white px-2 py-1 rounded-full">
                    {patient.progress_score || 0}% Progress
                  </span>
                </div>
              ))}
              {assignedPatients.length > 3 && (
                <div className="text-xs text-purple-600 font-medium">
                  +{assignedPatients.length - 3} more patients
                </div>
              )}
            </div>
          </div>
        )}

        {assignedPatients.length === 0 && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No patients assigned yet</p>
          </div>
        )}
      </div>
    );
  };

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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Guardian Management</h1>
            <p className="text-gray-500">Manage patient guardians and family caregivers</p>
          </div>
        </div>

        <button 
          onClick={() => setIsAssignModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          Assign Guardian
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search guardians by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <select className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="all">All Guardians</option>
              <option value="active">Active Guardians</option>
              <option value="unassigned">Unassigned</option>
            </select>
            
            <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Guardians</p>
              <p className="text-3xl font-bold text-gray-900">{guardians.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Active Guardians</p>
              <p className="text-3xl font-bold text-gray-900">
                {guardians.filter(g => getGuardianPatients(g.id).length > 0).length}
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
              <p className="text-sm font-medium text-gray-500 mb-1">Patients with Guardians</p>
              <p className="text-3xl font-bold text-gray-900">
                {patients.filter(p => p.guardian_ids && p.guardian_ids.length > 0).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Avg Patients per Guardian</p>
              <p className="text-3xl font-bold text-gray-900">
                {guardians.length > 0 ? 
                  Math.round(patients.filter(p => p.guardian_ids?.length > 0).length / guardians.length * 10) / 10 : 
                  0
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Guardians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuardians.length > 0 ? (
          filteredGuardians.map((guardian) => (
            <GuardianCard key={guardian.id} guardian={guardian} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No guardians found</h3>
            <p className="text-gray-400 mb-6">Assign family members as guardians to track patient progress</p>
            <button 
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Assign Guardian
            </button>
          </div>
        )}
      </div>

      <AssignGuardianModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onGuardianAssigned={handleGuardianAssigned}
      />
    </div>
  );
}
