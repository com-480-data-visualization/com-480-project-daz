// webpack.config.js
const path = require('path');

module.exports = {
  entry: './docs/pca.js', // Adjust the entry point to where your main JS file is located.
  output: {
    filename: 'bundle.js', // This will be the single JS file that gets generated.
    path: path.resolve(__dirname, 'docs') // Output to the docs folder (the one GitHub Pages will serve).
  },
  mode: 'production', // Use 'development' for debugging (this keeps more readable output).
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  devtool: 'source-map' // Optional: generates source maps to help with debugging.
};
