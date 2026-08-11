const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(targetDate: Date, now: Date): number {
  return Math.ceil((targetDate.getTime() - now.getTime()) / DAY_MS);
}

/**
 * An item becomes "due for alert" the moment it's within `thresholdDays` of its target date
 * (including already overdue), and hasn't been alerted yet. Once alerted it stays quiet until
 * something resets lastAlertedAt (e.g. the date is edited) — a single notification per crossing,
 * not a repeating spam loop.
 */
export function isDueForAlert(
  targetDate: Date,
  thresholdDays: number,
  lastAlertedAt: Date | null | undefined,
  now: Date
): boolean {
  if (lastAlertedAt) return false;
  return daysUntil(targetDate, now) <= thresholdDays;
}
