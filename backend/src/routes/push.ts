import { Router } from 'express';
import PushSubscription from '../models/PushSubscription';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.use(authenticate);

router.post('/subscribe', asyncHandler<AuthRequest>(async (req, res) => {
  const { endpoint, keys, deviceLabel } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ message: 'endpoint and keys required' });
    return;
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId: req.user!.userId, endpoint, keys, deviceLabel },
    { upsert: true, new: true }
  );
  res.status(201).json({ message: 'Subscribed' });
}));

router.delete('/subscribe', asyncHandler<AuthRequest>(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ message: 'endpoint required' });
    return;
  }
  await PushSubscription.deleteOne({ endpoint, userId: req.user!.userId });
  res.json({ message: 'Unsubscribed' });
}));

export default router;
