const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
    main: './src/main.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    publicPath: '/static/',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['main'],
      scriptLoading: 'defer',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/static/',
    },
    historyApiFallback: true,
    hot: true,
    port: 5174,
    proxy: [
      {
        context: ['/api/chat'],
        target: 'http://localhost:8001',
      },
      {
        context: ['/api/search'],
        target: 'http://localhost:8000',
      },
    ],
  },
  devtool: 'source-map',
};
