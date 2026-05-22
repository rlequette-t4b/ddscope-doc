import { beforeEach, describe, expect, it } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_ACTIONS', () => {
  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    DDS_STORE.newProject('Unit test', 'DDS_ACTIONS baseline', 'vitest');
  });

  it('exposes the action vocabulary text', () => {
    var text = DDS_ACTIONS.getVocabularyText();
    expect(text).toContain('--- NODES ---');
    expect(text).toContain('add_node');
  });

  it('stops on unknown action without applying writes', async () => {
    var result = await DDS_ACTIONS.execute([
      { type: 'add_node', name: 'Factory' },
      { type: 'unknown_action' }
    ]);

    expect(result.failed).toEqual({ type: 'unknown_action' });
    expect(DDS_STORE.query('nodes').length).toBe(1);
  });

  it('accepts add_node when the action name is provided in action instead of type', async () => {
    var actionAliasPayload = { action: 'add_node', name: 'Factory via action key' };

    var result = await DDS_ACTIONS.execute([actionAliasPayload]);

    expect(result.failed).toBeNull();
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].type).toBe('add_node');
    expect(result.applied[0]._created_id).toBeDefined();

    var nodes = DDS_STORE.query('nodes');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('Factory via action key');
  });

  it('resolves new_* references across sequential actions', async () => {
    var result = await DDS_ACTIONS.execute([
      { type: 'add_node', id: 'new_node_1', name: 'Plant' },
      { type: 'add_product', id: 'new_product_1', name: 'Widget' },
      { type: 'add_sku', node_id: 'new_node_1', product_id: 'new_product_1' }
    ]);

    expect(result.failed).toBeNull();

    var nodes = DDS_STORE.query('nodes');
    var products = DDS_STORE.query('products');
    var skus = DDS_STORE.query('skus');

    expect(nodes.length).toBe(1);
    expect(products.length).toBe(1);
    expect(skus.length).toBe(1);
    expect(skus[0].node_id).toBe(nodes[0].id);
    expect(skus[0].product_id).toBe(products[0].id);
  });

  it('describes actions using local new_* labels', () => {
    var labels = DDS_ACTIONS.describe([
      { type: 'add_node', id: 'new_node_1', name: 'Warehouse A' },
      { type: 'update_node', node_id: 'new_node_1', notes: 'updated' }
    ]);

    expect(labels[0].label).toContain('Warehouse A');
    expect(labels[1].label).toContain('Warehouse A');
  });

  it('executes customer add_node batch and persists nodes in an existing swim lane', async () => {
    var lane = DDS_STORE.insert('swim_lanes', {
      name: 'Customers lane',
      color: '#1e88e5'
    })[0];

    var actions = [
      { type: 'add_node', name: 'C1', type_code: 'CUSTOMER', swim_lane_id: String(lane.id) },
      { type: 'add_node', name: 'C2', type_code: 'CUSTOMER', swim_lane_id: String(lane.id) },
      { type: 'add_node', name: 'C3', type_code: 'CUSTOMER', swim_lane_id: String(lane.id) },
      { type: 'add_node', name: 'C4', type_code: 'CUSTOMER', swim_lane_id: String(lane.id) }
    ];

    var result = await DDS_ACTIONS.execute(actions);
    expect(result.failed).toBeNull();
    expect(result.applied.length).toBe(4);

    var lanes = DDS_STORE.query('swim_lanes', { id: lane.id });
    var nodes = DDS_STORE.query('nodes', { type_code: 'CUSTOMER', swim_lane_id: lane.id });
    var names = nodes.map(function (node) { return node.name; });

    expect(lanes.length).toBe(1);
    expect(nodes.length).toBe(4);
    expect(names).toContain('C1');
    expect(names).toContain('C2');
    expect(names).toContain('C3');
    expect(names).toContain('C4');
    expect(nodes.every(function (node) { return node.swim_lane_id === lane.id; })).toBe(true);
  });

  it('fails the first action when no project is loaded', async () => {
    DDS_STORE.setProject(null);

    var action = { type: 'add_node', name: 'NoModelNode' };
    var result = await DDS_ACTIONS.execute([action]);

    expect(result.applied).toEqual([]);
    expect(result.failed).toEqual(action);
  });
});
