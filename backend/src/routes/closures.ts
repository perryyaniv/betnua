import { Router } from 'express';
import Closure from '../models/Closure';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds } from '../utils/branchAccess';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const query = accessible
    ? { $or: [{ scope: 'all' }, { scope: 'branch', branchId: { $in: accessible } }] }
    : {};
  const closures = await Closure.find(query).sort({ date: 1 });
  res.json(closures);
}));

router.post('/', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { date, scope, branchId, reason } = req.body;
  if (!date || !scope || !reason) {
    res.status(400).json({ message: 'date, scope, reason required' });
    return;
  }
  const closure = await Closure.create({ date, scope, branchId: scope === 'branch' ? branchId : null, reason });
  res.status(201).json(closure);
}));

router.delete('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const closure = await Closure.findByIdAndDelete(req.params.id);
  if (!closure) {
    res.status(404).json({ message: 'Closure not found' });
    return;
  }
  res.json({ message: 'Deleted' });
}));

export default router;
