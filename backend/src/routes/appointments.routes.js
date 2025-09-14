import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAppointment, listMyAppointments, cancelMyAppointment, rescheduleMyAppointment } from '../controllers/appointments.controller.js';

const router = Router();

router.get('/mine', requireAuth, listMyAppointments);
router.post('/', requireAuth, createAppointment);
router.post('/:id/cancel', requireAuth, cancelMyAppointment);
router.patch('/:id/reschedule', requireAuth, rescheduleMyAppointment);

export default router;
