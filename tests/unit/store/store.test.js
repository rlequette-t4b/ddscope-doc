import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('DDS_STORE core behavior', () => {
  beforeEach(() => {
    globalThis.DDS_STORE = DDS_STORE;
    DDS_STORE.onDirtyChange = null;
    DDS_STORE.newProject('Unit test', 'DDS_STORE baseline', 'vitest');
  });

  it('newProject initializes expected structure and creates default map', () => {
    var project = DDS_STORE.getProject();

    expect(project.version).toBe(1);
    expect(project.project.name).toBe('Unit test');
    expect(project.maps).toHaveLength(1);
    expect(project.maps[0].name).toBe('Map 1');
    expect(DDS_STORE.isDirty()).toBe(false);
  });

  it('insert/query/update/remove perform CRUD and toggle dirty state', () => {
    var inserted = DDS_STORE.insert('nodes', { name: 'A', type_code: 'PLANT' })[0];
    expect(inserted.id).toBeGreaterThan(0);
    expect(DDS_STORE.isDirty()).toBe(true);

    DDS_STORE.resetDirty();
    expect(DDS_STORE.isDirty()).toBe(false);

    var updated = DDS_STORE.update('nodes', { id: inserted.id }, { name: 'A+' });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('A+');
    expect(DDS_STORE.isDirty()).toBe(true);

    DDS_STORE.resetDirty();
    var removed = DDS_STORE.remove('nodes', { id: inserted.id });
    expect(removed).toHaveLength(1);
    expect(DDS_STORE.query('nodes', { id: inserted.id })).toEqual([]);
    expect(DDS_STORE.isDirty()).toBe(true);
  });

  it('query supports loose filter matching and ordering', () => {
    DDS_STORE.insert('nodes', [{ name: 'B', weight: 2 }, { name: 'A', weight: 1 }]);

    var byLooseMatch = DDS_STORE.query('nodes', { id: '1' });
    expect(byLooseMatch).toHaveLength(1);

    var ordered = DDS_STORE.query('nodes', null, { order: 'name.asc' });
    expect(ordered[0].name).toBe('A');
    expect(ordered[1].name).toBe('B');
  });

  it('toJson and loadFromText round-trip project data and keep missing tables safe', () => {
    DDS_STORE.insert('nodes', { name: 'Roundtrip' });
    var text = DDS_STORE.toJson();

    DDS_STORE.loadFromText(text);
    expect(DDS_STORE.query('nodes')).toHaveLength(1);
    expect(DDS_STORE.isDirty()).toBe(false);

    var minimal = JSON.stringify({ version: 1, project: { name: 'Imported' } });
    DDS_STORE.loadFromText(minimal);
    expect(Array.isArray(DDS_STORE.query('flows'))).toBe(true);
    expect(Array.isArray(DDS_STORE.query('map_demands'))).toBe(true);
  });

  it('loadFromText rejects invalid DDScope payloads', () => {
    expect(function () {
      DDS_STORE.loadFromText('{"version":1}');
    }).toThrow('Invalid DDScope file');
  });

  it('emits onDirtyChange notifications for dirty/clean transitions', () => {
    var listener = vi.fn();
    DDS_STORE.onDirtyChange = listener;

    DDS_STORE.insert('nodes', { name: 'A' });
    DDS_STORE.resetDirty();
    DDS_STORE.markDirty();

    expect(listener).toHaveBeenCalledWith(true, 'Unit test');
    expect(listener).toHaveBeenCalledWith(false, 'Unit test');
  });

  it('throws on table operations when no project is loaded', () => {
    DDS_STORE.setProject(null);

    expect(function () {
      DDS_STORE.query('nodes');
    }).toThrow('[DDS_STORE] No project loaded');
  });
});
