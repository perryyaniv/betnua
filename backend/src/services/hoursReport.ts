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

/** Sums weekly hours per teacher (optionally further split per branch) from a flat list of active courses.
 * A co-taught course (multiple teacherIds) counts in full toward each of its teachers. */
export function computeWeeklyHours(
  courses: Pick<ICourse, 'teacherIds' | 'branchId' | 'startTime' | 'endTime'>[]
): TeacherHoursRow[] {
  const byKey = new Map<string, TeacherHoursRow>();
  for (const course of courses) {
    const branchId = String(course.branchId);
    const hours = durationHours(course.startTime, course.endTime);
    for (const rawTeacherId of course.teacherIds) {
      const teacherId = String(rawTeacherId);
      const key = `${teacherId}:${branchId}`;
      const row = byKey.get(key) || { teacherId, branchId, weeklyHours: 0, courseCount: 0 };
      row.weeklyHours += hours;
      row.courseCount += 1;
      byKey.set(key, row);
    }
  }
  return Array.from(byKey.values());
}
