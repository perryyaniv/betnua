import { Router } from 'express';
import Season from '../models/Season';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (_req, res) => {
  const seasons = await Season.find().sort({ startDate: -1 });
  res.json(seasons);
}));

router.post('/', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { label, startDate, endDate } = req.body;
  if (!label || !startDate || !endDate) {
    res.status(400).json({ message: 'label, startDate, endDate required' });
    return;
  }
  const season = await Season.create({ label, startDate, endDate });
  res.status(201).json(season);
}));

router.put('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { label, startDate, endDate, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (label !== undefined) update.label = label;
  if (startDate !== undefined) update.startDate = startDate;
  if (endDate !== undefined) update.endDate = endDate;
  if (isActive !== undefined) update.isActive = isActive;
  const season = await Season.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!season) {
    res.status(404).json({ message: 'Season not found' });
    return;
  }
  res.json(season);
}));

export default router;
