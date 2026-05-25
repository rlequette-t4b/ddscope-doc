import { beforeEach, describe, expect, it } from 'vitest';

describe('DDS_DEMANDS helper facade', () => {
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

  async function createDemand(nodeId, productId, fields) {
    var result = await DDS_DEMANDS.create(nodeId, productId, fields);
    expect(result.failed).toBeNull();
    return DDS_DEMANDS.get(nodeId, productId);
  }

  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    globalThis.DDS_ACTIONS = DDS_ACTIONS;
    globalThis.DDS_MODEL = DDS_MODEL;
    globalThis.DDS_NODES = DDS_NODES;
    globalThis.DDS_PRODUCTS = DDS_PRODUCTS;
    DDS_STORE.newProject('Unit test', 'DDS_DEMANDS baseline', 'vitest');
  });

  it('getAll returns empty array when no project is loaded', () => {
    DDS_STORE.setProject(null);
    expect(DDS_DEMANDS.getAll()).toEqual([]);
  });

  it('create/get/getForNode manage demand records', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');

    var demand = await createDemand(nodeId, productId, { demand_value: 10, demand_period: 'weeks' });

    expect(demand).not.toBeNull();
    expect(DDS_DEMANDS.get(nodeId, productId).id).toBe(demand.id);
    expect(DDS_DEMANDS.getForNode(nodeId)).toHaveLength(1);
    expect(DDS_DEMANDS.getAll()).toHaveLength(1);
  });

  it('create is idempotent for an existing node-product pair', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');
    await createDemand(nodeId, productId, {});

    var second = await DDS_DEMANDS.create(nodeId, productId, { demand_value: 99 });

    expect(second).toEqual({ applied: [], failed: null });
    expect(DDS_DEMANDS.getAll()).toHaveLength(1);
  });

  it('update persists mutable demand fields', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');
    await createDemand(nodeId, productId, { demand_value: 10, demand_period: 'weeks' });

    var result = await DDS_DEMANDS.update(nodeId, productId, { demand_value: 25, demand_period: 'months' });

    expect(result.failed).toBeNull();
    var updated = DDS_DEMANDS.get(nodeId, productId);
    expect(updated.demand_value).toBe(25);
    expect(updated.demand_period).toBe('months');
  });

  it('delete removes the demand', async () => {
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');
    await createDemand(nodeId, productId, {});

    var result = await DDS_DEMANDS.delete(nodeId, productId);

    expect(result.failed).toBeNull();
    expect(DDS_DEMANDS.get(nodeId, productId)).toBeNull();
  });

  it('showOnMap/isVisibleOnMap/hideFromMap manage presentation visibility', async () => {
    var mapId = DDS_STORE.query('maps')[0].id;
    var nodeId = await createNode('N1');
    var productId = await createProduct('P1');
    var demand = await createDemand(nodeId, productId, {});

    expect(DDS_DEMANDS.isVisibleOnMap(demand.id, mapId)).toBe(false);

    DDS_DEMANDS.showOnMap(demand.id, mapId);
    DDS_DEMANDS.showOnMap(demand.id, mapId);
    expect(DDS_DEMANDS.isVisibleOnMap(demand.id, mapId)).toBe(true);
    expect(DDS_STORE.query('map_demands', { demand_id: demand.id, map_id: mapId })).toHaveLength(1);

    DDS_DEMANDS.hideFromMap(demand.id, mapId);
    expect(DDS_DEMANDS.isVisibleOnMap(demand.id, mapId)).toBe(false);
  });
});
