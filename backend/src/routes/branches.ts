import { Router } from 'express';
import Branch from '../models/Branch';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const query = accessible ? { _id: { $in: accessible } } : {};
  const branches = await Branch.find(query).sort({ name: 1 });
  res.json(branches);
}));

router.get('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  res.json(branch);
}));

router.post('/', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, address, phone, hoursOpen, hoursClose } = req.body;
  if (!name) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  const branch = await Branch.create({ name, address, phone, hoursOpen, hoursClose });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Branch',
    entityId: branch._id,
    action: `יצר סניף ${name}`,
  });
  res.status(201).json(branch);
}));

router.put('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, address, phone, hoursOpen, hoursClose, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (address !== undefined) update.address = address;
  if (phone !== undefined) update.phone = phone;
  if (hoursOpen !== undefined) update.hoursOpen = hoursOpen;
  if (hoursClose !== undefined) update.hoursClose = hoursClose;
  if (isActive !== undefined) update.isActive = isActive;

  const branch = await Branch.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!branch) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Branch',
    entityId: branch._id,
    action: `עדכן סניף ${branch.name}`,
  });
  res.json(branch);
}));

// Rooms sub-resource
router.post('/:id/rooms', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  branch.rooms.push({ name } as never);
  await branch.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Branch',
    entityId: branch._id,
    action: `הוסיף חדר ${name} לסניף ${branch.name}`,
  });
  res.status(201).json(branch);
}));

router.put('/:id/rooms/:roomId', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name } = req.body;
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  const room = branch.rooms.find((r) => String(r._id) === req.params.roomId);
  if (!room) {
    res.status(404).json({ message: 'Room not found' });
    return;
  }
  if (name !== undefined) room.name = name;
  await branch.save();
  res.json(branch);
}));

router.delete('/:id/rooms/:roomId', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  branch.rooms = branch.rooms.filter((r) => String(r._id) !== req.params.roomId) as never;
  await branch.save();
  res.json(branch);
}));

export default router;
