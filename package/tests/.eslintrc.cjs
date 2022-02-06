const { configureEslint } = require('../../.eslintrc.common');
const { join } = require('path');

const config = configureEslint([join(__dirname, 'tsconfig.json')]);
config.rules['@typescript-eslint/no-non-null-assertion'] = 'off';
module.exports = config;