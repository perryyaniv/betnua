import { computeWeeklyHours } from './hoursReport';

describe('computeWeeklyHours', () => {
  it('sums durations per teacher+branch', () => {
    const courses = [
      { teacherIds: ['t1'], branchId: 'b1', startTime: '16:00', endTime: '17:00' },
      { teacherIds: ['t1'], branchId: 'b1', startTime: '17:00', endTime: '18:30' },
      { teacherIds: ['t1'], branchId: 'b2', startTime: '16:00', endTime: '17:00' },
    ] as never;

    const rows = computeWeeklyHours(courses);
    const b1Row = rows.find((r) => r.branchId === 'b1');
    const b2Row = rows.find((r) => r.branchId === 'b2');

    expect(b1Row?.weeklyHours).toBeCloseTo(2.5);
    expect(b1Row?.courseCount).toBe(2);
    expect(b2Row?.weeklyHours).toBeCloseTo(1);
  });

  it('returns an empty array for no courses', () => {
    expect(computeWeeklyHours([])).toEqual([]);
  });

  it('credits a co-taught course in full to every listed teacher', () => {
    const courses = [
      { teacherIds: ['t1', 't2'], branchId: 'b1', startTime: '16:00', endTime: '17:00' },
    ] as never;

    const rows = computeWeeklyHours(courses);
    const t1Row = rows.find((r) => r.teacherId === 't1');
    const t2Row = rows.find((r) => r.teacherId === 't2');

    expect(t1Row?.weeklyHours).toBeCloseTo(1);
    expect(t2Row?.weeklyHours).toBeCloseTo(1);
  });
});
