import { Router } from 'express';
import Student from '../models/Student';
import Course from '../models/Course';
import Branch from '../models/Branch';
import DropoutReason from '../models/DropoutReason';
import { authenticate, AuthRequest } from '../middleware/auth';
import { accessibleBranchIds } from '../utils/branchAccess';
import { asyncHandler } from '../utils/asyncHandler';
import { filterDropouts, countBy, DropoutRow } from '../services/dropoutReport';

const router = Router();
router.use(authenticate);

router.get('/dropouts', asyncHandler<AuthRequest>(async (req, res) => {
  const accessible = accessibleBranchIds(req.user!);
  const { branchId, courseId, reasonId, dateFrom, dateTo } = req.query;

  const [courses, branches, reasons, students] = await Promise.all([
    Course.find().select('branchId courseTypeId'),
    Branch.find().select('name'),
    DropoutReason.find().select('name'),
    Student.find({ 'enrollments.status': 'פרש' }),
  ]);

  const courseBranch = new Map(courses.map((c) => [String(c._id), String(c.branchId)]));
  const branchName = new Map(branches.map((b) => [String(b._id), b.name]));
  const reasonName = new Map(reasons.map((r) => [String(r._id), r.name]));

  const rows: (DropoutRow & { studentName: string; dropoutNote?: string })[] = [];
  for (const student of students) {
    for (const e of student.enrollments) {
      if (e.status !== 'פרש' || !e.droppedAt) continue;
      const cBranchId = courseBranch.get(String(e.courseId));
      if (!cBranchId) continue;
      if (accessible && !accessible.includes(cBranchId)) continue;
      rows.push({
        branchId: cBranchId,
        courseId: String(e.courseId),
        reasonId: e.dropoutReasonId ? String(e.dropoutReasonId) : null,
        droppedAt: e.droppedAt,
        studentName: student.name,
        dropoutNote: e.dropoutNote,
      });
    }
  }

  const filtered = filterDropouts(rows, {
    branchId: branchId ? String(branchId) : undefined,
    courseId: courseId ? String(courseId) : undefined,
    reasonId: reasonId ? String(reasonId) : undefined,
    dateFrom: dateFrom ? new Date(String(dateFrom)) : undefined,
    dateTo: dateTo ? new Date(String(dateTo)) : undefined,
  });

  res.json({
    total: filtered.length,
    byBranch: Object.fromEntries(
      Object.entries(countBy(filtered, 'branchId')).map(([id, count]) => [branchName.get(id) || id, count])
    ),
    byReason: Object.fromEntries(
      Object.entries(countBy(filtered, 'reasonId')).map(([id, count]) => [reasonName.get(id) || id, count])
    ),
    rows: filtered
      .map((r) => ({
        studentName: r.studentName,
        branchName: branchName.get(r.branchId) || '',
        reasonName: r.reasonId ? reasonName.get(r.reasonId) || '' : '',
        dropoutNote: r.dropoutNote,
        droppedAt: r.droppedAt,
      }))
      .sort((a, b) => b.droppedAt.getTime() - a.droppedAt.getTime()),
  });
}));

export default router;
