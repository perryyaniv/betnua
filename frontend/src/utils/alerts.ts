const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(target: string | Date): number {
  return Math.ceil((new Date(target).getTime() - Date.now()) / DAY_MS);
}

export function isWithinThreshold(target: string | Date, thresholdDays: number): boolean {
  return daysUntil(target) <= thresholdDays;
}
