const { configureEslint } = require('../.eslintrc.common');
const { join } = require('path');

module.exports = configureEslint([join(__dirname, 'tsconfig.json')]);