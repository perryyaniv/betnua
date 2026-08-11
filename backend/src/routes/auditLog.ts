import { Router } from 'express';
import AuditLogEntry from '../models/AuditLogEntry';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const { entityType, entityId } = req.query;
  const query: Record<string, unknown> = {};
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  const entries = await AuditLogEntry.find(query).sort({ timestamp: -1 }).limit(500);
  res.json(entries);
}));

export default router;
