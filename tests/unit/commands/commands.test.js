// Unit tests for DDS_CMD.js — notes domain (FEAT-002)
// Covers: note_categories CRUD + cascade, notes CRUD + map_notes, reorder, undo/redo

import { beforeEach, describe, it, expect } from 'vitest';

function setup() {
  DDS_STORE.newProject('CMD test', '', 'vitest');
  DDS_TRANSACTIONS.clear();
}

// Helper: get the id of the first map created by newProject
function getMapId() {
  return DDS_STORE.query('maps')[0].id;
}

// ------------------------------------------------------------------ //
// DDS_TX catalogue — notes keys
// ------------------------------------------------------------------ //

describe('DDS_TX — notes keys', () => {
  it('exposes all note TX keys', () => {
    expect(DDS_TX.NOTE_CATEGORY_CREATE).toBe('note_category.create');
    expect(DDS_TX.NOTE_CATEGORY_UPDATE).toBe('note_category.update');
    expect(DDS_TX.NOTE_CATEGORY_DELETE).toBe('note_category.delete');
    expect(DDS_TX.NOTE_CATEGORY_REORDER).toBe('note_category.reorder');
    expect(DDS_TX.NOTE_CREATE).toBe('note.create');
    expect(DDS_TX.NOTE_UPDATE).toBe('note.update');
    expect(DDS_TX.NOTE_DELETE).toBe('note.delete');
    expect(DDS_TX.NOTE_REORDER).toBe('note.reorder');
  });
});

// ------------------------------------------------------------------ //
// DDS_CMD.execute — basics
// ------------------------------------------------------------------ //

describe('DDS_CMD.execute — basics', () => {
  beforeEach(setup);

  it('returns { ok: false } for unknown txKey', () => {
    const result = DDS_CMD.execute('unknown.key', {}, null);
    expect(result.ok).toBe(false);
  });

  it('returns { ok: true, id } on success', () => {
    const result = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'General' }, null);
    expect(result.ok).toBe(true);
    expect(typeof result.id).toBe('number');
  });

  it('calls onSuccess after commit', () => {
    let called = false;
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'X' }, null, () => { called = true; });
    expect(called).toBe(true);
  });

  it('does not call onSuccess on failure', () => {
    let called = false;
    DDS_CMD.execute('bad.key', {}, null, () => { called = true; });
    expect(called).toBe(false);
  });
});

// ------------------------------------------------------------------ //
// NOTE_CATEGORY_CREATE
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_CATEGORY_CREATE', () => {
  beforeEach(setup);

  it('inserts a note_category record', () => {
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Contraintes' }, null);
    const cats = DDS_STORE.query('note_categories');
    expect(cats.length).toBe(1);
    expect(cats[0].label).toBe('Contraintes');
  });

  it('auto-assigns position 0 when no categories exist', () => {
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'First' }, null);
    expect(DDS_STORE.query('note_categories')[0].position).toBe(0);
  });

  it('auto-appends position after last category', () => {
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'A' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'B' }, null);
    const cats = DDS_STORE.query('note_categories', null, { order: 'position.asc' });
    expect(cats[1].position).toBe(1);
  });

  it('respects explicit position param', () => {
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'X', position: 5 }, null);
    expect(DDS_STORE.query('note_categories')[0].position).toBe(5);
  });

  it('is undoable', () => {
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Undo me' }, null);
    expect(DDS_STORE.query('note_categories').length).toBe(1);
    DDS_TRANSACTIONS.undo();
    expect(DDS_STORE.query('note_categories').length).toBe(0);
  });
});

// ------------------------------------------------------------------ //
// NOTE_CATEGORY_UPDATE
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_CATEGORY_UPDATE', () => {
  beforeEach(setup);

  it('updates the label', () => {
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Old' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_UPDATE, { id, label: 'New' }, null);
    expect(DDS_STORE.query('note_categories', { id })[0].label).toBe('New');
  });

  it('updates position independently', () => {
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'A', position: 0 }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_UPDATE, { id, position: 3 }, null);
    expect(DDS_STORE.query('note_categories', { id })[0].position).toBe(3);
  });

  it('is undoable', () => {
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Original' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_UPDATE, { id, label: 'Changed' }, null);
    DDS_TRANSACTIONS.undo();
    expect(DDS_STORE.query('note_categories', { id })[0].label).toBe('Original');
  });
});

// ------------------------------------------------------------------ //
// NOTE_CATEGORY_DELETE
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_CATEGORY_DELETE', () => {
  beforeEach(setup);

  it('removes the category record', () => {
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'ToDelete' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_DELETE, { id }, null);
    expect(DDS_STORE.query('note_categories', { id }).length).toBe(0);
  });

  it('cascades to notes in that category', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note 1' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note 2' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_DELETE, { id: catId }, null);
    expect(DDS_STORE.query('notes', { category_id: catId }).length).toBe(0);
  });

  it('cascades to map_notes of notes in that category', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_DELETE, { id: catId }, null);
    expect(DDS_STORE.query('map_notes', { map_id: mapId }).length).toBe(0);
  });

  it('does not delete notes in other categories', () => {
    const mapId = getMapId();
    const { id: catA } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'A' }, null);
    const { id: catB } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'B' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catA, content: 'Note A' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catB, content: 'Note B' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_DELETE, { id: catA }, null);
    expect(DDS_STORE.query('notes', { category_id: catB }).length).toBe(1);
  });

  it('is undoable — restores category, its notes, and their map_notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_DELETE, { id: catId }, null);
    DDS_TRANSACTIONS.undo();
    expect(DDS_STORE.query('note_categories', { id: catId }).length).toBe(1);
    expect(DDS_STORE.query('notes', { category_id: catId }).length).toBe(1);
    expect(DDS_STORE.query('map_notes', { map_id: mapId }).length).toBe(1);
  });
});

// ------------------------------------------------------------------ //
// NOTE_CATEGORY_REORDER
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_CATEGORY_REORDER', () => {
  beforeEach(setup);

  it('updates positions of multiple categories', () => {
    const { id: a } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'A', position: 0 }, null);
    const { id: b } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'B', position: 1 }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_REORDER, { order: [{ id: a, position: 1 }, { id: b, position: 0 }] }, null);
    expect(DDS_STORE.query('note_categories', { id: a })[0].position).toBe(1);
    expect(DDS_STORE.query('note_categories', { id: b })[0].position).toBe(0);
  });
});

// ------------------------------------------------------------------ //
// NOTE_CREATE
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_CREATE', () => {
  beforeEach(setup);

  it('returns { ok: false } when mapId is null', () => {
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const result = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'No map' }, null);
    expect(result.ok).toBe(false);
  });

  it('rolls back cleanly when mapId is null — no note or map_notes created', () => {
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'No map' }, null);
    expect(DDS_STORE.query('notes', { category_id: catId }).length).toBe(0);
    expect(DDS_STORE.query('map_notes').length).toBe(0);
  });

  it('inserts a note in the given category', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Hello' }, mapId);
    const notes = DDS_STORE.query('notes', { category_id: catId });
    expect(notes.length).toBe(1);
    expect(notes[0].content).toBe('Hello');
  });

  it('creates a map_notes record for the active map', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: noteId } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Hello' }, mapId);
    expect(DDS_STORE.query('map_notes', { map_id: mapId, note_id: noteId }).length).toBe(1);
  });

  it('auto-assigns position 0 when category is empty', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'First' }, mapId);
    expect(DDS_STORE.query('notes', { id })[0].position).toBe(0);
  });

  it('auto-appends position after last note in category', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'A' }, mapId);
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'B' }, mapId);
    expect(DDS_STORE.query('notes', { id })[0].position).toBe(1);
  });

  it('is undoable — removes both note and map_notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: noteId } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'To undo' }, mapId);
    DDS_TRANSACTIONS.undo();
    expect(DDS_STORE.query('notes', { category_id: catId }).length).toBe(0);
    expect(DDS_STORE.query('map_notes', { note_id: noteId }).length).toBe(0);
  });
});

// ------------------------------------------------------------------ //
// NOTE_UPDATE
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_UPDATE', () => {
  beforeEach(setup);

  it('updates the content of a note', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Old' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_UPDATE, { id, content: 'New' }, null);
    expect(DDS_STORE.query('notes', { id })[0].content).toBe('New');
  });

  it('is undoable', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Original' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_UPDATE, { id, content: 'Changed' }, null);
    DDS_TRANSACTIONS.undo();
    expect(DDS_STORE.query('notes', { id })[0].content).toBe('Original');
  });
});

// ------------------------------------------------------------------ //
// NOTE_DELETE
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_DELETE', () => {
  beforeEach(setup);

  it('removes the note record', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Bye' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_DELETE, { id }, null);
    expect(DDS_STORE.query('notes', { id }).length).toBe(0);
  });

  it('cascades to map_notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: noteId } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Bye' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_DELETE, { id: noteId }, null);
    expect(DDS_STORE.query('map_notes', { note_id: noteId }).length).toBe(0);
  });

  it('does not affect other notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: a } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Keep' }, mapId);
    const { id: b } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Delete' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_DELETE, { id: b }, null);
    expect(DDS_STORE.query('notes', { id: a }).length).toBe(1);
  });

  it('is undoable — restores note and map_notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: noteId } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Restore me' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_DELETE, { id: noteId }, null);
    DDS_TRANSACTIONS.undo();
    expect(DDS_STORE.query('notes', { id: noteId }).length).toBe(1);
    expect(DDS_STORE.query('map_notes', { note_id: noteId }).length).toBe(1);
  });
});

// ------------------------------------------------------------------ //
// NOTE_REORDER
// ------------------------------------------------------------------ //

describe('DDS_TX.NOTE_REORDER', () => {
  beforeEach(setup);

  it('updates positions of multiple notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: a } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'A', position: 0 }, mapId);
    const { id: b } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'B', position: 1 }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_REORDER, { order: [{ id: a, position: 1 }, { id: b, position: 0 }] }, null);
    expect(DDS_STORE.query('notes', { id: a })[0].position).toBe(1);
    expect(DDS_STORE.query('notes', { id: b })[0].position).toBe(0);
  });
});

// ------------------------------------------------------------------ //
// MAP_DELETE cascade — map_notes
// ------------------------------------------------------------------ //

describe('DDS_TX.MAP_DELETE cascade — map_notes', () => {
  beforeEach(setup);

  it('deleting a map removes its map_notes', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note A' }, mapId);
    DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note B' }, mapId);
    // Create a second map so the first is not the last
    DDS_STORE.insert('maps', { name: 'Map 2', position: 2 });
    DDS_CMD.execute(DDS_TX.MAP_DELETE, { id: mapId }, null);
    expect(DDS_STORE.query('map_notes', { map_id: mapId }).length).toBe(0);
  });

  it('deleting a map does not remove map_notes on other maps', () => {
    const mapId = getMapId();
    const { id: catId } = DDS_CMD.execute(DDS_TX.NOTE_CATEGORY_CREATE, { label: 'Cat' }, null);
    const { id: noteId } = DDS_CMD.execute(DDS_TX.NOTE_CREATE, { category_id: catId, content: 'Note' }, mapId);
    // Place the same note on a second map
    const map2 = DDS_STORE.insert('maps', { name: 'Map 2', position: 2 })[0];
    DDS_STORE.insert('map_notes', { map_id: map2.id, note_id: noteId });
    DDS_CMD.execute(DDS_TX.MAP_DELETE, { id: mapId }, null);
    expect(DDS_STORE.query('map_notes', { map_id: map2.id }).length).toBe(1);
  });

  it('refuses to delete the last map', () => {
    const mapId = getMapId();
    const result = DDS_CMD.execute(DDS_TX.MAP_DELETE, { id: mapId }, null);
    expect(result.ok).toBe(false);
    expect(DDS_STORE.query('maps').length).toBe(1);
  });
});
