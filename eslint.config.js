import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import workspacesPlugin from 'eslint-plugin-workspaces';
import globals from 'globals';

export default [
  {
    ignores: ['**/node_modules/', '.git/', 'dist/', 'lib/', 'static/'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
      workspaces: workspacesPlugin,
    },
    settings: {
      'import/core-modules': ['cloudflare:workers'],
      'import/internal-regex': /^@dod/,
      'import/resolver': {
        typescript: true,
      },
      react: {
        version: '19',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-redeclare': 'off', // for defining parallel value+type
      'no-undef': 'off', // let TS handle this
      'prettier/prettier': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        },
      ],
    },
  },
];
