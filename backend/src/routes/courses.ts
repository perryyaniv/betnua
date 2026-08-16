import { Router } from 'express';
import Course from '../models/Course';
import Branch from '../models/Branch';
import Student from '../models/Student';
import Troupe from '../models/Troupe';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds, canWriteBranch } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';
import { findRoomConflict } from '../services/roomConflict';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const { branchId, teacherId, courseTypeId, seasonId, dayOfWeek, isActive, troupeId, isOpen, ageCategory } = req.query;

  const query: Record<string, unknown> = {};
  if (accessible) query.branchId = { $in: accessible };
  if (branchId) query.branchId = branchId;
  if (teacherId) query.teacherIds = teacherId;
  if (courseTypeId) query.courseTypeId = courseTypeId;
  if (seasonId) query.seasonId = seasonId;
  if (dayOfWeek !== undefined) query.dayOfWeek = Number(dayOfWeek);
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (troupeId) query.$or = [{ troupeId }, { mandatoryForTroupeIds: troupeId }];
  if (isOpen !== undefined) query.isOpen = isOpen === 'true';
  if (ageCategory) query.ageCategory = ageCategory;

  const courses = await Course.find(query).sort({ dayOfWeek: 1, startTime: 1 });

  const activeStudents = await Student.find({ 'enrollments.status': 'פעיל' }).select('enrollments');
  const enrolledCount = new Map<string, number>();
  for (const student of activeStudents) {
    for (const e of student.enrollments) {
      if (e.status !== 'פעיל') continue;
      const key = String(e.courseId);
      enrolledCount.set(key, (enrolledCount.get(key) || 0) + 1);
    }
  }

  res.json(courses.map((c) => ({ ...c.toObject(), enrolledCount: enrolledCount.get(String(c._id)) || 0 })));
}));

async function validateCourse(req: AuthRequest, excludeId?: string) {
  const { branchId, roomName, seasonId, dayOfWeek, startTime, endTime, troupeId, mandatoryForTroupeIds } = req.body;

  if (!canWriteBranch(req.user!, branchId)) {
    return { error: { status: 403, message: 'Forbidden for this branch' } };
  }

  const branch = await Branch.findById(branchId);
  if (!branch) return { error: { status: 400, message: 'Branch not found' } };
  if (!branch.rooms.some((r) => r.name === roomName)) {
    return { error: { status: 400, message: 'roomName is not a defined room for this branch' } };
  }

  if (troupeId) {
    const troupe = await Troupe.findById(troupeId);
    if (!troupe) return { error: { status: 400, message: 'Troupe not found' } };
  }
  if (mandatoryForTroupeIds?.length) {
    const count = await Troupe.countDocuments({ _id: { $in: mandatoryForTroupeIds } });
    if (count !== mandatoryForTroupeIds.length) {
      return { error: { status: 400, message: 'One or more mandatoryForTroupeIds not found' } };
    }
  }

  const others = await Course.find({
    branchId,
    roomName,
    seasonId,
    dayOfWeek,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  const conflict = findRoomConflict(others, { branchId, roomName, seasonId, dayOfWeek, startTime, endTime });
  if (conflict) {
    return { error: { status: 409, message: 'התנגשות חדרים: יש חוג חופף באותו חדר וזמן', conflict } };
  }
  return { error: null };
}

router.post('/', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { error } = await validateCourse(req);
  if (error) {
    res.status(error.status).json(error);
    return;
  }
  const course = await Course.create(req.body);
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Course',
    entityId: course._id,
    action: 'יצר חוג',
  });
  res.status(201).json(course);
}));

router.put('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const existing = await Course.findById(req.params.id);
  if (!existing) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(existing.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }

  const merged = { ...existing.toObject(), ...req.body };
  const { error } = await validateCourse({ ...req, body: merged } as AuthRequest, req.params.id);
  if (error) {
    res.status(error.status).json(error);
    return;
  }

  Object.assign(existing, req.body);
  await existing.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Course',
    entityId: existing._id,
    action: 'עדכן חוג',
  });
  res.json(existing);
}));

router.delete('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(course.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  await course.deleteOne();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Course',
    entityId: course._id,
    action: 'מחק חוג',
  });
  res.json({ message: 'Deleted' });
}));

export default router;
