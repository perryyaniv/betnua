import { Router } from 'express';
import User from '../models/User';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler<AuthRequest>(async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
}));

router.post('/', asyncHandler<AuthRequest>(async (req, res) => {
  const { name, username, password, role, branchIds } = req.body;
  if (!name || !username || !password || !role) {
    res.status(400).json({ message: 'name, username, password, role required' });
    return;
  }
  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    res.status(409).json({ message: 'Username already exists' });
    return;
  }
  const user = await User.create({
    name,
    username,
    password,
    role,
    branchIds: branchIds || [],
    forcePasswordChange: true,
  });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'User',
    entityId: user._id,
    action: `יצר משתמש ${name}`,
  });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    branchIds: user.branchIds,
    active: user.active,
    forcePasswordChange: user.forcePasswordChange,
  });
}));

router.put('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  const { role, active, branchIds, name } = req.body;
  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (active !== undefined) update.active = active;
  if (branchIds !== undefined) update.branchIds = branchIds;
  if (name !== undefined) update.name = name;

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-password');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'User',
    entityId: user._id,
    action: `עדכן משתמש ${user.name}`,
  });
  res.json(user);
}));

router.delete('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  if (req.params.id === req.user!.userId) {
    res.status(400).json({ message: 'לא ניתן למחוק את המשתמש המחובר' });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      res.status(400).json({ message: 'לא ניתן למחוק את המנהל האחרון במערכת' });
      return;
    }
  }
  await user.deleteOne();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'User',
    entityId: user._id,
    action: `מחק משתמש ${user.name}`,
  });
  res.json({ message: 'Deleted' });
}));

router.post('/:id/reset-password', asyncHandler<AuthRequest>(async (req, res) => {
  const { tempPassword } = req.body;
  if (!tempPassword) {
    res.status(400).json({ message: 'tempPassword required' });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  user.password = tempPassword;
  user.forcePasswordChange = true;
  await user.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'User',
    entityId: user._id,
    action: `אפס סיסמה למשתמש ${user.name}`,
  });
  res.json({ message: 'Password reset' });
}));

export default router;
