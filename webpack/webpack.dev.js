const {merge} = require('webpack-merge');
const common = require('./webpack.common');

const dev = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    open: true,
    headers: {
      // These headers are needed to be able to use SharedArrayBuffer
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
};

module.exports = merge(common, dev);
