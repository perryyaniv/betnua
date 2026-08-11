import { Router } from 'express';
import CourseType from '../models/CourseType';
import Course from '../models/Course';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (_req, res) => {
  const types = await CourseType.find().sort({ name: 1 });
  res.json(types);
}));

router.post('/', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, colorTag } = req.body;
  if (!name) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  const type = await CourseType.create({ name, colorTag });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'CourseType',
    entityId: type._id,
    action: `יצר סוג חוג ${name}`,
  });
  res.status(201).json(type);
}));

router.put('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, colorTag } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (colorTag !== undefined) update.colorTag = colorTag;
  const type = await CourseType.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!type) {
    res.status(404).json({ message: 'Course type not found' });
    return;
  }
  res.json(type);
}));

router.delete('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const inUse = await Course.exists({ courseTypeId: req.params.id });
  if (inUse) {
    res.status(400).json({ message: 'בשימוש - לא ניתן למחוק' });
    return;
  }
  const type = await CourseType.findByIdAndDelete(req.params.id);
  if (!type) {
    res.status(404).json({ message: 'Course type not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'CourseType',
    entityId: type._id,
    action: `מחק סוג חוג ${type.name}`,
  });
  res.json({ message: 'Deleted' });
}));

export default router;
