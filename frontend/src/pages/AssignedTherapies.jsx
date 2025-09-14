import React from "react";

export default function AssignedTherapies({ currentUser }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Assigned Therapies</h2>
        <p className="text-gray-500">Patients assigned to you along with therapy details from the doctor.</p>
      </div>

      {/* Placeholder content - integrate with API when available */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="text-gray-600">No assigned therapies found yet.</div>
      </div>
    </div>
  );
}
