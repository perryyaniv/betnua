const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function daysUntil(target: string | Date): number {
  return Math.ceil((new Date(target).getTime() - Date.now()) / DAY_MS);
}

export function isWithinThreshold(target: string | Date, thresholdDays: number): boolean {
  return daysUntil(target) <= thresholdDays;
}

export function hoursSince(start: string | Date): number {
  return (Date.now() - new Date(start).getTime()) / HOUR_MS;
}

export function isPastSlaHours(start: string | Date, thresholdHours: number): boolean {
  return hoursSince(start) >= thresholdHours;
}
