import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', asyncHandler<Request>(async (req, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: 'Username and password required' });
    return;
  }
  const user = await User.findOne({ username: username.toLowerCase(), active: true });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign(
    { userId: user._id, name: user.name, role: user.role, branchIds: user.branchIds.map(String) },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '30d' }
  );
  res.json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      branchIds: user.branchIds,
      forcePasswordChange: user.forcePasswordChange,
    },
  });
}));

router.post('/change-password', authenticate, asyncHandler<AuthRequest>(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  user.password = newPassword;
  user.forcePasswordChange = false;
  await user.save();
  res.json({ message: 'Password changed successfully' });
}));

router.get('/me', authenticate, asyncHandler<AuthRequest>(async (req, res) => {
  const user = await User.findById(req.user!.userId).select('-password');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
}));

export default router;
