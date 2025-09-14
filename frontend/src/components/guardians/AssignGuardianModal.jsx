import React, { useState } from 'react';
import { User } from '@/services';
import { Patient } from '@/services';
import { X } from 'lucide-react';

export default function AssignGuardianModal({ isOpen, onClose, onGuardianAssigned }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    relation: '',
    patientId: ''
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

    if (!formData.fullName || !formData.email || !formData.patientId) {
      setError('Full Name, Email, and Patient selection are required.');
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Create a User record for the guardian
      const newGuardian = await User.create({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: 'guardian',
      });
      
      // Step 2: Update the patient record to include this guardian
      const patient = await Patient.get(formData.patientId);
      const updatedGuardianIds = [...(patient.guardian_ids || []), newGuardian.id];
      
      await Patient.update(formData.patientId, {
        guardian_ids: updatedGuardianIds
      });
      
      onGuardianAssigned();
      onClose();
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        relation: '',
        patientId: ''
      });
    } catch (err) {
      console.error("Failed to assign guardian:", err);
      setError('Failed to assign guardian. The email might already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Assign Guardian</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow p-6 space-y-4">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
          
          <input 
            name="fullName" 
            value={formData.fullName} 
            onChange={handleChange} 
            placeholder="Guardian Full Name" 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl" 
            required 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              name="email" 
              type="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="Email Address" 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl" 
              required 
            />
            <input 
              name="phone" 
              type="tel" 
              value={formData.phone} 
              onChange={handleChange} 
              placeholder="Phone Number" 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl" 
            />
          </div>
          
          <input 
            name="relation" 
            value={formData.relation} 
            onChange={handleChange} 
            placeholder="Relationship to Patient (e.g., Father, Spouse)" 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl" 
          />
          
          <select 
            name="patientId" 
            value={formData.patientId} 
            onChange={handleChange} 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white"
            required
          >
            <option value="">Select Patient</option>
            <option value="patient_001">John Doe - PAT001</option>
            <option value="patient_002">Jane Smith - PAT002</option>
            {/* In a real app, you'd dynamically load patients */}
          </select>

          <div className="p-6 border-t flex justify-end gap-3 -mx-6 -mb-6 mt-6 bg-gray-50 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border bg-white hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {isLoading ? 'Assigning...' : 'Assign Guardian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}