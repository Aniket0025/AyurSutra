
import React, { useState, useEffect } from 'react';
import { User } from '@/services';
import { X, UserPlus, Phone, Mail, Lock } from 'lucide-react';

export default function AddStaffModal({ isOpen, onClose, onStaffAdded, currentUser }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'doctor',
    password: '' // Note: Password handling should be done securely.
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.fullName || !formData.email || !formData.role) {
      setError('Full Name, Email, and Role are required.');
      setIsLoading(false);
      return;
    }

    try {
      // In a real app, this would be an invitation flow.
      // Here, we simulate creating a user record.
      // NOTE: Base44 handles the actual user invitation and auth. This just creates a record.
      const staffData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        hospital_id: currentUser.hospital_id,
        has_selected_role: true, // Staff are considered to have a role selected.
      };

      // The platform handles the actual user creation/invitation.
      // We are just adding a record to our User entity to represent the staff.
      await User.create(staffData);
      
      window.showNotification?.({
        type: 'success',
        title: 'Staff Record Created',
        message: `${formData.fullName} has been added. They will need to sign up with the email ${formData.email} to access the system.`,
        autoClose: true,
        duration: 8000,
      });

      onStaffAdded();
      onClose();
    } catch (err) {
      console.error("Failed to add staff:", err);
      setError('Failed to add staff. An account with this email may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Add New Staff Member</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="doctor">Doctor</option>
                <option value="therapist">Therapist</option>
                <option value="admin">Admin</option>
                <option value="support">Support</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">The new staff member will be associated with your hospital: <strong>{currentUser?.hospital_name || `Hospital ID ${currentUser?.hospital_id}`}</strong>.</p>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border bg-white hover:bg-gray-50 font-medium">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Add Staff Member'}
            </button>
        </div>
      </div>
    </div>
  );
}
