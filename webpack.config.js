const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    main: './src/javascripts/main.js',
    cart: './src/javascripts/cart.js', // add cart entry
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js', // separate bundles for main & cart
    clean: true,
  },
  mode: 'development',
  resolve: {
    extensions: ['.js'],
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
    },
    port: 8080,
    hot: true,
    open: true,
    watchFiles: ['src/**/*'],
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(woff(2)?|eot|ttf|otf|svg)$/, // FontAwesome webfonts
        type: 'asset/resource',
        generator: {
          filename: 'assets/webfonts/[name][ext]',
        },
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['main'], // only main.js + main.css
    }),
    new HtmlWebpackPlugin({
      template: './src/pages/cart.html',
      filename: 'cart.html',
      chunks: ['cart'], // only cart.js + cart.css
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
};