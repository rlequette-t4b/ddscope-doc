import { describe, it, expect, beforeEach } from 'vitest';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_STORE Deltas', () => {
  let deltas;

  beforeEach(() => {
    DDS_STORE.newProject('Delta test', 'Test Deltas', 'vitest');
  });

  it(`cannot begin a Delta when Delta in progress`, () => {
    DDS_STORE.beginDelta();
    expect(() => DDS_STORE.beginDelta()).toThrow();
    DDS_STORE.endDelta();
  });

  it('can cancel when no Delta in progress', () => {
    DDS_STORE.cancelDelta();
  });

  it('can restore store with a cancel', () => {

    DDS_STORE.beginDelta();

    // no nodes at start
    expect(DDS_STORE.query('nodes')).toHaveLength(0);

    // insert a node
    DDS_STORE.insert('nodes', { name: 'A' });
    expect(DDS_STORE.query('nodes')).toHaveLength(1);

    // cancel the current Delta, which should remove the inserted node
    DDS_STORE.cancelDelta();
    expect(DDS_STORE.query('nodes')).toHaveLength(0);
  });

  it('perform undo/redo for one node', () => {

    DDS_STORE.beginDelta();

    // no nodes at start
    expect(DDS_STORE.query('nodes')).toHaveLength(0);

    // insert a node and commit
    DDS_STORE.insert('nodes', { name: 'A' });

    var delta = DDS_STORE.endDelta();

    expect(DDS_STORE.query('nodes')).toHaveLength(1);

    // undo the Delta, which should remove the inserted node
    var revDelta = DDS_STORE.revertDelta(delta);

    expect(DDS_STORE.query('nodes')).toHaveLength(0);

    // redo the Delta, which should add back the inserted node
    var revDelta2 = DDS_STORE.revertDelta(revDelta);
    expect(DDS_STORE.query('nodes')).toHaveLength(1);

    // check that the node is the same after undo/redo
    expect(DDS_STORE.query('nodes')[0].name).toBe('A');

    // undo the Delta again, which should remove the inserted node
    DDS_STORE.revertDelta(revDelta2);
    expect(DDS_STORE.query('nodes')).toHaveLength(0);

  });

  it('restore the original state when an object is updated twice in the same Delta', () => {

    // insert a node before the delta
    DDS_STORE.insert('nodes', { name: 'A' });
    expect(DDS_STORE.query('nodes')).toHaveLength(1);
    var node = DDS_STORE.query('nodes')[0];
    // check the name is A
    expect(node.name).toBe('A');

    DDS_STORE.beginDelta();
    // update the node twice
    DDS_STORE.update('nodes', node.id, { name: 'B' });
    expect(node.name).toBe('B');
    DDS_STORE.update('nodes', node.id, { name: 'C' });
    expect(node.name).toBe('C');

    var delta = DDS_STORE.endDelta();
    var revDelta = DDS_STORE.revertDelta(delta);

    // still one node and the same node
    expect(DDS_STORE.query('nodes')).toHaveLength(1);
    // the node is still the same
    expect(DDS_STORE.query('nodes')[0]).toBe(node);
    // the name should be back to A
    expect(node.name).toBe('A');

    // now after redo the name should be C
    DDS_STORE.revertDelta(revDelta);
    expect(node.name).toBe('C');

  });

  it('restore correctly when an attribute was added during a Delta', () => {
    // insert a node before the delta
    DDS_STORE.insert('nodes', { name: 'A' });
    expect(DDS_STORE.query('nodes')).toHaveLength(1);
    var node = DDS_STORE.query('nodes')[0];
    
    DDS_STORE.beginDelta();
    // add a new attribute to the node
    DDS_STORE.update('nodes', node.id, { color: 'red' });
    expect(node.color).toBe('red');
    var delta = DDS_STORE.endDelta();

    var revDelta = DDS_STORE.revertDelta(delta);

    // the color attribute should be removed or nullified after undo
    expect(node.color).toBeUndefined() || expect(node.color).toBeNull();
  });

});