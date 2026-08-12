import { filterDropouts, countBy, DropoutRow } from './dropoutReport';

const rows: DropoutRow[] = [
  { branchId: 'b1', courseId: 'c1', reasonId: 'r1', droppedAt: new Date('2026-06-01') },
  { branchId: 'b1', courseId: 'c1', reasonId: 'r2', droppedAt: new Date('2026-07-01') },
  { branchId: 'b1', courseId: 'c2', reasonId: 'r1', droppedAt: new Date('2026-07-15') },
  { branchId: 'b2', courseId: 'c3', reasonId: null, droppedAt: new Date('2026-08-01') },
];

describe('filterDropouts', () => {
  it('returns all rows with no filter', () => {
    expect(filterDropouts(rows, {})).toHaveLength(4);
  });

  it('filters by branch', () => {
    expect(filterDropouts(rows, { branchId: 'b1' })).toHaveLength(3);
  });

  it('filters by course', () => {
    expect(filterDropouts(rows, { courseId: 'c1' })).toHaveLength(2);
  });

  it('filters by reason', () => {
    expect(filterDropouts(rows, { reasonId: 'r1' })).toHaveLength(2);
  });

  it('filters by date range', () => {
    const filtered = filterDropouts(rows, { dateFrom: new Date('2026-07-01'), dateTo: new Date('2026-07-31') });
    expect(filtered).toHaveLength(2);
  });
});

describe('countBy', () => {
  it('counts by branch', () => {
    expect(countBy(rows, 'branchId')).toEqual({ b1: 3, b2: 1 });
  });

  it('counts by course', () => {
    expect(countBy(rows, 'courseId')).toEqual({ c1: 2, c2: 1, c3: 1 });
  });

  it('groups missing reason under a fallback key', () => {
    expect(countBy(rows, 'reasonId')).toEqual({ r1: 2, r2: 1, 'ללא_סיבה': 1 });
  });
});
