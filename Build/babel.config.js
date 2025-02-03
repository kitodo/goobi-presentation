module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}]
  ],
  plugins: [
    "@babel/plugin-transform-runtime",
    [
      "babel-plugin-module-resolver",
      {
        "root": [
          "../Resources/Private/JavaScript",
        ],
        "alias": {
          "lib": "../Resources/Private/JavaScript/lib",
          "DlfMediaPlayer": "../Resources/Private/JavaScript/DlfMediaPlayer",
          "SlubMediaPlayer": "../Resources/Private/JavaScript/SlubMediaPlayer"
        }
      }
    ]
  ],
};
