import { beforeEach, describe, expect, it, vi } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_MODEL integrity rules', () => {
  async function runActions(actions) {
    const result = await DDS_ACTIONS.execute(actions);
    expect(result.failed).toBeNull();
    return result;
  }

  async function createNode(name, swimLaneId) {
    const action = { type: 'add_node', name };
    if (swimLaneId !== undefined && swimLaneId !== null) {
      action.swim_lane_id = String(swimLaneId);
    }
    const result = await runActions([action]);
    return result.applied[0]._created_id;
  }

  async function createProduct(name) {
    const result = await runActions([{ type: 'add_product', name }]);
    return result.applied[0]._created_id;
  }

  async function createSwimLane(name, color) {
    const result = await runActions([{ type: 'add_swim_lane', name, color }]);
    return result.applied[0]._created_id;
  }

  async function createFlow(sourceId, targetId, productIds) {
    const result = await runActions([
      { type: 'add_flow', source_id: sourceId, target_id: targetId, product_ids: productIds || [] }
    ]);
    return result.applied[0]._created_id;
  }

  async function createSku(nodeId, productId) {
    await runActions([{ type: 'add_sku', node_id: nodeId, product_id: productId }]);
  }

  async function createDemand(nodeId, productId) {
    await runActions([{ type: 'add_demand', node_id: nodeId, product_id: productId }]);
  }

  async function createBom(nodeId, outputProductId, components) {
    const actions = [
      {
        type: 'add_bom',
        id: 'new_bom_1',
        node_id: nodeId,
        output_product_id: outputProductId
      }
    ];

    (components || []).forEach((component) => {
      actions.push({
        type: 'add_bom_component',
        bom_id: 'new_bom_1',
        product_id: component.product_id,
        quantity: component.quantity,
        notes: component.notes || ''
      });
    });

    const result = await runActions(actions);
    return result.applied[0]._created_id;
  }

  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    globalThis.DDS_ACTIONS = DDS_ACTIONS;
    DDS_STORE.newProject('Unit test', 'DDS_MODEL baseline', 'vitest');

    // Default stubs are intentionally failing until logic is migrated into DDS_MODEL.
    globalThis.DDS_NODES = { deleteNode: vi.fn(() => { throw new Error('DDS_NODES stub not implemented'); }) };
    globalThis.DDS_PRODUCTS = { delete: vi.fn(() => { throw new Error('DDS_PRODUCTS stub not implemented'); }) };
  });

  it('deleteFlow removes flow and map_flows only (no SKU deletion)', async () => {
    const n1 = await createNode('A');
    const n2 = await createNode('B');
    const p1 = await createProduct('P1');
    const f1 = await createFlow(n1, n2, [p1]);

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_flows', { map_id: 1, flow_id: f1 });
    DDS_STORE.insert('map_flows', { map_id: 2, flow_id: f1 });
    await createSku(n1, p1);

    DDS_MODEL.deleteFlow(f1);

    expect(DDS_STORE.query('flows', { id: f1 })).toEqual([]);
    expect(DDS_STORE.query('map_flows', { flow_id: f1 })).toEqual([]);
    expect(DDS_STORE.query('skus', { node_id: n1, product_id: p1 })).toHaveLength(1);
  });

  it('deleteSwimLane applies full cascade integrity rules', async () => {
    const lane = await createSwimLane('L1', '#111111');
    const lane2 = await createSwimLane('L2', '#222222');

    await createNode('A', lane);
    await createNode('B', lane);
    await createNode('C', lane2);

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_swim_lanes', { map_id: 1, swim_lane_id: lane });
    DDS_STORE.insert('map_swim_lanes', { map_id: 2, swim_lane_id: lane });

    // No helper/API exists for node_types fixture rows yet.
    const nt1 = DDS_STORE.insert('node_types', {
      code: 'T1',
      label: 'Type 1',
      default_swim_lane_id: lane
    })[0];
    const nt2 = DDS_STORE.insert('node_types', {
      code: 'T2',
      label: 'Type 2',
      default_swim_lane_id: lane2
    })[0];

    DDS_MODEL.deleteSwimLane(lane);

    expect(DDS_STORE.query('swim_lanes', { id: lane })).toEqual([]);
    expect(DDS_STORE.query('map_swim_lanes', { swim_lane_id: lane })).toEqual([]);
    expect(DDS_STORE.query('nodes', { swim_lane_id: lane })).toEqual([]);
    expect(DDS_STORE.query('node_types', { id: nt1.id })[0].default_swim_lane_id).toBeNull();
    expect(DDS_STORE.query('node_types', { id: nt2.id })[0].default_swim_lane_id).toBe(lane2);
  });

  it('removeSku deletes sku, demand, and map_demands for a node-product pair', async () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = await createNode('A');
    const p1 = await createProduct('P1');
    await createSku(n1, p1);
    await createDemand(n1, p1);
    const demand = DDS_STORE.query('demands', { node_id: n1, product_id: p1 })[0];

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.removeSku(n1, p1);

    expect(DDS_STORE.query('skus', { node_id: n1, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('demands', { node_id: n1, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
  });

  it('deleteDemand deletes demand and related map_demands', async () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = await createNode('A');
    const p1 = await createProduct('P1');
    await createDemand(n1, p1);
    const demand = DDS_STORE.query('demands', { node_id: n1, product_id: p1 })[0];

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.deleteDemand(n1, p1);

    expect(DDS_STORE.query('demands', { node_id: n1, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
  });

  it('deleteBom deletes bom and all bom_components', async () => {
    const n1 = await createNode('A');
    const p1 = await createProduct('P1');
    const p2 = await createProduct('P2');
    const bom = await createBom(n1, p1, [{ product_id: p2, quantity: 2 }]);

    DDS_MODEL.deleteBom(bom);

    expect(DDS_STORE.query('boms', { id: bom })).toEqual([]);
    expect(DDS_STORE.query('bom_components', { bom_id: bom })).toEqual([]);
  });

  it('rerouteFlow updates only provided endpoints', async () => {
    const n1 = await createNode('A');
    const n2 = await createNode('B');
    const n3 = await createNode('C');
    const flow = await createFlow(n1, n2, []);

    DDS_MODEL.rerouteFlow(flow, n3, null);

    const updated = DDS_STORE.query('flows', { id: flow })[0];
    expect(updated.source_node_id).toBe(n3);
    expect(updated.target_node_id).toBe(n2);
  });

  it('addProductToFlow appends once and does not duplicate', async () => {
    const n1 = await createNode('A');
    const n2 = await createNode('B');
    const p1 = await createProduct('P1');
    const flow = await createFlow(n1, n2, []);

    DDS_MODEL.addProductToFlow(flow, String(p1));
    DDS_MODEL.addProductToFlow(flow, p1);

    const updated = DDS_STORE.query('flows', { id: flow })[0];
    expect(updated.product_ids).toEqual([p1]);
  });

  it('removeProductFromFlow removes only the requested product', async () => {
    const n1 = await createNode('A');
    const n2 = await createNode('B');
    const p1 = await createProduct('P1');
    const p2 = await createProduct('P2');
    const flow = await createFlow(n1, n2, [p1, p2]);

    DDS_MODEL.removeProductFromFlow(flow, p1);

    const updated = DDS_STORE.query('flows', { id: flow })[0];
    expect(updated.product_ids).toEqual([p2]);
  });

  it('deleteNode applies full cascade across functional and map records', async () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = await createNode('A');
    const n2 = await createNode('B');
    const p1 = await createProduct('P1');
    const flow = await createFlow(n1, n2, [p1]);

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_flows', { map_id: map.id, flow_id: flow });
    DDS_STORE.insert('map_nodes', { map_id: map.id, node_id: n1, x: 10, y: 10 });

    await createSku(n1, p1);
    const bom = await createBom(n1, p1, [{ product_id: p1, quantity: 1 }]);
    await createDemand(n1, p1);
    const demand = DDS_STORE.query('demands', { node_id: n1, product_id: p1 })[0];

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.deleteNode(n1);

    expect(DDS_STORE.query('nodes', { id: n1 })).toEqual([]);
    expect(DDS_STORE.query('flows', { id: flow })).toEqual([]);
    expect(DDS_STORE.query('map_flows', { flow_id: flow })).toEqual([]);
    expect(DDS_STORE.query('map_nodes', { node_id: n1 })).toEqual([]);
    expect(DDS_STORE.query('skus', { node_id: n1, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('boms', { id: bom })).toEqual([]);
    expect(DDS_STORE.query('bom_components', { bom_id: bom })).toEqual([]);
    expect(DDS_STORE.query('demands', { node_id: n1, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
  });

  it('deleteProduct applies full cascade and strips product from flows', async () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = await createNode('A');
    const n2 = await createNode('B');
    const p1 = await createProduct('P1');
    const p2 = await createProduct('P2');
    const flow = await createFlow(n1, n2, [p1, p2]);
    await createSku(n1, p1);
    const bom = await createBom(n1, p1, [{ product_id: p1, quantity: 2 }]);
    await createDemand(n1, p1);
    const demand = DDS_STORE.query('demands', { node_id: n1, product_id: p1 })[0];

    // No helper/API exists for map_* fixture rows yet.
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.deleteProduct(p1);

    expect(DDS_STORE.query('products', { id: p1 })).toEqual([]);
    expect(DDS_STORE.query('skus', { product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('demands', { product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
    expect(DDS_STORE.query('boms', { id: bom })).toEqual([]);

    const updatedFlow = DDS_STORE.query('flows', { id: flow })[0];
    expect(updatedFlow.product_ids).toEqual([p2]);
  });
});
