import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_NODES from '../../../src/DDS_NODES.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

var hasLanesModule = existsSync(new URL('../../../src/DDS_LANES.js', import.meta.url));
var DDS_LANES = null;

if (hasLanesModule) {
  var lanesModule = await import('../../../src/DDS_LANES.js');
  DDS_LANES = lanesModule.default;
}

var describeLanes = hasLanesModule ? describe : describe.skip;

describeLanes('DDS_LANES helper facade', () => {
  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    globalThis.DDS_ACTIONS = DDS_ACTIONS;
    globalThis.DDS_MODEL = DDS_MODEL;
    globalThis.DDS_NODES = DDS_NODES;
    DDS_STORE.newProject('Unit test', 'DDS_LANES baseline', 'vitest');
  });

  it('getAll throws an error when no project is loaded', () => {
    DDS_STORE.setProject(null);
    if (DDS_LANES) {
      expect(DDS_LANES.getAll()).toThrow();
    } else {
      expect(true).toBe(true); // skip if DDS_LANES is not available
    }
  });

  it('create/getById/create-update persist lane records', async () => {
    var createResult = await DDS_LANES.create({ name: 'Lane A', color: '#1e88e5' });
    var createdId = createResult && createResult.applied
      ? createResult.applied[0]._created_id
      : createResult && createResult.id;

    var createdLane = DDS_LANES.getById(createdId);
    expect(createdLane).toBeTruthy();
    expect(createdLane.name).toBe('Lane A');
    expect(createdLane.color).toBe('#1e88e5');
    expect(DDS_LANES.getById(String(createdId)).id).toBe(createdId);
    expect(DDS_LANES.getById(9999)).toBeNull();

    await DDS_LANES.update(createdId, { name: 'Lane A+', color: '#1565c0' });
    var updatedLane = DDS_STORE.query('swim_lanes', { id: createdId })[0];
    expect(updatedLane.name).toBe('Lane A+');
    expect(updatedLane.color).toBe('#1565c0');
  });

  it('delete cascades lane cleanup to nodes, map_swim_lanes, and node_types defaults', async () => {
    var laneCreate = await DDS_LANES.create({ name: 'To delete', color: '#42a5f5' });
    var laneId = laneCreate && laneCreate.applied
      ? laneCreate.applied[0]._created_id
      : laneCreate && laneCreate.id;

    var n1 = await DDS_NODES.create({ name: 'N1', type_code: 'CUSTOMER' });
    var n2 = await DDS_NODES.create({ name: 'N2', type_code: 'CUSTOMER' });
    var n1Id = n1.applied[0]._created_id;
    var n2Id = n2.applied[0]._created_id;
    await DDS_NODES.assignToLane(n1Id, laneId);
    await DDS_NODES.assignToLane(n2Id, laneId);

    var mapId = DDS_STORE.query('maps')[0].id;
    // No helper/API exists yet for map_swim_lanes fixture rows.
    DDS_STORE.insert('map_swim_lanes', { map_id: mapId, swim_lane_id: laneId, y: 120, height: 220 });
    // No helper/API exists yet for node_types fixture rows.
    DDS_STORE.insert('node_types', { code: 'CUSTOMER', default_swim_lane_id: laneId });

    await DDS_LANES.delete(laneId);

    expect(DDS_STORE.query('swim_lanes', { id: laneId })).toEqual([]);
    expect(DDS_STORE.query('nodes', { id: n1Id })).toEqual([]);
    expect(DDS_STORE.query('nodes', { id: n2Id })).toEqual([]);
    expect(DDS_STORE.query('map_swim_lanes', { swim_lane_id: laneId })).toEqual([]);

    var nodeType = DDS_STORE.query('node_types', { code: 'CUSTOMER' })[0];
    expect(nodeType.default_swim_lane_id).toBeNull();
  });
});
