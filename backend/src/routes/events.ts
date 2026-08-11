import { Router } from 'express';
import Event from '../models/Event';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds, canWriteBranch } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const { branchId, eventType, status, dateFrom, dateTo, assigneeId } = req.query;

  const query: Record<string, unknown> = {};
  if (accessible) query.branchId = { $in: [...accessible, null] };
  if (branchId) query.branchId = branchId;
  if (eventType) query.eventType = eventType;
  if (status) query.status = status;
  if (assigneeId) query['tasks.assigneeId'] = assigneeId;
  if (dateFrom || dateTo) {
    query.eventDate = {
      ...(dateFrom ? { $gte: new Date(String(dateFrom)) } : {}),
      ...(dateTo ? { $lte: new Date(String(dateTo)) } : {}),
    };
  }

  const events = await Event.find(query).sort({ prepareDate: 1 });
  res.json(events);
}));

router.get('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }
  res.json(event);
}));

router.post('/', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { title, description, branchId, eventType, eventDate, prepareDate } = req.body;
  if (!title || !eventDate || !prepareDate) {
    res.status(400).json({ message: 'title, eventDate, prepareDate required' });
    return;
  }
  if (!canWriteBranch(req.user!, branchId)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const event = await Event.create({
    title,
    description,
    branchId: branchId || null,
    eventType,
    eventDate,
    prepareDate,
    addedBy: req.user!.userId,
  });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Event',
    entityId: event._id,
    action: `יצר אירוע ${title}`,
  });
  res.status(201).json(event);
}));

router.put('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }
  if (!canWriteBranch(req.user!, event.branchId ? String(event.branchId) : null)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const { title, description, eventType, eventDate, prepareDate, status } = req.body;
  if (title !== undefined) event.title = title;
  if (description !== undefined) event.description = description;
  if (eventType !== undefined) event.eventType = eventType;
  if (eventDate !== undefined) event.eventDate = eventDate;
  if (status !== undefined) event.status = status;
  if (prepareDate !== undefined && new Date(prepareDate).getTime() !== event.prepareDate.getTime()) {
    event.prepareDate = prepareDate;
    event.lastAlertedAt = null; // re-arm the alert for the new date
  }
  await event.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Event',
    entityId: event._id,
    action: `עדכן אירוע ${event.title}`,
  });
  res.json(event);
}));

router.delete('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }
  if (!canWriteBranch(req.user!, event.branchId ? String(event.branchId) : null)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  await event.deleteOne();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Event',
    entityId: event._id,
    action: `מחק אירוע ${event.title}`,
  });
  res.json({ message: 'Deleted' });
}));

// --- Tasks sub-resource (embedded in the event document) ---

router.post('/:id/tasks', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }
  if (!canWriteBranch(req.user!, event.branchId ? String(event.branchId) : null)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const { title, assigneeId, dueDate } = req.body;
  if (!title) {
    res.status(400).json({ message: 'title required' });
    return;
  }
  event.tasks.push({ title, assigneeId: assigneeId || null, dueDate: dueDate || null } as never);
  await event.save();
  res.status(201).json(event);
}));

router.put('/:id/tasks/:taskId', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }
  if (!canWriteBranch(req.user!, event.branchId ? String(event.branchId) : null)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const task = event.tasks.find((t) => String(t._id) === req.params.taskId);
  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }
  const { title, status, assigneeId, dueDate } = req.body;
  if (title !== undefined) task.title = title;
  if (status !== undefined) task.status = status;
  if (assigneeId !== undefined) task.assigneeId = assigneeId;
  if (dueDate !== undefined) {
    const changed = !task.dueDate || new Date(dueDate).getTime() !== new Date(task.dueDate).getTime();
    task.dueDate = dueDate;
    if (changed) task.lastAlertedAt = null;
  }
  await event.save();
  res.json(event);
}));

router.delete('/:id/tasks/:taskId', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }
  if (!canWriteBranch(req.user!, event.branchId ? String(event.branchId) : null)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  event.tasks = event.tasks.filter((t) => String(t._id) !== req.params.taskId) as never;
  await event.save();
  res.json(event);
}));

export default router;
