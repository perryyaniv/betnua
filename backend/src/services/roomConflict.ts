import { ICourse } from '../models/Course';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

export interface ConflictCandidate {
  branchId: string;
  roomName: string;
  seasonId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Returns the first course among `existing` that conflicts with `candidate`
 * (same branch, room, season, day-of-week, and overlapping time range), or null.
 * Callers should exclude the course being edited from `existing`.
 */
export function findRoomConflict(
  existing: Pick<ICourse, '_id' | 'branchId' | 'roomName' | 'seasonId' | 'dayOfWeek' | 'startTime' | 'endTime'>[],
  candidate: ConflictCandidate
) {
  return (
    existing.find(
      (c) =>
        String(c.branchId) === String(candidate.branchId) &&
        c.roomName === candidate.roomName &&
        String(c.seasonId) === String(candidate.seasonId) &&
        c.dayOfWeek === candidate.dayOfWeek &&
        timeRangesOverlap(c.startTime, c.endTime, candidate.startTime, candidate.endTime)
    ) || null
  );
}
