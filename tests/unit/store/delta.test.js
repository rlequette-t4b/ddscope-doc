import { describe, it, expect, beforeEach } from 'vitest';
import DDS_STORE from '../../../src/DDS_STORE.js';

describe('DDS_STORE delta/restore', () => {
  let deltas;

  beforeEach(() => {
    DDS_STORE.newProject('Delta test', 'Test delta/restore', 'vitest');
    deltas = [];
    DDS_STORE.onChange((delta) => {
      deltas.push(delta);
    });
  });

  it('restore ramène le store à l\'état précédent avec le dernier delta capturé', () => {
    // État initial : aucun node
    expect(DDS_STORE.query('nodes')).toHaveLength(0);

    // On modifie le store (insertion)
    DDS_STORE.insert('nodes', { name: 'A', type_code: 'PLANT' });
    expect(DDS_STORE.query('nodes')).toHaveLength(1);
    expect(deltas.length).toBeGreaterThan(0);

    // On restaure l'état précédent avec le dernier delta capturé
    const lastDelta = deltas[deltas.length - 1];
    DDS_STORE.restore(lastDelta);
    expect(DDS_STORE.query('nodes')).toHaveLength(0);
  });
});
