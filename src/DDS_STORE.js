// AUDITOR:LARGE_BLOCK_JUSTIFIED - Single-responsibility store: memory CRUD + file persistence, must be complete.
// ============================================================
// DDS_STORE — In-memory project store + file persistence
// ============================================================
// All DDScope data access goes through this module.
// DDS.state.project holds the full project JSON in memory.
// Files are .json — File System Access API when available,
// download/upload fallback on other browsers.
// ============================================================

var DDS_STORE = (function () {

  var FS_HANDLE_KEY = 'dds_fs_handle'; // localStorage key for FileSystemFileHandle
  var _fileHandle = null;              // current FileSystemFileHandle (Chrome/Edge)
  var _counters = {};                  // auto-increment counters per table

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  function _table(name) {
    var p = DDS.state.project;
    if (!p) throw new Error('[DDS_STORE] No project loaded');
    if (!p[name]) p[name] = [];
    return p[name];
  }

  function _nextId(table) {
    if (!_counters[table]) {
      // Seed from existing data
      var rows = DDS.state.project && DDS.state.project[table];
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
    DDS.state.dirty = true;
    var name = (DDS.state.project && DDS.state.project.project && DDS.state.project.project.name) || 'Untitled';
    if (typeof DDS_STORE.onDirtyChange === 'function') DDS_STORE.onDirtyChange(true, name);
  }

  function _markClean(name) {
    DDS.state.dirty = false;
    var resolvedName = name || (DDS.state.project && DDS.state.project.project && DDS.state.project.project.name) || 'Untitled';
    if (typeof DDS_STORE.onDirtyChange === 'function') DDS_STORE.onDirtyChange(false, resolvedName);
  }

  // ------------------------------------------------------------------
  // Memory CRUD (synchronous)
  // ------------------------------------------------------------------

  var api = {};

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
    if (updated.length) _markDirty();
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
    DDS.state.project[table] = kept;
    if (removed.length) _markDirty();
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
      map_demands:    []
    };
  }

  function _defaultNodeTypes() {
    return [
      { id:1, code:'SUPPLIER',  label:'Supplier',    shape:'diamond',   is_default:false, created_at:'', updated_at:'' },
      { id:2, code:'PLANT',     label:'Plant',       shape:'rectangle', is_default:true,  created_at:'', updated_at:'' },
      { id:3, code:'WH',        label:'Warehouse',   shape:'rectangle', is_default:false, created_at:'', updated_at:'' },
      { id:4, code:'CUSTOMER',  label:'Customer',    shape:'ellipse',   is_default:false, created_at:'', updated_at:'' },
      { id:5, code:'3PL',       label:'3PL',         shape:'hexagon',   is_default:false, created_at:'', updated_at:'' }
    ];
  }

  function _defaultProductTypes() {
    return [
      { id:1, code:'RM',  label:'Raw Material',    shape:'ellipse',   color:'#4A90D9', is_default:false, created_at:'', updated_at:'' },
      { id:2, code:'WIP', label:'WIP',             shape:'ellipse',   color:'#E8A838', is_default:false, created_at:'', updated_at:'' },
      { id:3, code:'FG',  label:'Finished Good',   shape:'ellipse',   color:'#5BA85A', is_default:true,  created_at:'', updated_at:'' }
    ];
  }

  // Seed counters from loaded project
  function _seedCounters(project) {
    _counters = {};
    var tables = ['swim_lanes','node_types','product_types','nodes','products',
      'flows','skus','boms','bom_components','tag_styles','demands',
      'maps','map_nodes','map_flows','map_swim_lanes','map_demands'];
    tables.forEach(function(t) {
      var rows = project[t];
      _counters[t] = (rows && rows.length)
        ? Math.max.apply(null, rows.map(function(r) { return r.id || 0; }))
        : 0;
    });
  }

  // ------------------------------------------------------------------
  // File persistence
  // ------------------------------------------------------------------

  var _hasFileAPI = typeof window.showOpenFilePicker === 'function';

  // Save FileSystemFileHandle to localStorage
  async function _persistHandle(handle) {
    try {
      _fileHandle = handle;
      // IndexedDB would be ideal but localStorage + serialisation is simpler
      // FileSystemFileHandle cannot be JSON-serialised directly — store via IndexedDB
      var db = await _openHandleDB();
      var tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'last');
    } catch(e) { /* silently ignore */ }
  }

  function _openHandleDB() {
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open('dds_store', 1);
      req.onupgradeneeded = function(e) {
        e.target.result.createObjectStore('handles');
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  }

  async function _loadHandle() {
    try {
      var db = await _openHandleDB();
      return await new Promise(function(resolve, reject) {
        var tx = db.transaction('handles', 'readonly');
        var req = tx.objectStore('handles').get('last');
        req.onsuccess = function(e) { resolve(e.target.result || null); };
        req.onerror   = function(e) { reject(e.target.error); };
      });
    } catch(e) { return null; }
  }

  function _projectToJson() {
    return JSON.stringify(DDS.state.project, null, 2);
  }

  function _loadFromJson(text) {
    var json = JSON.parse(text);
    if (!json.project || !json.version) throw new Error('Invalid DDScope file');
    // Migrate legacy key: tag_colors -> tag_styles
    if (json.tag_colors && !json.tag_styles) json.tag_styles = json.tag_colors;
    delete json.tag_colors;
    // Ensure all table arrays exist
    var tables = ['swim_lanes','node_types','product_types','nodes','products',
      'flows','skus','boms','bom_components','tag_styles','demands',
      'maps','map_nodes','map_flows','map_swim_lanes','map_demands'];
    tables.forEach(function(t) { if (!json[t]) json[t] = []; });
    DDS.state.project = json;
    _seedCounters(json);
  }

  // ------------------------------------------------------------------
  // Public file API
  // ------------------------------------------------------------------

  // Create a new empty project in memory
  api.newProject = async function(name, description) {
    var ctx = await APP_CONTEXT.ready();
    var blank = _blankProject(name, description, ctx.user.email);
    DDS.state.project = blank;
    _counters = {};
    // Seed default type counters
    _counters['node_types']    = blank.node_types.length;
    _counters['product_types'] = blank.product_types.length;
    // Create first map
    api.insert('maps', { name: 'Map 1', position: 1, legend_visible: true });
    _fileHandle = null;
    _markClean(name);
    return blank;
  };

  // Open a project file
  api.load = async function() {
    var text;
    if (_hasFileAPI) {
      var handles = await window.showOpenFilePicker({
        types: [{ description: 'DDScope project', accept: { 'application/json': ['.json'] } }]
      });
      var handle = handles[0];
      var file = await handle.getFile();
      text = await file.text();
      await _persistHandle(handle);
    } else {
      text = await new Promise(function(resolve, reject) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function() {
          var file = input.files[0];
          if (!file) return reject(new Error('No file selected'));
          var reader = new FileReader();
          reader.onload = function(e) { resolve(e.target.result); };
          reader.onerror = function() { reject(new Error('File read error')); };
          reader.readAsText(file);
        };
        input.click();
      });
    }
    _loadFromJson(text);
    _markClean();
    return DDS.state.project;
  };

  // Save to current file (or trigger saveAs if no handle)
  api.save = async function() {
    var json = _projectToJson();
    var name = DDS.state.project.project.name || 'project';
    if (_hasFileAPI && _fileHandle) {
      var perm = await _fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') perm = await _fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('Write permission denied');
      var writable = await _fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      _markClean();
    } else {
      return api.saveAs();
    }
  };

  // Save As — pick new file location
  api.saveAs = async function() {
    var json = _projectToJson();
    var name = (DDS.state.project.project.name || 'project').replace(/\s+/g, '_');
    if (_hasFileAPI) {
      var handle = await window.showSaveFilePicker({
        suggestedName: name + '_ddscope.json',
        types: [{ description: 'DDScope project', accept: { 'application/json': ['.json'] } }]
      });
      var writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      await _persistHandle(handle);
      _markClean();
    } else {
      // Fallback: download
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name + '_ddscope.json';
      a.click();
      URL.revokeObjectURL(url);
      _markClean();
    }
  };

  // Try to reopen the last file automatically (Chrome/Edge only)
  // Try to reopen last file at boot — only if permission already granted (no user gesture needed).
  // Returns 'opened' | 'prompt' (handle exists but needs user gesture) | false (no handle)
  api.tryReopenLast = async function() {
    if (!_hasFileAPI) return false;
    try {
      var handle = await _loadHandle();
      if (!handle) return false;
      var perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        var file = await handle.getFile();
        var text = await file.text();
        _loadFromJson(text);
        _fileHandle = handle;
        _markClean();
        return 'opened';
      }
      // Permission not yet granted — caller must trigger via user gesture
      _fileHandle = handle;
      return 'prompt';
    } catch(e) {
      console.error('[DDS_STORE] tryReopenLast error:', e);
      return false;
    }
  };

  // Request permission and open — must be called from a user gesture (click handler)
  api.reopenWithPermission = async function() {
    if (!_fileHandle) return false;
    try {
      var perm = await _fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return false;
      var file = await _fileHandle.getFile();
      var text = await file.text();
      _loadFromJson(text);
      _markClean();
      return true;
    } catch(e) {
      console.error('[DDS_STORE] reopenWithPermission error:', e);
      return false;
    }
  };

  // Expose clean reset for callers that trigger inserts during project open
  api.resetDirty = function() {
    DDS.state.dirty = false;
    var name = (DDS.state.project && DDS.state.project.project && DDS.state.project.project.name) || 'Untitled';
    if (typeof DDS_STORE.onDirtyChange === 'function') DDS_STORE.onDirtyChange(false, name);
  };

  // Expose dirty trigger for callers that modify state outside DDS_STORE (e.g. project metadata)
  api.markDirty = function() {
    _markDirty();
  };

  // Check if dirty and confirm with user
  api.confirmIfDirty = function() {
    if (!DDS.state.dirty) return true;
    return window.confirm('Unsaved changes will be lost. Continue?');
  };

  // Callback wired by DDS_INIT — isolated from DOM for testability.
  // Signature: onDirtyChange(dirty: boolean, name: string) → void
  api.onDirtyChange = null;

  return api;

}());

// ESM export appended during extraction — do not remove
export default DDS_STORE;
