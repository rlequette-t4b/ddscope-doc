
globalThis.window = globalThis;

if (!globalThis.document) {
  globalThis.document = {
    createElement: () => ({ style: {} })
  };
}
