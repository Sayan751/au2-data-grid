const { join } = require('node:path');
const js = require('@eslint/js');
const tsEslintPlugin = require('@typescript-eslint/eslint-plugin');
const jsdocPlugin = require('eslint-plugin-jsdoc');
const mochaImport = require('eslint-plugin-mocha');
const eslintCommentsPlugin = require('@eslint-community/eslint-plugin-eslint-comments');
const stylisticImport = require('@stylistic/eslint-plugin');

const mochaPlugin = mochaImport.default ?? mochaImport;
const stylisticPlugin = stylisticImport.default ?? stylisticImport;

module.exports = [
  {
    ignores: [
      'tests/karma.conf.cjs',
      'tests/karma-mocha-reporter.js',
      '.karma-webpack/**',
      'dist/**',
    ],
  },
  js.configs.recommended,
  ...tsEslintPlugin.configs['flat/recommended-type-checked'],
  jsdocPlugin.configs['flat/recommended'],
  mochaPlugin.configs.recommended,
  {
    plugins: {
      '@eslint-community/eslint-comments': eslintCommentsPlugin,
      '@stylistic': stylisticPlugin,
    },
    rules: {
      ...eslintCommentsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.ts'],
    settings: {
      jsdoc: { mode: 'typescript' },
    },
    rules: {
      'no-shadow': 'off',
      'quotes': ['warn', 'single'],
      'object-shorthand': 'error',
      'no-console': 'error',
      'no-warning-comments': 'warn',

      '@eslint-community/eslint-comments/no-unused-disable': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],

      '@stylistic/semi': ['error'],
      '@stylistic/member-delimiter-style': ['error'],

      '@typescript-eslint/explicit-member-accessibility': ['error'],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variableLike',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
          filter: { regex: '^(?!(cancelled|canceled)).*$', match: true },
          leadingUnderscore: 'allow',
        },
      ],
      '@typescript-eslint/no-shadow': ['error', { builtinGlobals: true, ignoreTypeValueShadow: true }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 3,
        },
      ],
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      '@typescript-eslint/explicit-function-return-type': ['error'],

      'jsdoc/require-jsdoc': [
        'warn',
        {
          publicOnly: true,
          require: {
            ClassDeclaration: true,
          },
          checkConstructors: false,
          checkGetters: false,
          contexts: [
            'MethodDefinition:not([accessibility="private"])',
          ],
        },
      ],
      'jsdoc/check-tag-names': ['warn', { definedTags: ['internal'] }],
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param': 'off',

      'mocha/no-setup-in-describe': 'off',
      'mocha/no-hooks': 'warn',
      'mocha/no-return-from-async': 'error',
      'mocha/max-top-level-suites': 'off',
      'mocha/no-exclusive-tests': 'error',
      'mocha/consistent-spacing-between-blocks': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [join(__dirname, 'tsconfig.json')],
      },
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [join(__dirname, 'tests/tsconfig.json')],
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
