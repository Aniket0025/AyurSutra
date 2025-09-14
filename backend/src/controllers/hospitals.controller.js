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
    // Other roles (patient, doctor, therapist, support, guardian): allow reading all hospitals for selection/booking
    const hospitals = await Hospital.find();
    return res.json({ hospitals });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const listStaff = async (req, res) => {
  try {
    const { id: hospitalId } = req.params;
    // Scope rules:
    // - super_admin/admin: can view any hospital's staff
    // - hospital_admin: can view only their own hospital's staff
    // - other roles (patient/doctor/therapist/support/guardian): can view any hospital's staff (read-only for booking)
    if (isHospitalAdmin(req.user) && !isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const allowedRoles = ['doctor','therapist','support'];
    const users = await User.find({ hospital_id: hospitalId, role: { $in: allowedRoles } });
    return res.json({ staff: users.map(u => u.toJSON()) });
  } catch (e) {
    console.error('listStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const removeStaff = async (req, res) => {
  try {
    const { id: hospitalId, userId } = req.params;
    if (!isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const allowedRoles = new Set(['doctor','therapist','support']);
    if (!allowedRoles.has(user.role)) {
      return res.status(400).json({ message: 'Cannot remove this role via hospital staff endpoint' });
    }
    if (String(user.hospital_id) !== String(hospitalId)) {
      return res.status(400).json({ message: 'User not in this hospital' });
    }
    await user.deleteOne();
    return res.json({ message: 'Staff removed' });
  } catch (e) {
    console.error('removeStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const assignStaff = async (req, res) => {
  try {
    const { id: hospitalId } = req.params;
    const {
      full_name,
      email,
      phone,
      role,
      username,
      password,
      department,
    } = req.body || {};

    // Scope: hospital_admin can only assign to their own hospital
    if (!isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const allowedRoles = new Set(['doctor', 'therapist', 'support']);
    if (!allowedRoles.has(String(role))) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!full_name || !(email || username) || !password) {
      return res.status(400).json({ message: 'full_name, password and one of email/username are required' });
    }

    // Ensure hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    // Check conflicts
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ message: 'Email already registered' });
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(409).json({ message: 'Phone already registered' });
    }
    if (username) {
      const existingUsername = await User.findOne({ username: String(username).toLowerCase() });
      if (existingUsername) return res.status(409).json({ message: 'Username already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);

    const user = await User.create({
      name: full_name,
      email: email || undefined,
      phone: phone || undefined,
      username: username ? String(username).toLowerCase() : undefined,
      role,
      hospital_id: hospital._id,
      has_selected_role: true,
      passwordHash,
      department: department || undefined,
    });

    return res.status(201).json({ message: 'Staff assigned', user: user.toJSON() });
  } catch (e) {
    console.error('assignStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
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
