import DDS_TOOLS from '../src/DDS_TOOLS.js';
globalThis.DDS_TOOLS = DDS_TOOLS;
import DDS_STORE from '../src/DDS_STORE.js';
globalThis.DDS_STORE = DDS_STORE;
import DDS_ACTIONS from '../src/DDS_ACTIONS.js';
globalThis.DDS_ACTIONS = DDS_ACTIONS;

DDS_TOOLS.log.setLevel('debug'); // Default log level for shims