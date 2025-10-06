import React from 'react';

export default function Dashboard({ currentUser }) {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome{currentUser?.full_name ? `, ${currentUser.full_name}` : ''}</h1>
          <p className="text-gray-500">This is your AyurSutra Dashboard. No redirects, fully local.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Quick Links</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Use the top navigation to access Patients, Scheduling, Hospitals, etc.</li>
            <li>Data is stored locally in your browser for this build.</li>
          </ul>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Status</h2>
          <p className="text-sm text-gray-600">Working perfectly.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">User</h2>
          <p className="text-sm text-gray-600">Role: <span className="font-medium">{currentUser?.role || 'guest'}</span></p>
        </div>
      </div>
    </div>
  );
}