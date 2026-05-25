// must be first in setup to defeat hoisting of imports
// and have window defined before modules using window are loaded

globalThis.window = globalThis;

if (!globalThis.document) {
  globalThis.document = {
    createElement: () => ({ style: {} })
  };
}
