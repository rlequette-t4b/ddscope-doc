import { beforeEach, describe, expect, it } from 'vitest';

describe('DDS_BOMS helper facade', () => {
  async function createNode(name) {
    const result = await DDS_NODES.create({ name: name });
    expect(result.failed).toBeNull();
    return DDS_NODES.getById(result.applied[0]._created_id);
  }

  async function createProduct(name) {
    const result = await DDS_PRODUCTS.create({ name: name });
    expect(result.failed).toBeNull();
    return DDS_PRODUCTS.getById(result.applied[0]._created_id);
  }

  async function createBom(nodeId, outputProductId, components) {
    const result = await DDS_BOMS.create(nodeId, outputProductId, components || []);
    expect(result.failed).toBeNull();
    const boms = DDS_STORE.query('boms', { node_id: nodeId, output_product_id: outputProductId });
    return boms[boms.length - 1];
  }

  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    globalThis.DDS_ACTIONS = DDS_ACTIONS;
    globalThis.DDS_MODEL = DDS_MODEL;
    globalThis.DDS_NODES = DDS_NODES;
    globalThis.DDS_PRODUCTS = DDS_PRODUCTS;
    DDS_STORE.newProject('Unit test', 'DDS_BOMS baseline', 'vitest');
  });

  it('getAll returns empty array when no project is loaded', () => {
    DDS_STORE.setProject(null);
    expect(DDS_BOMS.getAll()).toEqual([]);
  });

  it('getAll returns boms from store when project is loaded', async () => {
    const node = await createNode('Plant A');
    const product = await createProduct('P1');
    const bom = await createBom(node.id, product.id, []);

    const all = DDS_BOMS.getAll();

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(bom.id);
  });

  it('getComponents returns only components for the requested bom', async () => {
    const nodeA = await createNode('Plant A');
    const nodeB = await createNode('Plant B');
    const outputA = await createProduct('P1');
    const outputB = await createProduct('P2');
    const compA = await createProduct('C1');
    const compB = await createProduct('C2');

    const bomA = await createBom(nodeA.id, outputA.id, [{ product_id: compA.id, quantity: 2 }]);
    await createBom(nodeB.id, outputB.id, [{ product_id: compB.id, quantity: 3 }]);

    const components = DDS_BOMS.getComponents(bomA.id);

    expect(components).toHaveLength(1);
    expect(components[0].product_id).toBe(compA.id);
    expect(components[0].quantity).toBe(2);
  });

  it('create throws on duplicate node/output_product pair', async () => {
    const node = await createNode('Plant A');
    const outputProduct = await createProduct('P1');
    await createBom(node.id, outputProduct.id, []);

    expect(() => DDS_BOMS.create(node.id, outputProduct.id, [])).toThrow(
      'A BOM for this node and output product already exists.'
    );
  });

  it('create writes bom and valid bom_components through DDS_ACTIONS', async () => {
    const node = await createNode('Plant A');
    const outputProduct = await createProduct('P1');
    const validComponentProduct = await createProduct('P2');

    const result = await DDS_BOMS.create(node.id, outputProduct.id, [
      { product_id: validComponentProduct.id, quantity: 4, notes: 'steel' },
      { product_id: null, quantity: 1, notes: 'ignored' }
    ]);

    expect(result.failed).toBeNull();

    var boms = DDS_STORE.query('boms', { node_id: node.id, output_product_id: outputProduct.id });
    expect(boms).toHaveLength(1);

    var components = DDS_STORE.query('bom_components', { bom_id: boms[0].id });
    expect(components).toHaveLength(1);
    expect(components[0].product_id).toBe(validComponentProduct.id);
    expect(components[0].quantity).toBe(4);
    expect(components[0].notes).toBe('steel');
  });

  it('updateComponents returns no-op result when there are no changes', async () => {
    const node = await createNode('Plant A');
    const outputProduct = await createProduct('P1');
    const component = await createProduct('C1');
    const bom = await createBom(node.id, outputProduct.id, [
      { product_id: component.id, quantity: 2, notes: 'same' }
    ]);

    const result = DDS_BOMS.updateComponents(bom.id, [{ product_id: component.id, quantity: 2, notes: 'same' }]);

    expect(result).toEqual({ applied: [], failed: null });
  });

  it('updateComponents applies remove/add/update diff to components', async () => {
    const node = await createNode('Plant A');
    const outputProduct = await createProduct('P1');
    const p1 = await createProduct('C1');
    const p2 = await createProduct('C2');
    const p3 = await createProduct('C3');
    const bom = await createBom(node.id, outputProduct.id, [
      { product_id: p1.id, quantity: 2, notes: '' },
      { product_id: p2.id, quantity: 1, notes: 'old' }
    ]);

    const result = await DDS_BOMS.updateComponents(bom.id, [
      { product_id: p2.id, quantity: 3, notes: 'new' },
      { product_id: p3.id, quantity: 5, notes: '' }
    ]);

    expect(result.failed).toBeNull();

    const components = DDS_STORE.query('bom_components', { bom_id: bom.id });
    expect(components).toHaveLength(2);

    const c2 = components.find((c) => c.product_id === p2.id);
    const c3 = components.find((c) => c.product_id === p3.id);
    const c1 = components.find((c) => c.product_id === p1.id);

    expect(c1).toBeUndefined();
    expect(c2).toBeDefined();
    expect(c2.quantity).toBe(3);
    expect(c2.notes).toBe('new');
    expect(c3).toBeDefined();
    expect(c3.quantity).toBe(5);
    expect(c3.notes).toBe('');
  });

  it('delete removes bom and related components through DDS_ACTIONS', async () => {
    const node = await createNode('Plant A');
    const outputProduct = await createProduct('P1');
    const componentProduct = await createProduct('P2');
    const bom = await createBom(node.id, outputProduct.id, [
      { product_id: componentProduct.id, quantity: 2 }
    ]);

    const result = await DDS_BOMS.delete(bom.id);

    expect(result.failed).toBeNull();
    expect(DDS_STORE.query('boms', { id: bom.id })).toEqual([]);
    expect(DDS_STORE.query('bom_components', { bom_id: bom.id })).toEqual([]);
  });
});
