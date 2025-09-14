import React from 'react';
import { Stethoscope, Users, Calendar } from 'lucide-react';

export default function DoctorDashboard() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor's Dashboard</h1>
          <p className="text-gray-500">Your central hub for patient care and scheduling.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="text-blue-500" /> My Patients</h2>
            <p className="mt-2 text-gray-600">View and manage your assigned patients.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Calendar className="text-green-500" /> Therapy Schedule</h2>
            <p className="mt-2 text-gray-600">Access and update your therapy calendar.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Stethoscope className="text-purple-500" /> Clinical Notes</h2>
            <p className="mt-2 text-gray-600">Create and review clinical documentation.</p>
        </div>
      </div>
    </div>
  );
}