import { Router } from 'express';
import Teacher from '../models/Teacher';
import Course from '../models/Course';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds, isAdmin } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';
import { computeWeeklyHours } from '../services/hoursReport';

const router = Router();
router.use(authenticate);

function assertBranchIdsAllowed(user: AuthRequest['user'], branchIds: string[]) {
  if (isAdmin(user!)) return true;
  return branchIds.every((id) => user!.branchIds.includes(String(id)));
}

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const query = accessible ? { branchIds: { $in: accessible } } : {};
  const teachers = await Teacher.find(query).sort({ name: 1 });
  res.json(teachers);
}));

router.get('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    res.status(404).json({ message: 'Teacher not found' });
    return;
  }
  res.json(teacher);
}));

router.get('/:id/hours-report', asyncHandler<AuthRequest>(async (req, res) => {
  const courses = await Course.find({ teacherIds: req.params.id, isActive: true });
  const rows = computeWeeklyHours(courses);
  res.json(rows);
}));

router.post('/', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, phone, email, photoUrl, bio, specialtyCourseTypeIds, branchIds } = req.body;
  if (!name) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  if (!assertBranchIdsAllowed(req.user, branchIds || [])) {
    res.status(403).json({ message: 'Forbidden for one or more branches' });
    return;
  }
  const teacher = await Teacher.create({
    name,
    phone,
    email,
    photoUrl,
    bio,
    specialtyCourseTypeIds: specialtyCourseTypeIds || [],
    branchIds: branchIds || [],
  });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Teacher',
    entityId: teacher._id,
    action: `יצר מורה ${name}`,
  });
  res.status(201).json(teacher);
}));

router.put('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, phone, email, photoUrl, bio, specialtyCourseTypeIds, branchIds, isActive } = req.body;
  if (branchIds !== undefined && !assertBranchIdsAllowed(req.user, branchIds)) {
    res.status(403).json({ message: 'Forbidden for one or more branches' });
    return;
  }
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (email !== undefined) update.email = email;
  if (photoUrl !== undefined) update.photoUrl = photoUrl;
  if (bio !== undefined) update.bio = bio;
  if (specialtyCourseTypeIds !== undefined) update.specialtyCourseTypeIds = specialtyCourseTypeIds;
  if (branchIds !== undefined) update.branchIds = branchIds;
  if (isActive !== undefined) update.isActive = isActive;

  const teacher = await Teacher.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!teacher) {
    res.status(404).json({ message: 'Teacher not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Teacher',
    entityId: teacher._id,
    action: `עדכן מורה ${teacher.name}`,
  });
  res.json(teacher);
}));

router.delete('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const inUse = await Course.exists({ teacherIds: req.params.id });
  if (inUse) {
    res.status(400).json({ message: 'בשימוש - לא ניתן למחוק' });
    return;
  }
  const teacher = await Teacher.findByIdAndDelete(req.params.id);
  if (!teacher) {
    res.status(404).json({ message: 'Teacher not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Teacher',
    entityId: teacher._id,
    action: `מחק מורה ${teacher.name}`,
  });
  res.json({ message: 'Deleted' });
}));

export default router;
