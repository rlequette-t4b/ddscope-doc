import { describe, expect, it } from 'vitest';

describe('unit scaffold', () => {
  it('runs in Node with a window shim', () => {
    expect(globalThis.window).toBeDefined();
  });
});
