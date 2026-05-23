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

window.DDS_TRANSACTION = (() => {

  // --- Private state ---
  let _onChangeFn = null;

  // --- Public API ---

  /**
   * Begin a named transaction. Captures a snapshot of DDS_STORE state.
   * @param {string} label - Human-readable description (used in undo UI)
   * @returns {string} transactionId
   */
  function begin(label) {
    // TODO: snapshot DDS_STORE.toJson(), push to undo stack
    console.warn('[DDS_TRANSACTION] begin() not implemented', label);
    return 'tx_stub';
  }

  /**
   * Commit the current transaction. Marks it as a stable undo point.
   * @param {string} transactionId
   */
  function commit(transactionId) {
    // TODO: seal transaction in undo stack
    console.warn('[DDS_TRANSACTION] commit() not implemented', transactionId);
    _fireChange();
  }

  /**
   * Rollback the current transaction. Restores DDS_STORE to pre-begin snapshot.
   * @param {string} transactionId
   */
  function rollback(transactionId) {
    // TODO: restore snapshot via DDS_STORE.loadFromText()
    console.warn('[DDS_TRANSACTION] rollback() not implemented', transactionId);
  }

  /**
   * Undo the last committed transaction.
   * @returns {boolean} true if an undo was available
   */
  function undo() {
    // TODO: pop undo stack, push to redo stack, restore snapshot
    console.warn('[DDS_TRANSACTION] undo() not implemented');
    _fireChange();
    return false;
  }

  /**
   * Redo the last undone transaction.
   * @returns {boolean} true if a redo was available
   */
  function redo() {
    // TODO: pop redo stack, push to undo stack, restore snapshot
    console.warn('[DDS_TRANSACTION] redo() not implemented');
    _fireChange();
    return false;
  }

  /**
   * Returns true if undo is available.
   * @returns {boolean}
   */
  function canUndo() {
    return false; // TODO
  }

  /**
   * Returns true if redo is available.
   * @returns {boolean}
   */
  function canRedo() {
    return false; // TODO
  }

  /**
   * Clear all undo/redo history (e.g. on project open).
   */
  function clear() {
    // TODO: reset both stacks
    console.warn('[DDS_TRANSACTION] clear() not implemented');
    _fireChange();
  }

  /**
   * Register a callback fired after any undo/redo/clear/commit.
   * Called with no arguments.
   * @param {function} fn
   */
  function onChange(fn) {
    _onChangeFn = (typeof fn === 'function') ? fn : null;
  }

  // Internal helper — fires the registered onChange callback if any.
  function _fireChange() {
    if (typeof _onChangeFn === 'function') _onChangeFn();
  }

  return { begin, commit, rollback, undo, redo, canUndo, canRedo, clear, onChange };

})();

export default window.DDS_TRANSACTION;

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
