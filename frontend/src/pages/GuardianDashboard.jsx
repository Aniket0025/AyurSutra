import React from 'react';
import { Shield, Activity, Bell } from 'lucide-react';

export default function GuardianDashboard() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Guardian's Dashboard</h1>
          <p className="text-gray-500">Stay updated on your loved one's progress.</p>
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Activity className="text-purple-500" /> Patient Progress</h2>
            <p className="mt-2 text-gray-600">Track therapy progress and milestones.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Bell className="text-orange-500" /> Notifications</h2>
            <p className="mt-2 text-gray-600">Receive important alerts and updates.</p>
        </div>
      </div>
    </div>
  );
}