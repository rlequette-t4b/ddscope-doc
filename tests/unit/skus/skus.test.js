import { beforeEach, describe, expect, it } from 'vitest';
import DDS_ACTIONS from '../../../src/DDS_ACTIONS.js';
import DDS_MODEL from '../../../src/DDS_MODEL.js';
import DDS_NODES from '../../../src/DDS_NODES.js';
import DDS_PRODUCTS from '../../../src/DDS_PRODUCTS.js';
import DDS_SKUS from '../../../src/DDS_SKUS.js';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_SKUS helper facade', () => {
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
    DDS_STORE.newProject('Unit test', 'DDS_SKUS baseline', 'vitest');
  });

  it('getAll returns empty array when no project is loaded', () => {
    DDS_STORE.setProject(null);
    expect(DDS_SKUS.getAll()).toEqual([]);
  });

  it('add and get retrieve a SKU pair', async () => {
    var nodeId = await createNode('Node A');
    var productId = await createProduct('P1');

    var result = await DDS_SKUS.add(nodeId, productId, { notes: 'primary' });

    expect(result.failed).toBeNull();
    var sku = DDS_SKUS.get(nodeId, productId);
    expect(sku).not.toBeNull();
    expect(sku.notes).toBe('primary');
  });

  it('getForNode/getForProduct filter by ids', async () => {
    var n1 = await createNode('N1');
    var n2 = await createNode('N2');
    var p1 = await createProduct('P1');
    var p2 = await createProduct('P2');

    await DDS_SKUS.add(n1, p1);
    await DDS_SKUS.add(n1, p2);
    await DDS_SKUS.add(n2, p1);

    expect(DDS_SKUS.getForNode(String(n1))).toHaveLength(2);
    expect(DDS_SKUS.getForProduct(String(p1))).toHaveLength(2);
  });

  it('update changes tags and notes', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');
    await DDS_SKUS.add(nodeId, productId, { tags: ['old'], notes: 'old' });

    var result = await DDS_SKUS.update(nodeId, productId, { tags: ['new'], notes: 'new' });

    expect(result.failed).toBeNull();
    var updated = DDS_SKUS.get(nodeId, productId);
    expect(updated.tags).toEqual(['new']);
    expect(updated.notes).toBe('new');
  });

  it('remove deletes the SKU', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');
    await DDS_SKUS.add(nodeId, productId);

    var result = await DDS_SKUS.remove(nodeId, productId);

    expect(result.failed).toBeNull();
    expect(DDS_SKUS.get(nodeId, productId)).toBeNull();
  });
});
