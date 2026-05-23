// JS: DDS_TRANSACTIONS — snapshot-based undo/redo transaction manager
// CommWise block: SCRIPT 1860
// Testability: store-dependent
// Depends on: DDS_STORE (SCRIPT 150)
// API documented: yes

// DDS_TRANSACTION — Undo/Redo transaction manager
// Depends on: DDS_STORE (SCRIPT 150)
// Status: STUB — API surface only, no implementation
//
// Transaction ownership: called by UI layer modules only.
// DDS_ACTIONS is not transaction-aware.
// A single user interaction may chain multiple DDS_ACTIONS.execute() calls;
// the UI module starts, commits, or rolls back the wrapping transaction.



var DDS_TRANSACTIONS = (function () {
  // --- Internal state ---
  var undoStack = [];
  var redoStack = [];
  var currentTransaction = null;
  var _onChangeFn = null;

  // --- API ---
  function begin(label) {
    DDS_TOOLS.log.info('begin transaction: ' + label);
    // Capture DDS_STORE snapshot (stub)
    currentTransaction = { label: label, snapshot: null, id: Date.now() };
    // TODO: snapshot = DDS_STORE.toJson()
    return currentTransaction.id;
  }

  function commit(transactionId) {
    DDS_TOOLS.log.info('commit transaction: ' + transactionId);
    // Push snapshot to undo stack (stub)
    if (currentTransaction && currentTransaction.id === transactionId) {
      undoStack.push(currentTransaction);
      currentTransaction = null;
      redoStack.length = 0;
      _fireChange();
    }
  }

  function rollback(transactionId) {
    DDS_TOOLS.log.info('rollback transaction: ' + transactionId);
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
      _fireChange();
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
      _fireChange();
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
    _fireChange();
  }

  function onChange(fn) {
    _onChangeFn = (typeof fn === 'function') ? fn : null;
  }

  function _fireChange() {
    if (typeof _onChangeFn === 'function') _onChangeFn();
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
    clear: clear,
    onChange: onChange
  };
}());

// ESM export for Vitest compatibility
export default DDS_TRANSACTIONS;
