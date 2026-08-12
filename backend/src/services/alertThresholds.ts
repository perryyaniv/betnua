const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function daysUntil(targetDate: Date, now: Date): number {
  return Math.ceil((targetDate.getTime() - now.getTime()) / DAY_MS);
}

export function hoursSince(startDate: Date, now: Date): number {
  return (now.getTime() - startDate.getTime()) / HOUR_MS;
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

/**
 * The inverse shape of isDueForAlert: instead of approaching a future deadline, this fires once
 * an item has sat untouched since `startDate` for longer than `thresholdHours` — e.g. a lead
 * still "new" after the SLA window. Same single-notification-per-crossing behavior.
 */
export function isStale(
  startDate: Date,
  thresholdHours: number,
  lastAlertedAt: Date | null | undefined,
  now: Date
): boolean {
  if (lastAlertedAt) return false;
  return hoursSince(startDate, now) >= thresholdHours;
}
