import { beforeEach, describe, expect, it } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_FLOWS from '../../../src/DDS_FLOWS.js';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_NODES from '../../../src/DDS_NODES.js';
import DDS_PRODUCTS from '../../../src/DDS_PRODUCTS.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_FLOWS helper facade', () => {
  async function createNode(name) {
    var result = await DDS_NODES.create({ name: name });
    expect(result.failed).toBeNull();
    return result.applied[0]._created_id;
  }

  async function createProduct(name) {
    var result = await DDS_PRODUCTS.create({ name: name });
    expect(result.failed).toBeNull();
    return result.applied[0]._created_id;
  }

  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    globalThis.DDS_ACTIONS = DDS_ACTIONS;
    globalThis.DDS_MODEL = DDS_MODEL;
    globalThis.DDS_NODES = DDS_NODES;
    globalThis.DDS_PRODUCTS = DDS_PRODUCTS;
    DDS_STORE.newProject('Unit test', 'DDS_FLOWS baseline', 'vitest');
  });

  it('getAll returns empty array when no project is loaded', () => {
    DDS_STORE.setProject(null);
    expect(DDS_FLOWS.getAll()).toEqual([]);
  });

  it('create/getById writes and reads a flow', async () => {
    var sourceId = await createNode('Source');
    var targetId = await createNode('Target');

    var result = await DDS_FLOWS.create({ source_id: sourceId, target_id: targetId, notes: 'lt' });

    expect(result.failed).toBeNull();
    var flowId = result.applied[0]._created_id;
    var flow = DDS_FLOWS.getById(flowId);
    expect(flow.source_node_id).toBe(sourceId);
    expect(flow.target_node_id).toBe(targetId);
    expect(flow.notes).toBe('lt');
  });

  it('getForNode returns incoming and outgoing flows', async () => {
    var n1 = await createNode('A');
    var n2 = await createNode('B');
    var n3 = await createNode('C');

    await DDS_FLOWS.create({ source_id: n1, target_id: n2 });
    await DDS_FLOWS.create({ source_id: n3, target_id: n1 });

    var forNode = DDS_FLOWS.getForNode(n1);
    expect(forNode).toHaveLength(2);
  });

  it('update/reroute mutate the expected flow fields', async () => {
    var n1 = await createNode('A');
    var n2 = await createNode('B');
    var n3 = await createNode('C');
    var created = await DDS_FLOWS.create({ source_id: n1, target_id: n2, lead_time_value: 3, lead_time_unit: 'days' });
    var flowId = created.applied[0]._created_id;

    var updateResult = await DDS_FLOWS.update(flowId, { lead_time_value: 5, lead_time_unit: 'weeks' });
    expect(updateResult.failed).toBeNull();
    var rerouteResult = await DDS_FLOWS.reroute(flowId, n3, null);
    expect(rerouteResult.failed).toBeNull();

    var flow = DDS_STORE.query('flows', { id: flowId })[0];
    expect(flow.lead_time_value).toBe(5);
    expect(flow.lead_time_unit).toBe('weeks');
    expect(flow.source_node_id).toBe(n3);
    expect(flow.target_node_id).toBe(n2);
  });

  it('addProduct/removeProduct keep flow product_ids in sync', async () => {
    var n1 = await createNode('A');
    var n2 = await createNode('B');
    var productId = await createProduct('P1');
    var created = await DDS_FLOWS.create({ source_id: n1, target_id: n2 });
    var flowId = created.applied[0]._created_id;

    var addResult = await DDS_FLOWS.addProduct(flowId, productId);
    expect(addResult.failed).toBeNull();
    expect(DDS_STORE.query('flows', { id: flowId })[0].product_ids).toEqual([productId]);

    var removeResult = await DDS_FLOWS.removeProduct(flowId, productId);
    expect(removeResult.failed).toBeNull();
    expect(DDS_STORE.query('flows', { id: flowId })[0].product_ids).toEqual([]);
  });

  it('delete removes the flow', async () => {
    var n1 = await createNode('A');
    var n2 = await createNode('B');
    var created = await DDS_FLOWS.create({ source_id: n1, target_id: n2 });
    var flowId = created.applied[0]._created_id;

    var result = await DDS_FLOWS.delete(flowId);

    expect(result.failed).toBeNull();
    expect(DDS_STORE.query('flows', { id: flowId })).toEqual([]);
  });
});
