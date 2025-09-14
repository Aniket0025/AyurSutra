import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listPatients, getPatient, createPatient, updatePatient, deletePatient } from '../controllers/patients.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listPatients);
router.get('/:id', requireAuth, withUser, getPatient);
router.post('/', requireAuth, withUser, createPatient);
router.put('/:id', requireAuth, withUser, updatePatient);
router.delete('/:id', requireAuth, withUser, deletePatient);

export default router;
