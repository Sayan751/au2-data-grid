const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function (env, { mode }) {
  const production = mode === 'production';
  return {
    mode: production ? 'production' : 'development',
    entry: './src/main.ts',
    devtool: "inline-cheap-module-source-map",
    resolve: {
      extensions: ['.ts', '.js', '.json', '.html'],
      modules: [path.resolve(__dirname, 'src'), 'node_modules'],
      mainFields: ['module'],
      // // sadly these fallbacks are required to run the app via webpack-dev-server
      // fallback: {
      //   'html-entities': require.resolve('html-entities/'),
      //   'events': require.resolve('events/'),
      // },
    },
    devServer: {
      port: 9500,
      historyApiFallback: true,
    },
    module: {
      rules: [
        { test: /\.ts$/i, loader: 'ts-loader' },
        { test: /\.html$/i, loader: 'html-loader' },
        { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({ template: 'index.ejs' }),
      new CopyWebpackPlugin({ patterns: [{ from: './favicon.ico' }] }),
    ]
  };
};
