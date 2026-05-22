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
    globalThis.DDS_BOMS = { delete: vi.fn(() => { throw new Error('DDS_BOMS stub not implemented'); }) };
    globalThis.DDS_DEMANDS = { deleteForSku: vi.fn(() => { throw new Error('DDS_DEMANDS stub not implemented'); }) };
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

  it('deleteSwimLane cascades node deletions, cleans map_swim_lanes, clears defaults, and removes lane', () => {
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

    globalThis.DDS_NODES.deleteNode.mockImplementation((nodeId) => {
      DDS_STORE.remove('nodes', { id: nodeId });
    });

    DDS_MODEL.deleteSwimLane(lane.id);

    expect(globalThis.DDS_NODES.deleteNode).toHaveBeenCalledTimes(2);
    expect(globalThis.DDS_NODES.deleteNode).toHaveBeenCalledWith(n1.id);
    expect(globalThis.DDS_NODES.deleteNode).toHaveBeenCalledWith(n2.id);

    expect(DDS_STORE.query('swim_lanes', { id: lane.id })).toEqual([]);
    expect(DDS_STORE.query('map_swim_lanes', { swim_lane_id: lane.id })).toEqual([]);
    expect(DDS_STORE.query('nodes', { swim_lane_id: lane.id })).toEqual([]);

    expect(DDS_STORE.query('node_types', { id: nt1.id })[0].default_swim_lane_id).toBeNull();
    expect(DDS_STORE.query('node_types', { id: nt2.id })[0].default_swim_lane_id).toBe(lane2.id);
  });

  it('removeSku removes SKU and delegates demand cleanup for same pair', () => {
    const n1 = DDS_STORE.insert('nodes', { name: 'A' })[0];
    const p1 = DDS_STORE.insert('products', { name: 'P1' })[0];
    DDS_STORE.insert('skus', { node_id: n1.id, product_id: p1.id });

    DDS_MODEL.removeSku(n1.id, p1.id);

    expect(globalThis.DDS_DEMANDS.deleteForSku).toHaveBeenCalledWith(n1.id, p1.id);
    expect(DDS_STORE.query('skus', { node_id: n1.id, product_id: p1.id })).toEqual([]);
  });

  it('deleteDemand delegates demand deletion by node/product pair', () => {
    DDS_MODEL.deleteDemand(10, 20);
    expect(globalThis.DDS_DEMANDS.deleteForSku).toHaveBeenCalledWith(10, 20);
  });

  it('deleteBom delegates to DDS_BOMS.delete', () => {
    DDS_MODEL.deleteBom(42);
    expect(globalThis.DDS_BOMS.delete).toHaveBeenCalledWith(42);
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

  it('deleteNode delegates to DDS_NODES.deleteNode', () => {
    DDS_MODEL.deleteNode(77);
    expect(globalThis.DDS_NODES.deleteNode).toHaveBeenCalledWith(77);
  });

  it('deleteProduct delegates to DDS_PRODUCTS.delete', () => {
    DDS_MODEL.deleteProduct(88);
    expect(globalThis.DDS_PRODUCTS.delete).toHaveBeenCalledWith(88);
  });
});
