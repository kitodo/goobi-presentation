// Check compatibility of source files against /.browserslistrc

module.exports = {
  'extends': [
    'plugin:compat/recommended',
  ],
  'parser': '@babel/eslint-parser',
  'settings': {
    'lintAllEsApis': true,
    'polyfills': [
      'AbortController',
    ],
  },
};
