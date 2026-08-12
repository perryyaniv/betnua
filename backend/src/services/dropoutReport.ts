export interface DropoutRow {
  branchId: string;
  courseId: string;
  reasonId: string | null;
  droppedAt: Date;
}

export interface DropoutFilter {
  branchId?: string;
  courseId?: string;
  reasonId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function filterDropouts<T extends DropoutRow>(rows: T[], filter: DropoutFilter): T[] {
  return rows.filter((row) => {
    if (filter.branchId && row.branchId !== filter.branchId) return false;
    if (filter.courseId && row.courseId !== filter.courseId) return false;
    if (filter.reasonId && row.reasonId !== filter.reasonId) return false;
    if (filter.dateFrom && row.droppedAt < filter.dateFrom) return false;
    if (filter.dateTo && row.droppedAt > filter.dateTo) return false;
    return true;
  });
}

type GroupKey = 'branchId' | 'courseId' | 'reasonId';

/** Counts filtered dropout rows by one dimension, e.g. how many per branch. */
export function countBy(rows: DropoutRow[], key: GroupKey): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = row[key] ?? 'ללא_סיבה';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
