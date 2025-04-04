'use strict';
/* eslint-disable */
const { join } = require('path');
const { mkdirSync } = require('fs');
const ResolveTypeScriptPlugin = require("resolve-typescript-plugin");
const debug = !!process.env.DEBUG;
const isDev = debug || !!process.env.DEV;

const root = process.cwd();
const testDir = join(root, 'tests');
const artifactDir = join(testDir, '.artifacts');

const reporters = ['mocha', 'junit', 'coverage-istanbul'];
if (isDev) {
  reporters.push('kmhtml');
}
const istanbulReporterConfig = {
  reports: isDev ? ['html', 'cobertura'] : ['cobertura'],
  dir: join(artifactDir, '.coverage', isDev ? '%browser%' : ''),
  fixWebpackSourcePaths: true,
  'report-config': {
    cobertura: {
      file: `${isDev ? '../' : ''}cobertura/coverage.xml`
    }
  }
};
if (!debug) {
  process.env.CHROME_BIN = require('puppeteer').executablePath();
}
const webpackOutputPath = join(testDir, '.karma-webpack', Date.now().toString());
mkdirSync(webpackOutputPath, { recursive: true });
const webpackConfig = {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    // filename: '[name].js',
    /**
     * This is needed because of these issues:
     * https://github.com/webpack/webpack/issues/12759
     * https://github.com/ryanclark/karma-webpack/issues/494
     */
    path: webpackOutputPath,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json', '.html'],
    plugins: [
      new ResolveTypeScriptPlugin(),
    ],
  },
  module: {
    rules: [
      { test: /\.ts$/i, use: [...(debug ? [] : ['@jsdevtools/coverage-istanbul-loader']), 'ts-loader'] },
      { test: /\.html$/i, loader: 'html-loader' }
    ]
  },
};
module.exports = function (config) {
  config.set({
    basePath: process.cwd(),
    frameworks: ['source-map-support', 'mocha', 'webpack'],
    plugins: [
      'karma-*',
      require('@netatwork/mocha-utils/dist/karma-html-reporter/index'),
    ],
    files: [
      { pattern: 'tests/**/*.spec.ts', watched: false }
    ],
    preprocessors: {
      'tests/**/*.spec.ts': ['webpack', 'sourcemap']
    },
    webpack: webpackConfig,
    client: {
      clearContext: false,
      mocha: {
        bail: isDev ? config['bail'] : false,
      }
    },
    reporters: reporters,
    junitReporter: {
      outputDir: artifactDir,
      outputFile: 'results.xml',
      useBrowserName: false,
    },
    mochaReporter: {
      showDiff: true,
    },
    coverageIstanbulReporter: istanbulReporterConfig,
    port: 0,
    colors: true,
    // level of logging possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,
    autoWatch: isDev,
    browsers: isDev
      ? debug
        ? ['Chrome'/* , 'Firefox' */]
        : ['ChromeHeadless', 'FirefoxHeadless']
      : ['ChromiumHeadless'],
    customLaunchers: {
      ChromiumHeadless: {
        base: 'Chromium',
        flags: ['--no-sandbox', '--headless'],
      }
    },
    singleRun: !isDev,
    concurrency: Infinity,
  });
};