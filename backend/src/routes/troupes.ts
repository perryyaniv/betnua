import { Router } from 'express';
import mongoose from 'mongoose';
import Troupe from '../models/Troupe';
import Course from '../models/Course';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds, canWriteBranch } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const { branchId } = req.query;

  const query: Record<string, unknown> = {};
  if (accessible) query.branchId = { $in: accessible };
  if (branchId) query.branchId = branchId;

  const troupes = await Troupe.find(query).sort({ name: 1 });
  res.json(troupes);
}));

router.post('/', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, branchId } = req.body;
  if (!name || !branchId) {
    res.status(400).json({ message: 'name and branchId required' });
    return;
  }
  if (!canWriteBranch(req.user!, branchId)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const troupe = await Troupe.create({ name, branchId });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Troupe',
    entityId: troupe._id,
    action: `יצר להקה ${name}`,
  });
  res.status(201).json(troupe);
}));

router.put('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const troupe = await Troupe.findById(req.params.id);
  if (!troupe) {
    res.status(404).json({ message: 'Troupe not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(troupe.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const { name, isActive } = req.body;
  if (name !== undefined) troupe.name = name;
  if (isActive !== undefined) troupe.isActive = isActive;
  await troupe.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Troupe',
    entityId: troupe._id,
    action: `עדכן להקה ${troupe.name}`,
  });
  res.json(troupe);
}));

router.delete('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const troupe = await Troupe.findById(req.params.id);
  if (!troupe) {
    res.status(404).json({ message: 'Troupe not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(troupe.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const inUse = await Course.exists({ $or: [{ troupeId: req.params.id }, { mandatoryForTroupeIds: req.params.id }] });
  if (inUse || troupe.members.some((m) => m.isActive)) {
    res.status(400).json({ message: 'בשימוש - לא ניתן למחוק' });
    return;
  }
  await troupe.deleteOne();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Troupe',
    entityId: troupe._id,
    action: `מחק להקה ${troupe.name}`,
  });
  res.json({ message: 'Deleted' });
}));

// --- Membership sub-resource ---

router.post('/:id/members', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) {
    res.status(400).json({ message: 'studentId required' });
    return;
  }
  const troupe = await Troupe.findById(req.params.id);
  if (!troupe) {
    res.status(404).json({ message: 'Troupe not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(troupe.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  troupe.members.push({
    studentId: new mongoose.Types.ObjectId(studentId),
    joinedAt: new Date(),
    isActive: true,
  } as never);
  await troupe.save();
  res.status(201).json(troupe);
}));

router.patch('/:id/members/:memberId', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const troupe = await Troupe.findById(req.params.id);
  if (!troupe) {
    res.status(404).json({ message: 'Troupe not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(troupe.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const member = troupe.members.find((m) => String(m._id) === req.params.memberId);
  if (!member) {
    res.status(404).json({ message: 'Member not found' });
    return;
  }
  const { isActive } = req.body;
  if (isActive !== undefined) {
    member.isActive = isActive;
    member.leftAt = isActive ? null : new Date();
  }
  await troupe.save();
  res.json(troupe);
}));

router.delete('/:id/members/:memberId', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const troupe = await Troupe.findById(req.params.id);
  if (!troupe) {
    res.status(404).json({ message: 'Troupe not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(troupe.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  troupe.members = troupe.members.filter((m) => String(m._id) !== req.params.memberId) as never;
  await troupe.save();
  res.json(troupe);
}));

export default router;
