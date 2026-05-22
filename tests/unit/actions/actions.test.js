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
});
