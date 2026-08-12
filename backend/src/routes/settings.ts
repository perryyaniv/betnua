import { Router } from 'express';
import AppSettings from '../models/AppSettings';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

async function getOrCreateSettings() {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({});
  return settings;
}

// Read is available to any authenticated role: dashboards for editors/viewers need the
// thresholds to compute their own "needs attention" badges, not just admins.
router.get('/', asyncHandler<AuthRequest>(async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
}));

router.put('/', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const { eventPrepareAlertThresholdDays, taskDueAlertThresholdDays, leadSlaThresholdHours } = req.body;
  const settings = await getOrCreateSettings();
  if (eventPrepareAlertThresholdDays !== undefined) settings.eventPrepareAlertThresholdDays = eventPrepareAlertThresholdDays;
  if (taskDueAlertThresholdDays !== undefined) settings.taskDueAlertThresholdDays = taskDueAlertThresholdDays;
  if (leadSlaThresholdHours !== undefined) settings.leadSlaThresholdHours = leadSlaThresholdHours;
  await settings.save();
  res.json(settings);
}));

export default router;
