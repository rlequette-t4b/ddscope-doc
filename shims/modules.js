// all modules are registered globally to emulate browser

[
  'DDS_TOOLS',
  'DDS_COLORS',
  'DDS_DURATION',
  'DDS_STORE',
  'DDS_TRANSACTIONS',
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
  // Dynamically import the module file
  const moduleData = await import(`../src/${moduleName}.js`);

  

 // Grab the default export or the evaluated module value
  const value = moduleData.default || moduleData[moduleName];
  
  // Assign it to globalThis so your test files can see it
  console.log(`Load and declare ${moduleName}`, value)
  globalThis[moduleName] = value;
})
