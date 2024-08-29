const path = require('path');

const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

const PRIVATE_PATH = path.resolve(__dirname, '../Resources/Private');
const PUBLIC_PATH = path.resolve(__dirname, '../Resources/Public');

module.exports = (env, argv) => {
  // Babel is only used for browser compatibility, which we don't need in development
  const useBabel = argv.mode === 'production';

  return {
    devtool: "source-map",
    devServer: {
      static: {
        directory: `${PRIVATE_PATH}/DevServer`,
      },
      compress: true,
      port: 9000,
      server: {
        // Required for testing Equalizer/AudioWorklet
        type: 'https',
      },
    },
    entry: {
      'DlfMediaPlayer': path.resolve(PRIVATE_PATH, `JavaScript/SlubMediaPlayer`),
      'DlfMediaPlayerStyles': path.resolve(PRIVATE_PATH, `Less/DlfMediaPlayer.less`),
    },
    output: {
      filename: 'JavaScript/[name].js',
      path: PUBLIC_PATH,
    },
    plugins: [
      new RemoveEmptyScriptsPlugin(),
      new MiniCssExtractPlugin({
        filename: "Css/[name].css",
      }),
    ],
    module: {
      rules: [
        useBabel ? (
          {
            test: /\.js$/,
            exclude: [
              /node_modules/,
              /\.no-babel.js/,
            ],
            use: {
              loader: "babel-loader",
            },
          }
        ) : {},
        {
          test: /\.(css|less)$/i,
          // Recall that the order is reverse (first loader is listed last)
          use: [
            {
              // Use mini-css-extract to extract .css files instead of injecting <style> tags
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: "css-loader",
              options: {
                // Don't attempt to resolve URLs in CSS
                url: false,
                sourceMap: true,
              },
            },
            {
              loader: "less-loader",
              options: {
                lessOptions: {
                  // Don't adjust relative URLs in Less
                  relativeUrls: false,
                },
                sourceMap: true,
              },
            },
          ],
        },
      ],
    },
    externals: {
      jquery: 'jQuery',
    },
    // Extract NPM-installed packages into vendor bundle
    optimization: {
      splitChunks: {
        chunks(chunk) {
          return chunk.name === 'DlfMediaPlayer';
        },
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          playerVendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "DlfMediaVendor",
          },
        },
      },
      minimizer: [
        `...`,
        new CssMinimizerPlugin(),
      ],
    },
    resolve: {
      modules: [
        path.resolve(__dirname, 'node_modules'),
      ]
    },
  };
};
