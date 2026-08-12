import { Router } from 'express';
import Lead from '../models/Lead';
import Student from '../models/Student';
import Course from '../models/Course';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds, canWriteBranch } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const { branchId, status, source } = req.query;

  const query: Record<string, unknown> = {};
  if (accessible) query.branchId = { $in: accessible };
  if (branchId) query.branchId = branchId;
  if (status) query.status = status;
  if (source) query.source = source;

  const leads = await Lead.find(query).sort({ createdAt: -1 });
  res.json(leads);
}));

router.get('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ message: 'Lead not found' });
    return;
  }
  res.json(lead);
}));

router.post('/', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, phone, branchId, source, notes } = req.body;
  if (!name || !phone || !branchId) {
    res.status(400).json({ message: 'name, phone, branchId required' });
    return;
  }
  if (!canWriteBranch(req.user!, branchId)) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const lead = await Lead.create({ name, phone, branchId, source, notes, createdBy: req.user!.userId });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Lead',
    entityId: lead._id,
    action: `יצר ליד ${name}`,
  });
  res.status(201).json(lead);
}));

router.put('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ message: 'Lead not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(lead.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const { name, phone, source, notes } = req.body;
  if (name !== undefined) lead.name = name;
  if (phone !== undefined) lead.phone = phone;
  if (source !== undefined) lead.source = source;
  if (notes !== undefined) lead.notes = notes;
  await lead.save();
  res.json(lead);
}));

router.patch('/:id/status', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ message: 'Lead not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(lead.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ message: 'status required' });
    return;
  }
  lead.status = status;
  await lead.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Lead',
    entityId: lead._id,
    action: `עדכן סטטוס ליד ${lead.name} ל-${status}`,
  });
  res.json(lead);
}));

router.delete('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ message: 'Lead not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(lead.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  await lead.deleteOne();
  res.json({ message: 'Deleted' });
}));

router.post('/:id/convert', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ message: 'Lead not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(lead.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const { courseId } = req.body;
  if (!courseId) {
    res.status(400).json({ message: 'courseId required' });
    return;
  }
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(400).json({ message: 'Course not found' });
    return;
  }
  const student = await Student.create({
    name: lead.name,
    guardianPhone: lead.phone,
    enrollments: [{ courseId, status: 'פעיל', enrolledAt: new Date() }],
  });
  lead.status = 'נרשם';
  lead.convertedStudentId = student._id;
  await lead.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Lead',
    entityId: lead._id,
    action: `המיר ליד ${lead.name} לתלמיד/ה`,
  });
  res.status(201).json({ lead, student });
}));

export default router;
