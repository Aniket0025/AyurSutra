import { Patient } from '../models/Patient.js';
import { withUser } from '../middleware/hospitalScope.js';

export const listPatients = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id) return res.json({ patients: [] });
      filter.hospital_id = req.user.hospital_id;
    }
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json({ patients });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const p = await Patient.findById(id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(p.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    res.json({ patient: p });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPatient = async (req, res) => {
  try {
    const body = req.body || {};
    if (req.user.role === 'super_admin') {
      // allow specifying hospital_id
      if (!body.hospital_id) return res.status(400).json({ message: 'hospital_id required' });
    } else {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      body.hospital_id = req.user.hospital_id;
    }
    const created = await Patient.create(body);
    res.status(201).json({ patient: created });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Patient.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Non-super admins cannot change hospital
      if (req.body.hospital_id && String(req.body.hospital_id) !== String(existing.hospital_id)) {
        return res.status(400).json({ message: 'Cannot change hospital_id' });
      }
    }
    const updated = await Patient.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ patient: updated });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Patient.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    await Patient.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
