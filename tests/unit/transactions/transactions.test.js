// Unit tests for DDS_TRANSACTIONS.js
// See: docs/shared/DDScope_Modules.md for module contract


import { describe, it, expect, vi } from 'vitest';
import DDS_TRANSACTIONS from '../../../src/DDS_TRANSACTIONS';

describe('DDS_TRANSACTIONS', () => {

  it('begin() should return a transaction id', () => {
    const id = DDS_TRANSACTIONS.begin('test');
    expect(typeof id).toBe('number');
  });

  it('commit() should push to undo stack and clear redo stack', () => {
    const id = DDS_TRANSACTIONS.begin('commit');
    DDS_TRANSACTIONS.commit(id);
    expect(DDS_TRANSACTIONS.canUndo()).toBe(true);
    expect(DDS_TRANSACTIONS.canRedo()).toBe(false);
  });

  it('undo() should move transaction from undo to redo stack', () => {
    const id = DDS_TRANSACTIONS.begin('undo');
    DDS_TRANSACTIONS.commit(id);
    const result = DDS_TRANSACTIONS.undo();
    expect(result).toBe(true);
    expect(DDS_TRANSACTIONS.canUndo()).toBe(false);
    expect(DDS_TRANSACTIONS.canRedo()).toBe(true);
  });

  it('redo() should move transaction from redo to undo stack', () => {
    const id = DDS_TRANSACTIONS.begin('redo');
    DDS_TRANSACTIONS.commit(id);
    DDS_TRANSACTIONS.undo();
    const result = DDS_TRANSACTIONS.redo();
    expect(result).toBe(true);
    expect(DDS_TRANSACTIONS.canUndo()).toBe(true);
    expect(DDS_TRANSACTIONS.canRedo()).toBe(false);
  });

  it('clear() should reset all stacks and state', () => {
    const id = DDS_TRANSACTIONS.begin('clear');
    DDS_TRANSACTIONS.commit(id);
    DDS_TRANSACTIONS.clear();
    expect(DDS_TRANSACTIONS.canUndo()).toBe(false);
    expect(DDS_TRANSACTIONS.canRedo()).toBe(false);
  });

  it('onChange() should register a callback fired on commit/undo/redo/clear', () => {
    const spy = vi.fn();
    DDS_TRANSACTIONS.onChange(spy);
    const id = DDS_TRANSACTIONS.begin('cb');
    DDS_TRANSACTIONS.commit(id);
    DDS_TRANSACTIONS.undo();
    DDS_TRANSACTIONS.redo();
    DDS_TRANSACTIONS.clear();
    expect(spy).toHaveBeenCalled();
    DDS_TRANSACTIONS.onChange(null); // cleanup
  });
});
