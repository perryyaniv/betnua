import { daysUntil, isDueForAlert } from './alertThresholds';

describe('daysUntil', () => {
  it('returns 0 for the exact same instant', () => {
    const now = new Date('2026-08-11T08:00:00Z');
    expect(daysUntil(now, now)).toBe(0);
  });

  it('rounds a same-day-but-later time up to 1', () => {
    const now = new Date('2026-08-11T08:00:00Z');
    const target = new Date('2026-08-11T20:00:00Z');
    expect(daysUntil(target, now)).toBe(1);
  });

  it('returns a negative number for a date already in the past', () => {
    const now = new Date('2026-08-11T00:00:00Z');
    const target = new Date('2026-08-01T00:00:00Z');
    expect(daysUntil(target, now)).toBeLessThan(0);
  });
});

describe('isDueForAlert', () => {
  const now = new Date('2026-08-11T00:00:00Z');

  it('fires when the target date is within the threshold window', () => {
    const target = new Date('2026-08-15T00:00:00Z'); // 4 days out
    expect(isDueForAlert(target, 14, null, now)).toBe(true);
  });

  it('does not fire when the target date is further away than the threshold', () => {
    const target = new Date('2026-09-15T00:00:00Z'); // ~35 days out
    expect(isDueForAlert(target, 14, null, now)).toBe(false);
  });

  it('fires for an already-overdue date', () => {
    const target = new Date('2026-08-01T00:00:00Z');
    expect(isDueForAlert(target, 14, null, now)).toBe(true);
  });

  it('does not re-fire once already alerted, even if still within threshold', () => {
    const target = new Date('2026-08-12T00:00:00Z');
    const lastAlertedAt = new Date('2026-08-10T00:00:00Z');
    expect(isDueForAlert(target, 14, lastAlertedAt, now)).toBe(false);
  });
});
