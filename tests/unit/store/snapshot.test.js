import { describe, it, expect, beforeEach } from 'vitest';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_STORE snapshots', () => {
  let deltas;

  beforeEach(() => {
    DDS_STORE.newProject('Snapshot test', 'Test snapshot/restore', 'vitest');
  });

  it(`cannot snapshot when snapshot in progress`, () => {
    DDS_STORE.beginSnapshot();
    expect(() => DDS_STORE.beginSnapshot()).toThrow();
    DDS_STORE.endSnapshot();
  });

  it('can rollback when no snapshot in progress', () => {
    DDS_STORE.rollbackSnapshot();
  });

  it('restore store with a rollback', () => {

    DDS_STORE.beginSnapshot();

    // no nodes at start
    expect(DDS_STORE.query('nodes')).toHaveLength(0);

    // insert a node
    DDS_STORE.insert('nodes', { name: 'A'});
    expect(DDS_STORE.query('nodes')).toHaveLength(1);

    // rollback the current snapshot, which should remove the inserted node
    DDS_STORE.rollbackSnapshot();
    expect(DDS_STORE.query('nodes')).toHaveLength(0);
  });

  it('perform undo/redo for one node', () => {
    
      DDS_STORE.beginSnapshot();

      // no nodes at start
      expect(DDS_STORE.query('nodes')).toHaveLength(0);

      // insert a node and commit
      DDS_STORE.insert('nodes', { name: 'A'});

      var snapshot = DDS_STORE.endSnapshot();

      expect(DDS_STORE.query('nodes')).toHaveLength(1);

      // undo the snapshot, which should remove the inserted node
      var revsnapshot = DDS_STORE.restoreSnapshot(snapshot);

      expect(DDS_STORE.query('nodes')).toHaveLength(0);

      // redo the snapshot, which should add back the inserted node
      var revsnapshot2 = DDS_STORE.restoreSnapshot(revsnapshot);
      expect(DDS_STORE.query('nodes')).toHaveLength(1);

      // check that the node is the same after undo/redo
      expect(DDS_STORE.query('nodes')[0].name).toBe('A');

      // undo the snapshot again, which should remove the inserted node
      DDS_STORE.restoreSnapshot(revsnapshot2);
      expect(DDS_STORE.query('nodes')).toHaveLength(0);
    
  });
});
