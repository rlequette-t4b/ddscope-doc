if (!globalThis.window) {
  globalThis.window = globalThis;
}

import DDS_TOOLS from '../src/DDS_TOOLS.js';
globalThis.DDS_TOOLS = DDS_TOOLS;

if (!globalThis.document) {
  globalThis.document = {
    createElement: () => ({ style: {} })
  };
}
