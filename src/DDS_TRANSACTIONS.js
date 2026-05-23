// JS: DDS_TRANSACTIONS — snapshot-based undo/redo transaction manager
// CommWise block: SCRIPT 1860
// Testability: store-dependent
// Depends on: DDS_STORE (SCRIPT 150)
// API documented: yes

var DDS_TRANSACTIONS = (function () {
  // --- Internal state ---
  var undoStack = [];
  var redoStack = [];
  var currentTransaction = null;

  // --- API ---
  function begin(label) {
    // Capture DDS_STORE snapshot (stub)
    currentTransaction = { label: label, snapshot: null, id: Date.now() };
    // TODO: snapshot = DDS_STORE.toJson()
    return currentTransaction.id;
  }

  function commit(transactionId) {
    // Push snapshot to undo stack (stub)
    if (currentTransaction && currentTransaction.id === transactionId) {
      undoStack.push(currentTransaction);
      currentTransaction = null;
      redoStack.length = 0;
    }
  }

  function rollback(transactionId) {
    // Restore DDS_STORE snapshot (stub)
    if (currentTransaction && currentTransaction.id === transactionId) {
      // TODO: DDS_STORE.loadFromText(currentTransaction.snapshot)
      currentTransaction = null;
    }
  }

  function undo() {
    // Pop from undo, push to redo, restore snapshot (stub)
    if (undoStack.length > 0) {
      var tx = undoStack.pop();
      // TODO: DDS_STORE.loadFromText(tx.snapshot)
      redoStack.push(tx);
      return true;
    }
    return false;
  }

  function redo() {
    // Pop from redo, push to undo, restore snapshot (stub)
    if (redoStack.length > 0) {
      var tx = redoStack.pop();
      // TODO: DDS_STORE.loadFromText(tx.snapshot)
      undoStack.push(tx);
      return true;
    }
    return false;
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function clear() {
    undoStack.length = 0;
    redoStack.length = 0;
    currentTransaction = null;
  }

  // --- Public API ---
  return {
    begin: begin,
    commit: commit,
    rollback: rollback,
    undo: undo,
    redo: redo,
    canUndo: canUndo,
    canRedo: canRedo,
    clear: clear
  };
}());

// ESM export for Vitest compatibility
export default DDS_TRANSACTIONS;
