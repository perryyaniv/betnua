import { Router } from 'express';
import mongoose from 'mongoose';
import Student from '../models/Student';
import Course from '../models/Course';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds, canWriteBranch } from '../utils/branchAccess';
import { logAudit } from '../utils/auditLogger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

async function courseBranchMap(): Promise<Map<string, string>> {
  const courses = await Course.find().select('branchId');
  return new Map(courses.map((c) => [String(c._id), String(c.branchId)]));
}

router.get('/', asyncHandler<AuthRequest>(async (req, res) => {
  const { courseId, status } = req.query;
  const accessible = accessibleBranchIds(req.user!);
  const branchByCourse = await courseBranchMap();

  const query: Record<string, unknown> = {};
  if (courseId) query['enrollments.courseId'] = courseId;
  if (status) query['enrollments.status'] = status;

  let students = await Student.find(query).sort({ name: 1 });

  if (accessible) {
    students = students.filter((s) =>
      s.enrollments.some((e) => accessible.includes(branchByCourse.get(String(e.courseId)) || ''))
    );
  }

  res.json(students);
}));

router.get('/:id', asyncHandler<AuthRequest>(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return;
  }
  res.json(student);
}));

router.post('/', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const { name, guardianPhone, courseId } = req.body;
  if (!name || !courseId) {
    res.status(400).json({ message: 'name and an initial courseId are required' });
    return;
  }
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(400).json({ message: 'Course not found' });
    return;
  }
  if (!canWriteBranch(req.user!, String(course.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const student = await Student.create({
    name,
    guardianPhone,
    enrollments: [{ courseId, status: 'פעיל', enrolledAt: new Date() }],
  });
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Student',
    entityId: student._id,
    action: `יצר תלמיד/ה ${name}`,
  });
  res.status(201).json(student);
}));

router.put('/:id', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return;
  }
  const branchByCourse = await courseBranchMap();
  const studentBranches = student.enrollments.map((e) => branchByCourse.get(String(e.courseId)) || '');
  if (!studentBranches.some((b) => canWriteBranch(req.user!, b))) {
    res.status(403).json({ message: 'Forbidden for this student' });
    return;
  }
  const { name, guardianPhone } = req.body;
  if (name !== undefined) student.name = name;
  if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
  await student.save();
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Student',
    entityId: student._id,
    action: `עדכן תלמיד/ה ${student.name}`,
  });
  res.json(student);
}));

router.delete('/:id', requireRole('admin'), asyncHandler<AuthRequest>(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return;
  }
  await logAudit({
    userId: req.user!.userId,
    userName: req.user!.name,
    entityType: 'Student',
    entityId: student._id,
    action: `מחק תלמיד/ה ${student.name}`,
  });
  res.json({ message: 'Deleted' });
}));

// --- Enrollments sub-resource ---

router.post('/:id/enrollments', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
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
  if (!canWriteBranch(req.user!, String(course.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return;
  }
  student.enrollments.push({
    courseId: new mongoose.Types.ObjectId(courseId),
    status: 'פעיל',
    enrolledAt: new Date(),
  } as never);
  await student.save();
  res.status(201).json(student);
}));

router.patch('/:id/enrollments/:enrollmentId', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return;
  }
  const enrollment = student.enrollments.find((e) => String(e._id) === req.params.enrollmentId);
  if (!enrollment) {
    res.status(404).json({ message: 'Enrollment not found' });
    return;
  }
  const course = await Course.findById(enrollment.courseId);
  if (!course || !canWriteBranch(req.user!, String(course.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }

  const { status, dropoutReasonId, dropoutNote } = req.body;
  if (status === 'פרש') {
    enrollment.status = 'פרש';
    enrollment.droppedAt = new Date();
    enrollment.dropoutReasonId = dropoutReasonId ? new mongoose.Types.ObjectId(dropoutReasonId) : null;
    enrollment.dropoutNote = dropoutNote || '';
    await logAudit({
      userId: req.user!.userId,
      userName: req.user!.name,
      entityType: 'Student',
      entityId: student._id,
      action: `סימן פרישה עבור ${student.name}`,
    });
  } else if (status === 'פעיל') {
    enrollment.status = 'פעיל';
    enrollment.droppedAt = null;
    enrollment.dropoutReasonId = null;
    enrollment.dropoutNote = '';
  }
  await student.save();
  res.json(student);
}));

router.delete('/:id/enrollments/:enrollmentId', requireRole('admin', 'editor'), asyncHandler<AuthRequest>(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return;
  }
  const enrollment = student.enrollments.find((e) => String(e._id) === req.params.enrollmentId);
  if (!enrollment) {
    res.status(404).json({ message: 'Enrollment not found' });
    return;
  }
  const course = await Course.findById(enrollment.courseId);
  if (!course || !canWriteBranch(req.user!, String(course.branchId))) {
    res.status(403).json({ message: 'Forbidden for this branch' });
    return;
  }
  student.enrollments = student.enrollments.filter((e) => String(e._id) !== req.params.enrollmentId) as never;
  await student.save();
  res.json(student);
}));

export default router;
