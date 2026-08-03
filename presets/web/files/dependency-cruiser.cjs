const { join } = require('node:path');

module.exports = {
  extends: 'dependency-cruiser/configs/recommended-strict',
  options: {
    tsConfig: { fileName: join(__dirname, 'tsconfig.json') },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.gen\\.ts$|(^|/)env\\.d\\.ts$' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'types', 'default'],
    },
  },
};
