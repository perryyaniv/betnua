import { Router } from 'express';
import DropoutReason from '../models/DropoutReason';
import Student from '../models/Student';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (_req, res) => {
  const reasons = await DropoutReason.find().sort({ name: 1 });
  res.json(reasons);
}));

router.post('/', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  const reason = await DropoutReason.create({ name });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'DropoutReason',
    entityId: reason._id,
    action: `יצר סיבת פרישה ${name}`,
  });
  res.status(201).json(reason);
}));

router.put('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (isActive !== undefined) update.isActive = isActive;
  const reason = await DropoutReason.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!reason) {
    res.status(404).json({ message: 'Dropout reason not found' });
    return;
  }
  res.json(reason);
}));

router.delete('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const inUse = await Student.exists({ 'enrollments.dropoutReasonId': req.params.id });
  if (inUse) {
    res.status(400).json({ message: 'בשימוש - לא ניתן למחוק' });
    return;
  }
  const reason = await DropoutReason.findByIdAndDelete(req.params.id);
  if (!reason) {
    res.status(404).json({ message: 'Dropout reason not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'DropoutReason',
    entityId: reason._id,
    action: `מחק סיבת פרישה ${reason.name}`,
  });
  res.json({ message: 'Deleted' });
}));

export default router;
