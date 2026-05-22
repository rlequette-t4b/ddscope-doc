import { beforeEach, describe, expect, it } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_NODES from '../../../src/DDS_NODES.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_NODES helper facade', () => {
  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    globalThis.DDS_ACTIONS = DDS_ACTIONS;
    globalThis.DDS_MODEL = DDS_MODEL;
    DDS_STORE.newProject('Unit test', 'DDS_NODES baseline', 'vitest');
  });

  it('getAll returns empty array when no project is loaded', () => {
    DDS_STORE.setProject(null);
    expect(DDS_NODES.getAll()).toEqual([]);
  });

  it('create writes a node through DDS_ACTIONS', async () => {
    var result = await DDS_NODES.create({ name: 'Node A', type_code: 'PLANT' });

    expect(result.failed).toBeNull();
    var nodes = DDS_STORE.query('nodes');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('Node A');
    expect(nodes[0].type_code).toBe('PLANT');
  });

  it('getById supports string ids and returns null when missing', async () => {
    var created = await DDS_NODES.create({ name: 'Node A' });
    var nodeId = created.applied[0]._created_id;

    expect(DDS_NODES.getById(String(nodeId)).id).toBe(nodeId);
    expect(DDS_NODES.getById(9999)).toBeNull();
  });

  it('update delegates and persists fields', async () => {
    var created = await DDS_NODES.create({ name: 'Node A', notes: 'old' });
    var nodeId = created.applied[0]._created_id;

    var result = await DDS_NODES.update(nodeId, { name: 'Node A+', notes: 'new' });

    expect(result.failed).toBeNull();
    var updated = DDS_STORE.query('nodes', { id: nodeId })[0];
    expect(updated.name).toBe('Node A+');
    expect(updated.notes).toBe('new');
  });

  it('assignToLane updates swim_lane_id', async () => {
    // No helper/API exists yet for swim_lanes fixture rows.
    var laneId = DDS_STORE.insert('swim_lanes', { name: 'Lane 1', color: '#1e88e5' })[0].id;

    var created = await DDS_NODES.create({ name: 'Node A' });
    var nodeId = created.applied[0]._created_id;

    var result = await DDS_NODES.assignToLane(nodeId, laneId);

    expect(result.failed).toBeNull();
    var node = DDS_STORE.query('nodes', { id: nodeId })[0];
    expect(node.swim_lane_id).toBe(laneId);
  });

  it('delete removes node through model cascade path', async () => {
    var created = await DDS_NODES.create({ name: 'Node A' });
    var nodeId = created.applied[0]._created_id;

    var result = await DDS_NODES.delete(nodeId);

    expect(result.failed).toBeNull();
    expect(DDS_STORE.query('nodes', { id: nodeId })).toEqual([]);
  });
});
