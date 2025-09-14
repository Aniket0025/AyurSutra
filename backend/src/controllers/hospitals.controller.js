import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

function isSuperAdmin(user) { return user?.role === 'super_admin'; }
function isHospitalAdmin(user) { return user?.role === 'hospital_admin'; }
function isAdmin(user) { return user?.role === 'admin'; }

export const listHospitals = async (req, res) => {
  try {
    // Super admin: all hospitals
    if (isSuperAdmin(req.user)) {
      const hospitals = await Hospital.find();
      return res.json({ hospitals });
    }
    // Admin: all hospitals
    if (isAdmin(req.user)) {
      const hospitals = await Hospital.find();
      return res.json({ hospitals });
    }
    // Hospital admin: only their own assigned hospital
    if (isHospitalAdmin(req.user)) {
      if (!req.user.hospital_id) return res.json({ hospitals: [] });
      const hospital = await Hospital.findById(req.user.hospital_id);
      return res.json({ hospitals: hospital ? [hospital] : [] });
    }
    // Others: none
    return res.json({ hospitals: [] });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findById(id);
    if (!hospital) return res.status(404).json({ message: 'Not found' });
    if (!isSuperAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    res.json({ hospital });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createHospital = async (req, res) => {
  try {
    if (!(isSuperAdmin(req.user) || isAdmin(req.user) || isHospitalAdmin(req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const hospital = await Hospital.create(req.body);
    // If creator is not super admin, auto-assign this hospital to them if they don't already have one
    if (!isSuperAdmin(req.user)) {
      try {
        if (!req.user.hospital_id) {
          req.user.hospital_id = hospital._id;
          await req.user.save();
        }
      } catch {}
    }

    // Optionally create/assign a hospital admin user
    const { admin_email, admin_password, admin_name, admin_phone } = req.body || {};
    if (admin_email && admin_password) {
      let targetUser = await User.findOne({ email: admin_email });
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(String(admin_password), salt);
      if (targetUser) {
        targetUser.role = 'hospital_admin';
        targetUser.hospital_id = hospital._id;
        targetUser.passwordHash = passwordHash;
        if (admin_name) targetUser.name = admin_name;
        if (admin_phone) targetUser.phone = admin_phone;
        await targetUser.save();
      } else {
        await User.create({
          name: admin_name || admin_email.split('@')[0],
          email: admin_email,
          phone: admin_phone || undefined,
          role: 'hospital_admin',
          hospital_id: hospital._id,
          passwordHash,
        });
      }
    }
    res.status(201).json({ hospital });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req.user)) {
      // Admin or hospital_admin must only update their own hospital
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const hospital = await Hospital.findByIdAndUpdate(id, req.body, { new: true });
    if (!hospital) return res.status(404).json({ message: 'Not found' });
    res.json({ hospital });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;
    // super_admin: can delete any
    if (!isSuperAdmin(req.user)) {
      // admin: can delete any
      if (isAdmin(req.user)) {
        // allowed
      } else {
        // hospital_admin: only their own hospital
        if (!req.user.hospital_id || String(req.user.hospital_id) !== String(id)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
    }
    const hospital = await Hospital.findByIdAndDelete(id);
    if (!hospital) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
