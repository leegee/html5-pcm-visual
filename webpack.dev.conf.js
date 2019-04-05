const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  // mode: 'development',
  entry: {
    app: [
      'webpack-dev-server/client?http://localhost:8080',
      './eg/index',
      './src/index'
    ],
    vendor: [
      "@webcomponents/webcomponentsjs/custom-elements-es5-adapter",
      "@webcomponents/webcomponentsjs/webcomponents-loader"
    ]
  },
  devtool: 'source-map',
  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
    hot: true
  },
  resolve: {
    modules: ["node_modules"],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '..', 'dist')
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [
      '.ts', '.js', '.html'
    ]
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], { verbose: true, root: path.resolve(__dirname) }),
    new HtmlWebpackPlugin({
      template: './eg/index.html'
    }),
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, './eg'),
        to: '.'
        // ignore: ['.*']
      },
      {
        from: path.join(
          path.resolve(__dirname, './node_modules/@webcomponents/webcomponentsjs/'),
          '*.js'
        ),
        to: './webcomponentjs',
        flatten: true
      }
    ]),
    new webpack.IgnorePlugin(/vertx/),
    new webpack.HotModuleReplacementPlugin(),
  ]
};
