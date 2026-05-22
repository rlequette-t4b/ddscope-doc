import { beforeEach, describe, expect, it } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_FLOWS from '../../../src/DDS_FLOWS.js';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_NODES from '../../../src/DDS_NODES.js';
import DDS_PRODUCTS from '../../../src/DDS_PRODUCTS.js';
import DDS_SKUS from '../../../src/DDS_SKUS.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_PRODUCTS helper facade', () => {
  async function createNode(name, typeCode) {
    var result = await DDS_NODES.create({ name: name, type_code: typeCode || null });
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
    globalThis.DDS_SKUS = DDS_SKUS;
    DDS_STORE.newProject('Unit test', 'DDS_PRODUCTS baseline', 'vitest');
  });

  it('getAll returns empty array when no project is loaded', () => {
    DDS_STORE.setProject(null);
    expect(DDS_PRODUCTS.getAll()).toEqual([]);
  });

  it('create/getById/update/delete delegate and persist records', async () => {
    var created = await DDS_PRODUCTS.create({ name: 'P1', type_code: 'FG' });
    expect(created.failed).toBeNull();
    var productId = created.applied[0]._created_id;

    expect(DDS_PRODUCTS.getById(String(productId)).name).toBe('P1');

    var updated = await DDS_PRODUCTS.update(productId, { name: 'P1+', notes: 'updated' });
    expect(updated.failed).toBeNull();
    expect(DDS_PRODUCTS.getById(productId).name).toBe('P1+');

    var removed = await DDS_PRODUCTS.delete(productId);
    expect(removed.failed).toBeNull();
    expect(DDS_PRODUCTS.getById(productId)).toBeNull();
  });

  it('ensureSku creates missing SKU and does not duplicate existing one', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');

    DDS_PRODUCTS.ensureSku(nodeId, productId);
    DDS_PRODUCTS.ensureSku(nodeId, productId);

    var skus = DDS_STORE.query('skus', { node_id: nodeId, product_id: productId });
    expect(skus).toHaveLength(1);
  });

  it('cleanSku keeps SKU when still referenced by a flow, then removes it when no longer needed', async () => {
    var n1 = await createNode('A');
    var n2 = await createNode('B');
    var productId = await createProduct('P1');
    await DDS_SKUS.add(n1, productId);
    await DDS_SKUS.add(n2, productId);

    var flow = await DDS_FLOWS.create({ source_id: n1, target_id: n2 });
    var flowId = flow.applied[0]._created_id;
    await DDS_FLOWS.addProduct(flowId, productId);

    DDS_PRODUCTS.cleanSku(n1, productId);
    expect(DDS_STORE.query('skus', { node_id: n1, product_id: productId })).toHaveLength(1);

    await DDS_FLOWS.removeProduct(flowId, productId);
    DDS_PRODUCTS.cleanSku(n1, productId);
    expect(DDS_STORE.query('skus', { node_id: n1, product_id: productId })).toEqual([]);
  });

  it('cleanSku does not remove SKU for product-node type', async () => {
    // No helper/API exists yet for node_types fixture rows.
    DDS_STORE.insert('node_types', { code: 'PRODUCT_NODE', is_product_node_default: true });
    var nodeId = await createNode('P-Node', 'PRODUCT_NODE');
    var productId = await createProduct('P1');
    await DDS_SKUS.add(nodeId, productId);

    DDS_PRODUCTS.cleanSku(nodeId, productId);

    expect(DDS_STORE.query('skus', { node_id: nodeId, product_id: productId })).toHaveLength(1);
  });

  it('syncFlowSkus adds missing SKUs and removes obsolete SKUs on both endpoints', async () => {
    var n1 = await createNode('A');
    var n2 = await createNode('B');
    var p1 = await createProduct('P1');
    var p2 = await createProduct('P2');

    await DDS_SKUS.add(n1, p1);
    await DDS_SKUS.add(n2, p1);

    DDS_PRODUCTS.syncFlowSkus({ source_node_id: n1, target_node_id: n2 }, [p1], [p2]);

    expect(DDS_STORE.query('skus', { node_id: n1, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('skus', { node_id: n2, product_id: p1 })).toEqual([]);
    expect(DDS_STORE.query('skus', { node_id: n1, product_id: p2 })).toHaveLength(1);
    expect(DDS_STORE.query('skus', { node_id: n2, product_id: p2 })).toHaveLength(1);
  });
});
