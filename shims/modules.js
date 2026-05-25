// all modules are registered globally to emulate browser

[
  'DDS_TOOLS',
  'DDS_COLORS',
  'DDS_DURATION',
  'DDS_STORE',
  'DDS_TRANSACTIONS',
  'DDS_TX',
  'DDS_CMD',
  'DDS_ACTIONS',
  'DDS_LANES',
  'DDS_PRODUCTS',
  'DDS_NODES',
  'DDS_SKUS',
  'DDS_DEMANDS',
  'DDS_BOMS',
  'DDS_FLOWS',
  'DDS_MODEL'

].forEach(async (moduleName) => {
  const moduleData = await import(`../src/${moduleName}.js`);
  const value = moduleData.default || moduleData[moduleName];
  console.log(`Load and declare ${moduleName}`, value);
  globalThis[moduleName] = value;
});
