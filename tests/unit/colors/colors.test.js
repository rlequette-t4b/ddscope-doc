import { describe, expect, it } from 'vitest';
import DDS_COLORS from '../../../src/DDS_COLORS.js';

describe('DDS_COLORS palette', () => {
  it('exposes exactly 8 colors', () => {
    expect(Array.isArray(DDS_COLORS)).toBe(true);
    expect(DDS_COLORS).toHaveLength(8);
  });

  it('contains only hex color values', () => {
    var hexColor = /^#[0-9a-f]{6}$/i;
    expect(DDS_COLORS.every(function (color) { return hexColor.test(color); })).toBe(true);
  });

  it('keeps the expected first and last palette entries', () => {
    expect(DDS_COLORS[0]).toBe('#e53935');
    expect(DDS_COLORS[7]).toBe('#6d4c41');
  });
});
