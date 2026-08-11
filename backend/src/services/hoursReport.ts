import { ICourse } from '../models/Course';

function durationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export interface TeacherHoursRow {
  teacherId: string;
  branchId: string;
  weeklyHours: number;
  courseCount: number;
}

/** Sums weekly hours per teacher (optionally further split per branch) from a flat list of active courses. */
export function computeWeeklyHours(
  courses: Pick<ICourse, 'teacherId' | 'branchId' | 'startTime' | 'endTime'>[]
): TeacherHoursRow[] {
  const byKey = new Map<string, TeacherHoursRow>();
  for (const course of courses) {
    const teacherId = String(course.teacherId);
    const branchId = String(course.branchId);
    const key = `${teacherId}:${branchId}`;
    const hours = durationHours(course.startTime, course.endTime);
    const row = byKey.get(key) || { teacherId, branchId, weeklyHours: 0, courseCount: 0 };
    row.weeklyHours += hours;
    row.courseCount += 1;
    byKey.set(key, row);
  }
  return Array.from(byKey.values());
}
