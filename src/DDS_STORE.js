// ------------------------------------------------------------------
  // Transaction/Delta API
  // ------------------------------------------------------------------

  var api = {};

  // Adds a listener called after each change, receiving the generated delta
  api.onChange = function(fn) {
    this._changeListener = (typeof fn === 'function') ? fn : null;
  };

  // Restores the model to the state before the given delta
  api.restore = function(delta) {
    // Pour l'instant, on suppose que le delta est un snapshot JSON (string)
    this.loadFromText(typeof delta === 'string' ? delta : JSON.stringify(delta));
  };

  // Appeler le listener après chaque modification
  function _fireChange(delta) {
    if (typeof api._changeListener === 'function') api._changeListener(delta);
  }

  // ------------------------------------------------------------------
  // Memory CRUD (synchronous)
  // ------------------------------------------------------------------

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
      return row;
    });
    _markDirty();
    _fireChange(api.toJson());
    return inserted;
  };

  // update(table, filters, updates)
  // Returns array of updated records.
  api.update = function(table, filters, updates) {
    var now = new Date().toISOString();
    var updated = [];
    _table(table).forEach(function(r) {
      if (_match(r, filters)) {
        Object.assign(r, updates, { updated_at: now });
        updated.push(r);
      }
    });
    if (updated.length) {
      _markDirty();
      _fireChange(api.toJson());
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
      if (_match(r, filters)) { removed.push(r); }
      else { kept.push(r); }
    });
    _state.project[table] = kept;
    if (removed.length) {
      _markDirty();
      _fireChange(api.toJson());
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



