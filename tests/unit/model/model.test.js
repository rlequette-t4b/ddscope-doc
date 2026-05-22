import { beforeEach, describe, expect, it, vi } from 'vitest';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_MODEL integrity rules', () => {
  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    DDS_STORE.newProject('Unit test', 'DDS_MODEL baseline', 'vitest');

    // Default stubs are intentionally failing until logic is migrated into DDS_MODEL.
    globalThis.DDS_NODES = { deleteNode: vi.fn(() => { throw new Error('DDS_NODES stub not implemented'); }) };
    globalThis.DDS_PRODUCTS = { delete: vi.fn(() => { throw new Error('DDS_PRODUCTS stub not implemented'); }) };
  });

  it('deleteFlow removes flow and map_flows only (no SKU deletion)', () => {
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    const f1 = DDS_STORE.insert('flows', {
      source_node_id: n1.id,
      target_node_id: n2.id,
      product_ids: [p1.id]
    })[0];

    DDS_STORE.insert('map_flows', { map_id: 1, flow_id: f1.id });
    DDS_STORE.insert('map_flows', { map_id: 2, flow_id: f1.id });
    DDS_STORE.insert('skus', { node_id: n1.id, product_id: p1.id });

    DDS_MODEL.deleteFlow(f1.id);

    expect(DDS_STORE.query('flows', { id: f1.id })).toEqual([]);
    expect(DDS_STORE.query('map_flows', { flow_id: f1.id })).toEqual([]);
    expect(DDS_STORE.query('skus', { node_id: n1.id, product_id: p1.id })).toHaveLength(1);
  });

  it('deleteSwimLane applies full cascade integrity rules', () => {
    const lane = DDS_STORE.insert('swim_lanes', { name: 'L1', color: '#111111' })[0];
    const lane2 = DDS_STORE.insert('swim_lanes', { name: 'L2', color: '#222222' })[0];

    const n1 = DDS_STORE.insert('nodes', { name: 'A', swim_lane_id: lane.id })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B', swim_lane_id: lane.id })[0];
    DDS_STORE.insert('nodes', { name: 'C', swim_lane_id: lane2.id });

    DDS_STORE.insert('map_swim_lanes', { map_id: 1, swim_lane_id: lane.id });
    DDS_STORE.insert('map_swim_lanes', { map_id: 2, swim_lane_id: lane.id });

    const nt1 = DDS_STORE.insert('node_types', {
      code: 'T1',
      label: 'Type 1',
      default_swim_lane_id: lane.id
    })[0];
    const nt2 = DDS_STORE.insert('node_types', {
      code: 'T2',
      label: 'Type 2',
      default_swim_lane_id: lane2.id
    })[0];

    DDS_MODEL.deleteSwimLane(lane.id);

    expect(DDS_STORE.query('swim_lanes', { id: lane.id })).toEqual([]);
    expect(DDS_STORE.query('map_swim_lanes', { swim_lane_id: lane.id })).toEqual([]);
    expect(DDS_STORE.query('nodes', { swim_lane_id: lane.id })).toEqual([]);
    expect(DDS_STORE.query('node_types', { id: nt1.id })[0].default_swim_lane_id).toBeNull();
    expect(DDS_STORE.query('node_types', { id: nt2.id })[0].default_swim_lane_id).toBe(lane2.id);
  });

  it('removeSku deletes sku, demand, and map_demands for a node-product pair', () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    DDS_STORE.insert('skus', { node_id: n1.id, product_id: p1.id });
    const demand = DDS_STORE.insert('demands', { node_id: n1.id, product_id: p1.id })[0];
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.removeSku(n1.id, p1.id);

    expect(DDS_STORE.query('skus', { node_id: n1.id, product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('demands', { node_id: n1.id, product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
  });

  it('deleteDemand deletes demand and related map_demands', () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    const demand = DDS_STORE.insert('demands', { node_id: n1.id, product_id: p1.id })[0];
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.deleteDemand(n1.id, p1.id);

    expect(DDS_STORE.query('demands', { node_id: n1.id, product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
  });

  it('deleteBom deletes bom and all bom_components', () => {
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    const p2 = DDS_STORE.insert('products', { name: 'P2' })[0];
    const bom = DDS_STORE.insert('boms', { node_id: n1.id, output_product_id: p1.id })[0];
    DDS_STORE.insert('bom_components', { bom_id: bom.id, product_id: p2.id, quantity: 2 });

    DDS_MODEL.deleteBom(bom.id);

    expect(DDS_STORE.query('boms', { id: bom.id })).toEqual([]);
    expect(DDS_STORE.query('bom_components', { bom_id: bom.id })).toEqual([]);
  });

  it('rerouteFlow updates only provided endpoints', () => {
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B' })[0];
    const n3 = DDS_STORE.insert('nodes', { name: 'C' })[0];

    const flow = DDS_STORE.insert('flows', {
      source_node_id: n1.id,
      target_node_id: n2.id,
      product_ids: []
    })[0];

    DDS_MODEL.rerouteFlow(flow.id, n3.id, null);

    const updated = DDS_STORE.query('flows', { id: flow.id })[0];
    expect(updated.source_node_id).toBe(n3.id);
    expect(updated.target_node_id).toBe(n2.id);
  });

  it('addProductToFlow appends once and does not duplicate', () => {
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];

    const flow = DDS_STORE.insert('flows', {
      source_node_id: n1.id,
      target_node_id: n2.id,
      product_ids: []
    })[0];

    DDS_MODEL.addProductToFlow(flow.id, String(p1.id));
    DDS_MODEL.addProductToFlow(flow.id, p1.id);

    const updated = DDS_STORE.query('flows', { id: flow.id })[0];
    expect(updated.product_ids).toEqual([p1.id]);
  });

  it('removeProductFromFlow removes only the requested product', () => {
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    const p2 = DDS_STORE.insert('products', { name: 'P2' })[0];

    const flow = DDS_STORE.insert('flows', {
      source_node_id: n1.id,
      target_node_id: n2.id,
      product_ids: [p1.id, p2.id]
    })[0];

    DDS_MODEL.removeProductFromFlow(flow.id, p1.id);

    const updated = DDS_STORE.query('flows', { id: flow.id })[0];
    expect(updated.product_ids).toEqual([p2.id]);
  });

  it('deleteNode applies full cascade across functional and map records', () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    const flow = DDS_STORE.insert('flows', {
      source_node_id: n1.id,
      target_node_id: n2.id,
      product_ids: [p1.id]
    })[0];
    DDS_STORE.insert('map_flows', { map_id: map.id, flow_id: flow.id });
    DDS_STORE.insert('map_nodes', { map_id: map.id, node_id: n1.id, x: 10, y: 10 });
    DDS_STORE.insert('skus', { node_id: n1.id, product_id: p1.id });
    const bom = DDS_STORE.insert('boms', { node_id: n1.id, output_product_id: p1.id })[0];
    DDS_STORE.insert('bom_components', { bom_id: bom.id, product_id: p1.id, quantity: 1 });
    const demand = DDS_STORE.insert('demands', { node_id: n1.id, product_id: p1.id })[0];
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.deleteNode(n1.id);

    expect(DDS_STORE.query('nodes', { id: n1.id })).toEqual([]);
    expect(DDS_STORE.query('flows', { id: flow.id })).toEqual([]);
    expect(DDS_STORE.query('map_flows', { flow_id: flow.id })).toEqual([]);
    expect(DDS_STORE.query('map_nodes', { node_id: n1.id })).toEqual([]);
    expect(DDS_STORE.query('skus', { node_id: n1.id, product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('boms', { id: bom.id })).toEqual([]);
    expect(DDS_STORE.query('bom_components', { bom_id: bom.id })).toEqual([]);
    expect(DDS_STORE.query('demands', { node_id: n1.id, product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
  });

  it('deleteProduct applies full cascade and strips product from flows', () => {
    const map = DDS_STORE.query('maps')[0];
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const n2 = DDS_STORE.insert('nodes', { name: 'B' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    const p2 = DDS_STORE.insert('products', { name: 'P2' })[0];
    const flow = DDS_STORE.insert('flows', {
      source_node_id: n1.id,
      target_node_id: n2.id,
      product_ids: [p1.id, p2.id]
    })[0];
    DDS_STORE.insert('skus', { node_id: n1.id, product_id: p1.id });
    const bom = DDS_STORE.insert('boms', { node_id: n1.id, output_product_id: p1.id })[0];
    DDS_STORE.insert('bom_components', { bom_id: bom.id, product_id: p1.id, quantity: 2 });
    const demand = DDS_STORE.insert('demands', { node_id: n1.id, product_id: p1.id })[0];
    DDS_STORE.insert('map_demands', { map_id: map.id, demand_id: demand.id });

    DDS_MODEL.deleteProduct(p1.id);

    expect(DDS_STORE.query('products', { id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('skus', { product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('demands', { product_id: p1.id })).toEqual([]);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id })).toEqual([]);
    expect(DDS_STORE.query('boms', { id: bom.id })).toEqual([]);

    const updatedFlow = DDS_STORE.query('flows', { id: flow.id })[0];
    expect(updatedFlow.product_ids).toEqual([p2.id]);
  });
});
