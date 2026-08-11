import { timeRangesOverlap, findRoomConflict } from './roomConflict';

describe('timeRangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(timeRangesOverlap('16:00', '17:00', '16:30', '17:30')).toBe(true);
  });

  it('treats back-to-back ranges as non-overlapping', () => {
    expect(timeRangesOverlap('16:00', '17:00', '17:00', '18:00')).toBe(false);
  });

  it('detects no overlap for clearly separate ranges', () => {
    expect(timeRangesOverlap('16:00', '17:00', '18:00', '19:00')).toBe(false);
  });
});

describe('findRoomConflict', () => {
  const base = {
    _id: 'a',
    branchId: 'branch-1',
    roomName: 'אולם 1',
    seasonId: 'season-1',
    dayOfWeek: 1,
    startTime: '16:00',
    endTime: '17:00',
  } as never;

  it('finds a conflict for the same branch/room/season/day with overlapping time', () => {
    const candidate = { branchId: 'branch-1', roomName: 'אולם 1', seasonId: 'season-1', dayOfWeek: 1, startTime: '16:30', endTime: '17:30' };
    expect(findRoomConflict([base], candidate)).toBe(base);
  });

  it('ignores a different room', () => {
    const candidate = { branchId: 'branch-1', roomName: 'אולם 2', seasonId: 'season-1', dayOfWeek: 1, startTime: '16:30', endTime: '17:30' };
    expect(findRoomConflict([base], candidate)).toBeNull();
  });

  it('ignores a different branch', () => {
    const candidate = { branchId: 'branch-2', roomName: 'אולם 1', seasonId: 'season-1', dayOfWeek: 1, startTime: '16:30', endTime: '17:30' };
    expect(findRoomConflict([base], candidate)).toBeNull();
  });

  it('ignores non-overlapping times in the same room', () => {
    const candidate = { branchId: 'branch-1', roomName: 'אולם 1', seasonId: 'season-1', dayOfWeek: 1, startTime: '17:00', endTime: '18:00' };
    expect(findRoomConflict([base], candidate)).toBeNull();
  });
});
