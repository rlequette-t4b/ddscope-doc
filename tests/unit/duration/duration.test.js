import { describe, expect, it } from 'vitest';

// ============================================================
// DDS_DURATION — test scope from DDScope_Modules.md
// toHours:   all 5 units; zero; NaN; unknown unit → 0
// compare:   h1 > h2; h1 < h2; h1 == h2 (tie → first argument wins)
// toDisplay: singular (v=1); plural (v>1); zero; unknown unit → ''
// ============================================================

describe('DDS_DURATION.toHours', () => {
  it('converts hours', () => {
    expect(DDS_DURATION.toHours(3, 'hours')).toBe(3);
  });

  it('converts days', () => {
    expect(DDS_DURATION.toHours(2, 'days')).toBe(48);
  });

  it('converts weeks', () => {
    expect(DDS_DURATION.toHours(1, 'weeks')).toBe(168);
  });

  it('converts months', () => {
    expect(DDS_DURATION.toHours(1, 'months')).toBe(720);
  });

  it('converts years', () => {
    expect(DDS_DURATION.toHours(1, 'years')).toBe(8760);
  });

  it('returns 0 for zero value', () => {
    expect(DDS_DURATION.toHours(0, 'days')).toBe(0);
  });

  it('returns 0 for NaN value', () => {
    expect(DDS_DURATION.toHours(NaN, 'days')).toBe(0);
  });

  it('returns 0 for unknown unit', () => {
    expect(DDS_DURATION.toHours(5, 'fortnights')).toBe(0);
  });
});

describe('DDS_DURATION.compare', () => {
  it('returns first when h1 > h2', () => {
    expect(DDS_DURATION.compare(2, 'weeks', 3, 'days')).toEqual({ value: 2, unit: 'weeks' });
  });

  it('returns second when h1 < h2', () => {
    expect(DDS_DURATION.compare(1, 'days', 1, 'weeks')).toEqual({ value: 1, unit: 'weeks' });
  });

  it('returns first on tie (h1 == h2)', () => {
    expect(DDS_DURATION.compare(24, 'hours', 1, 'days')).toEqual({ value: 24, unit: 'hours' });
  });
});

describe('DDS_DURATION.toDisplay', () => {
  it('uses singular form when value is 1', () => {
    expect(DDS_DURATION.toDisplay(1, 'days')).toBe('1 day');
  });

  it('uses singular for weeks', () => {
    expect(DDS_DURATION.toDisplay(1, 'weeks')).toBe('1 week');
  });

  it('uses plural form when value > 1', () => {
    expect(DDS_DURATION.toDisplay(3, 'weeks')).toBe('3 weeks');
  });

  it('returns string with zero value', () => {
    expect(DDS_DURATION.toDisplay(0, 'days')).toBe('0 days');
  });

  it('returns empty string for unknown unit', () => {
    expect(DDS_DURATION.toDisplay(null, 'days')).toBe('');
  });
});
