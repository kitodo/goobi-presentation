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
  "ignorePatterns": [
    // avoid Error: ELOOP: too many symbolic links encountered
    "../Resources/Private/DevServer/Resources",
    // ignore public webpack javascript build
    "../Resources/Public/JavaScript"
  ],
};
