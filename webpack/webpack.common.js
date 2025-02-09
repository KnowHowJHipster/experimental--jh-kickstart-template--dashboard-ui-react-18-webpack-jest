const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { hashElement } = require('folder-hash');
const MergeJsonWebpackPlugin = require('merge-jsons-webpack-plugin');
const utils = require('./utils.js');
const environment = require('./environment');

const getTsLoaderRule = env => {
  const rules = [
    {
      loader: 'thread-loader',
      options: {
        // There should be 1 cpu for the fork-ts-checker-webpack-plugin.
        // The value may need to be adjusted (e.g. to 1) in some CI environments,
        // as cpus() may report more cores than what are available to the build.
        workers: require('os').cpus().length - 1,
      },
    },
    {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
        happyPackMode: true,
      },
    },
  ];
  return rules;
};

module.exports = async options => {
  const development = options.env === 'development';
  const languagesHash = await hashElement(path.resolve(__dirname, '../src/i18n'), {
    algo: 'md5',
    encoding: 'hex',
    files: { include: ['*.json'] },
  });

  return merge({
    cache: {
      // 1. Set cache type to filesystem
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '../node_modules/.build/webpack'),
      buildDependencies: {
        // 2. Add your config as buildDependency to get cache invalidation on config change
        config: [
          __filename,
          path.resolve(__dirname, `webpack.${development ? 'dev' : 'prod'}.js`),
          path.resolve(__dirname, 'environment.js'),
          path.resolve(__dirname, 'utils.js'),
          path.resolve(__dirname, '../postcss.config.js'),
          path.resolve(__dirname, '../tsconfig.json'),
        ],
      },
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      modules: ['node_modules'],
      alias: utils.mapTypescriptAliasToWebpackAlias(),
      fallback: {
        path: require.resolve('path-browserify'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: getTsLoaderRule(options.env),
          include: [utils.root('./src')],
          exclude: [utils.root('node_modules')],
        },
        /*
       ,
       Disabled due to https://github.com/jhipster/generator-jhipster/issues/16116
       Can be enabled with @reduxjs/toolkit@>1.6.1
      {
        enforce: 'pre',
        test: /\.jsx?$/,
        loader: 'source-map-loader'
      }
      */
      ],
    },
    stats: {
      children: false,
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        // react-jhipster requires LOG_LEVEL config.
        LOG_LEVEL: development ? 'info' : 'error',
      }),
      new webpack.DefinePlugin({
        I18N_HASH: JSON.stringify(languagesHash.hash),
        DEVELOPMENT: JSON.stringify(development),
        VERSION: JSON.stringify(environment.VERSION),
        SERVER_API_URL: JSON.stringify(environment.SERVER_API_URL),
      }),
      new ESLintPlugin({
        baseConfig: {
          parserOptions: {
            project: ['../tsconfig.json'],
          },
        },
      }),
      new ForkTsCheckerWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: './src/content/', to: 'content/' },
          { from: './src/favicon.ico', to: 'favicon.ico' },
          { from: './src/manifest.webapp', to: 'manifest.webapp' },
          { from: './src/robots.txt', to: 'robots.txt' },
        ],
      }),
      new HtmlWebpackPlugin({
        template: './src/index.html',
        chunksSortMode: 'auto',
        inject: 'body',
        base: '/',
      }),
      new MergeJsonWebpackPlugin({
        output: {
          groupBy: [
            { pattern: './src/i18n/en/*.json', fileName: './i18n/en.json' },
            { pattern: './src/i18n/ru/*.json', fileName: './i18n/ru.json' },
            { pattern: './src/i18n/fr/*.json', fileName: './i18n/fr.json' },
            { pattern: './src/i18n/it/*.json', fileName: './i18n/it.json' },
          ],
        },
      }),
    ],
  });
};
