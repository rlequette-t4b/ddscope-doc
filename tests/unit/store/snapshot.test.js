import { describe, it, expect, beforeEach } from 'vitest';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_STORE delta/restore', () => {
  let deltas;

  beforeEach(() => {
    DDS_STORE.newProject('Delta test', 'Test delta/restore', 'vitest');
  });

  it(`cannot snapshot when snapshot in progress`, () => {
    DDS_STORE.beginSnapshot();
    expect(() => DDS_STORE.beginSnapshot()).toThrow();
    DDS_STORE.endSnapshot();
  });

  it('can rollback when no snapshot in progress', () => {
    DDS_STORE.rollbackSnapshot();
  })

  it('restore store with a rollback', () => {

    DDS_STORE.beginSnapshot();

    // no nodes at start
    expect(DDS_STORE.query('nodes')).toHaveLength(0);

    // inseet a node
    DDS_STORE.insert('nodes', { name: 'A'});
    expect(DDS_STORE.query('nodes')).toHaveLength(1);

    // rollback the currenr snapshot, which should remove the inserted node
    DDS_STORE.rollbackSnapshot();
    expect(DDS_STORE.query('nodes')).toHaveLength(0);
  });
});
