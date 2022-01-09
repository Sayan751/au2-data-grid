/**
 * @param {string[]} tsConfigPath
 */
function configureEslint(tsConfigPath) {
  return {
    root: true,
    env: {
      node: true,
    },
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
      'import',
      'jsdoc',
    ],
    parserOptions: {
      project: tsConfigPath,
    },
    extends: [
      'eslint:recommended',
      'plugin:jsdoc/recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'plugin:mocha/recommended',
      'plugin:eslint-comments/recommended',
    ],
    rules: {
      'semi': 'off',
      'no-shadow': 'off',
      'quotes': ['warn', 'single'],
      'object-shorthand': 'error',
      'no-console': 'error',
      'no-warning-comments': 'warn',

      'eslint-comments/no-unused-disable': 'error',
      'eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],

      '@typescript-eslint/semi': ['error'],
      '@typescript-eslint/member-delimiter-style': ['error'],
      '@typescript-eslint/explicit-member-accessibility': ['error'],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_'
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
        }
      ],
      '@typescript-eslint/no-shadow': ['error', { builtinGlobals: true, ignoreTypeValueShadow: true, }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 3,
        }
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
            'MethodDefinition:not([accessibility="private"])'
          ]
        }
      ],
      'jsdoc/check-tag-names': ['warn', { definedTags: ['internal'] }],
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param': 'off',

      'mocha/no-setup-in-describe': 'off',
      'mocha/no-hooks': 'warn',
      'mocha/no-return-from-async': 'error',
      'mocha/max-top-level-suites': 'off',
      'mocha/no-exclusive-tests': 'error',
    },
    settings: {
      jsdoc: { mode: 'typescript' }
    }
  };
}

module.exports.configureEslint = configureEslint;