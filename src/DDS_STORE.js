// AUDITOR:LARGE_BLOCK_JUSTIFIED - Single-responsibility store: memory CRUD + file persistence, must be complete.
// ============================================================
// DDS_STORE  In-memory project store + file persistence
// ============================================================
// All DDScope data access goes through this module.
// Private _state holds { project, dirty }  no dependency on DDS global.
// Files are .json  File System Access API when available,
// download/upload fallback on other browsers.
// ============================================================

var DDS_STORE = (function () {

  var _counters = {};                  // auto-increment counters per table

  // Private state  isolated from DDS global for testability
  var _state = {
    project: null,
    dirty:   false
  };

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  function _table(name) {
    var p = _state.project;
    if (!p) throw new Error('[DDS_STORE] No project loaded');
    if (!p[name]) p[name] = [];
    return p[name];
  }

  function _nextId(table) {
    if (!_counters[table]) {
      // Seed from existing data
      var rows = _state.project && _state.project[table];
      _counters[table] = rows && rows.length
        ? Math.max.apply(null, rows.map(function(r) { return r.id || 0; }))
        : 0;
    }
    _counters[table] += 1;
    return _counters[table];
  }

  function _match(row, filters) {
    if (!filters) return true;
    return Object.keys(filters).every(function(k) {
      var val = filters[k];
      if (Array.isArray(val)) return val.indexOf(row[k]) !== -1;
      // Use loose equality to handle int/string mismatches (e.g. mapId from DOM vs stored integer)
      return row[k] == val; // jshint ignore:line
    });
  }

  function _markDirty() {
    _state.dirty = true;
    var name = (_state.project && _state.project.project && _state.project.project.name) || 'Untitled';
    if (typeof DDS_STORE.onDirtyChange === 'function') DDS_STORE.onDirtyChange(true, name);
  }

  function _markClean(name) {
    _state.dirty = false;
    var resolvedName = name || (_state.project && _state.project.project && _state.project.project.name) || 'Untitled';
    if (typeof DDS_STORE.onDirtyChange === 'function') DDS_STORE.onDirtyChange(false, resolvedName);
  }

  // ------------------------------------------------------------------
  // Memory CRUD (synchronous)
  // ------------------------------------------------------------------

  var api = {};
  // ------------------------------------------------------------------
  // Snapshot for transactions API 
  // a snapshot is a record of the initial state of objects before a transaction, allowing to restore them if needed.
  // ------------------------------------------------------------------

 
  var _snapshots = null; // Internal list to hold snapshots during a transaction

  // Initialize the snapshot list at the beginning of a transaction 
  api.beginSnapshot = function() {
    // throws an error if a transaction is already in progress
    if (_snapshots !== null) {
      throw new Error('A snapshot is already in progress');
    }
    _snapshots = [];
  }

  // finish the current transaction and returns the snapshot list
  api.endSnapshot = function() {
    var snapshots = _snapshots;
    _snapshots = null;
    return snapshots;
  }


  // Add a snapshot record to the current transaction
  // each record is an array [current, backup, table]
  // where backup is a copy of the object at begining of the snapshot
  //  backup  = null -> object was created after the snapshot began, so should be deleted on restore
  //  current = null -> object was deleted after the snapshot began, so should be restored on restore
  //  current and backup are both non-null -> object was updated after the snapshot began, so should be restored to backup on restore
  var _addSnapshot = function(current, backup, table) {
    // check if snapshot in progress
    if (_snapshots !== null) {
      // if object is created record it
      if (!backup) {
        _snapshots.push([current, null, table]);
        return;
      }    
      // if object is already in the snaphot it's ok
      if (_snapshots.find(function(s) {
            s[1] === current;
      })) {
        return
      }  
      // if object is deleted check is was not created in the snaphot
      // then just remove the creation
      // updated then deleted already taken care of previously
      if (!current) {
        var index = _snapshots.findIndex(function(s) {
          return s[0] === backup;
        });
        if (index !== -1) {
          _snapshots.splice(index, 1);
        }
      } 
      // first update record
      _snapshots.push([current, backup, table]);
    }
  };

  // restore a snaphot
  // returns a snapshot for the current state , allowing redo
  api.restoreSnapshot = function(snapshots) {
    // throws an error if a transaction is in progress
    if (_snapshots !== null) {
      throw new Error('Cannot restore snapshots during an active transaction');
    }
    var redoSnapshots = [];
    snapshots.forEach(function(s) {
      var current = s[0], backup = s[1], table = s[2];
      if (!backup) {
        // object was created after the snapshot began
        table.pop(); // it was the last when inserted
        redoSnapshots.unshift([null, current, table]); // redo will delete
      } else if (!current) {
        // object was deleted after the snapshot began
        table.push(backup); // add back in the table
        redoSnapshots.unshift([backup, null, table]);
      } else {
        // object was updated after the snapshot began
        // properties should be exchanged between current and backup
        Object.keys(backup).forEach(function(k) {
          var temp = current[k];
          current[k] = backup[k];
          backup[k] = temp;
        });
        redoSnapshots.unshift([backup, current, table]);
      }
    });
    return redoSnapshots;
  };

  // rollback the current transaction
  // restore the state before beginSnapshots was called, and clear the snapshot list
  // does nothing if no transaction is in progress
  api.rollbackSnapshot= function() {
    if (_snapshots != null) {
      var snapshots = _snapshots;
      _snapshots = null;
      api.restoreSnapshot(snapshots);
    }
  }


  // query(table, filters?, options?)
  // options: { order: 'field.asc|desc' }
  // Returns array of matching records.
  api.query = function(table, filters, options) {
    var rows = _table(table).filter(function(r) { return _match(r, filters); });
    if (options && options.order) {
      var parts = options.order.split('.');
      var field = parts[0], dir = parts[1] || 'asc';
      rows = rows.slice().sort(function(a, b) {
        if (a[field] < b[field]) return dir === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return dir === 'asc' ?  1 : -1;
        return 0;
      });
    }
    return rows;
  };

  // insert(table, records)
  // records: object or array. Returns array of inserted records with generated ids.
  api.insert = function(table, records) {
    var arr = Array.isArray(records) ? records : [records];
    var now = new Date().toISOString();
    var inserted = arr.map(function(r) {
      var row = Object.assign({}, r, {
        id: _nextId(table),
        created_at: now,
        updated_at: now
      });
      _table(table).push(row);
      _addSnapshot(row, null, _table(table)); // record creation in snapshot for potential rollback
      return row;
    });
    _markDirty();
    return inserted;
  };

  // update(table, filters, updates)
  // Returns array of updated records.
  api.update = function(table, filters, updates) {
    var now = new Date().toISOString();
    var updated = [];
    _table(table).forEach(function(r) {
      if (_match(r, filters)) {
        _addSnapshot(r, Object.assign({}, r), _table(table)); // record update in snapshot for potential rollback
        Object.assign(r, updates, { updated_at: now });
        updated.push(r);
      }
    });
    if (updated.length) {
      _markDirty();
    }
    return updated;
  };

  // remove(table, filters)
  // Returns array of removed records.
  api.remove = function(table, filters) {
    var tbl = _table(table);
    var removed = [];
    var kept = [];
    tbl.forEach(function(r) {
      if (_match(r, filters)) { 
        removed.push(r); 
        _addSnapshot(null, r, tbl); // record deletion in snapshot for potential rollback
      }
      else { kept.push(r); }
    });
    _state.project[table] = kept;
    if (removed.length) {
      _markDirty();
    }
    return removed;
  };

  // ------------------------------------------------------------------
  // Project structure helpers
  // ------------------------------------------------------------------

  // Build a blank project JSON structure
  function _blankProject(name, description, createdBy) {
    return {
      version: 1,
      project:        { name: name || 'Untitled', description: description || '', created_by: createdBy || '' },
      swim_lanes:     [],
      node_types:     [],
      product_types:  [],
      nodes:          [],
      products:       [],
      flows:          [],
      skus:           [],
      boms:           [],
      bom_components: [],
      tag_styles:     [],
      demands:        [],
      maps:           [],
      map_nodes:      [],
      map_flows:      [],
      map_swim_lanes: [],
      map_demands:    [],
      annotations:    [],
      map_annotations: []
    };
  }

  // Seed counters from loaded project
  function _seedCounters(project) {
    _counters = {};
    var tables = ['swim_lanes','node_types','product_types','nodes','products',
      'flows','skus','boms','bom_components','tag_styles','demands',
      'annotations','maps','map_nodes','map_flows','map_swim_lanes','map_demands','map_annotations'];
    tables.forEach(function(t) {
      var rows = project[t];
      _counters[t] = (rows && rows.length)
        ? Math.max.apply(null, rows.map(function(r) { return r.id || 0; }))
        : 0;
    });
  }

  // ------------------------------------------------------------------
  // Serialisation (no file I/O  caller handles acquisition)
  // ------------------------------------------------------------------

  // Serialise current project to JSON string.
  api.toJson = function() {
    return JSON.stringify(_state.project, null, 2);
  };

  // Parse a JSON string and load it into memory.
  // Throws if the file is not a valid DDScope project.
  api.loadFromText = function(text) {
    var json = JSON.parse(text);
    if (!json.project || !json.version) throw new Error('Invalid DDScope file');
    // Ensure all table arrays exist
    var tables = ['swim_lanes','node_types','product_types','nodes','products',
      'flows','skus','boms','bom_components','tag_styles','demands',
      'annotations','maps','map_nodes','map_flows','map_swim_lanes','map_demands','map_annotations'];
    tables.forEach(function(t) { if (!json[t]) json[t] = []; });
    _state.project = json;
    _seedCounters(json);
    _markClean();
  };

  // ------------------------------------------------------------------
  // Public project API
  // ------------------------------------------------------------------

  // Create a new empty project in memory.
  // createdBy: email or identifier of the creator (supplied by caller).
  api.newProject = function(name, description, createdBy) {
    var blank = _blankProject(name, description, createdBy || '');
    _state.project = blank;
    _counters = {};
    api.insert('maps', { name: 'Map 1', position: 1, legend_visible: true });
    _markClean(name);
    return blank;
  };

  // Expose clean reset for callers that trigger inserts during project open
  api.resetDirty = function() {
    _state.dirty = false;
    var name = (_state.project && _state.project.project && _state.project.project.name) || 'Untitled';
    if (typeof DDS_STORE.onDirtyChange === 'function') DDS_STORE.onDirtyChange(false, name);
  };

  // Expose dirty trigger for callers that modify state outside DDS_STORE (e.g. project metadata)
  api.markDirty = function() {
    _markDirty();
  };


  // ------------------------------------------------------------------
  // Public state accessors
  // ------------------------------------------------------------------

  // Returns the current project JSON object, or null if none loaded.
  api.getProject = function() {
    return _state.project;
  };

  // Replaces the current project object (used by shim and closeProject).
  api.setProject = function(json) {
    _state.project = json;
  };

  // Returns true if the project has unsaved changes.
  api.isDirty = function() {
    return _state.dirty;
  };

  // Callback wired by DDS_INIT  isolated from DOM for testability.
  // Signature: onDirtyChange(dirty: boolean, name: string)  void
  api.onDirtyChange = null;


  return api;

}());


export default DDS_STORE;



