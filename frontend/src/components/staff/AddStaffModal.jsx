
import React, { useState, useEffect } from 'react';
import { Hospital } from '@/services';
import { X, UserPlus } from 'lucide-react';

export default function AddStaffModal({ isOpen, onClose, onStaffAdded, currentUser }) {
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'doctor',
    email: '',
    phone: '',
    department: '',
    password: '',
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

    if (!formData.fullName || !formData.role) {
      setError('Full Name and Role are required.');
      setIsLoading(false);
      return;
    }
    if (!formData.email) {
      setError('Email is required for login.');
      setIsLoading(false);
      return;
    }
    if (!formData.password || String(formData.password).length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      if (!currentUser?.hospital_id) {
        throw new Error('Your account is not linked to any hospital.');
      }

      const payload = {
        full_name: formData.fullName.trim(),
        role: formData.role,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        password: formData.password,
      };

      await Hospital.assignStaff(currentUser.hospital_id, payload);
      
      window.showNotification?.({
        type: 'success',
        title: 'Staff Assigned',
        message: `${formData.fullName} has been assigned and can now log in.`,
        autoClose: true,
        duration: 8000,
      });

      onStaffAdded();
      onClose();
    } catch (err) {
      console.error("Failed to add staff:", err);
      setError(err?.details?.message || err?.message || 'Failed to assign staff.');
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
            <h2 className="text-2xl font-bold text-gray-800">Assign Staff</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form id="assign-staff-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="doctor">Doctor</option>
                <option value="support">Office Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address (for login) *</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="doctor@example.com" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="9999999999" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department (optional)</label>
              <input name="department" value={formData.department} onChange={handleChange} placeholder="Panchakarma" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password (for login) *</label>
                <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="•••••••" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="hidden md:block" />
            </div>
            <p className="text-xs text-gray-500">The new staff member will be associated with your hospital: <strong>{currentUser?.hospital_name || `Hospital ID ${currentUser?.hospital_id}`}</strong>. They will log in using the provided email and password. Access will be restricted to this hospital.</p>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border bg-white hover:bg-gray-50 font-medium">Cancel</button>
            <button form="assign-staff-form" type="submit" disabled={isLoading} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Save & Assign Staff'}
            </button>
        </div>
      </div>
    </div>
  );
}
