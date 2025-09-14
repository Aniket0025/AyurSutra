import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';

const isAdminRole = (user) => ['super_admin','admin','hospital_admin'].includes(user?.role);

export const createAppointment = async (req, res) => {
  try {
    const user = req.user; // set by auth middleware
    const {
      hospital_id,
      staff_id,
      type, // 'doctor' | 'therapist'
      start_time,
      end_time,
      notes,
    } = req.body || {};

    if (!hospital_id || !staff_id || !type || !start_time || !end_time) {
      return res.status(400).json({ message: 'hospital_id, staff_id, type, start_time, end_time are required' });
    }

    const hospital = await Hospital.findById(hospital_id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const staff = await User.findById(staff_id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (!['doctor','therapist'].includes(staff.role)) {
      return res.status(400).json({ message: 'Selected user is not a doctor/therapist' });
    }

    // Patient id is the authenticated user by default
    const patient_id = user._id;

    // Scope: hospital must match staff
    if (String(staff.hospital_id) !== String(hospital._id)) {
      return res.status(400).json({ message: 'Staff does not belong to this hospital' });
    }

    const appt = await Appointment.create({
      hospital_id: hospital._id,
      patient_id,
      staff_id: staff._id,
      type: staff.role === 'doctor' ? 'doctor' : 'therapist',
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      status: 'pending',
      notes: notes || undefined,
    });

    res.status(201).json({ appointment: appt });
  } catch (e) {
    console.error('createAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listMyAppointments = async (req, res) => {
  try {
    const user = req.user; // patient primarily
    const query = { patient_id: user._id };
    const appts = await Appointment.find(query).sort({ start_time: 1 });
    res.json({ appointments: appts });
  } catch (e) {
    console.error('listMyAppointments error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelMyAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (String(appt.patient_id) !== String(req.user._id) && !isAdminRole(req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (['completed','cancelled'].includes(appt.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed/cancelled appointment' });
    }
    appt.status = 'cancelled';
    await appt.save();
    res.json({ appointment: appt });
  } catch (e) {
    console.error('cancelMyAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rescheduleMyAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body || {};
    if (!start_time || !end_time) return res.status(400).json({ message: 'start_time and end_time required' });
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (String(appt.patient_id) !== String(req.user._id) && !isAdminRole(req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (['completed','cancelled'].includes(appt.status)) {
      return res.status(400).json({ message: 'Cannot reschedule a completed/cancelled appointment' });
    }
    appt.start_time = new Date(start_time);
    appt.end_time = new Date(end_time);
    appt.status = 'pending';
    await appt.save();
    res.json({ appointment: appt });
  } catch (e) {
    console.error('rescheduleMyAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
