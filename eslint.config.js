import js from '@eslint/js'
import globals from 'globals'
import { globalIgnores } from 'eslint/config'
import react from '@eslint-react/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  globalIgnores(['dist/**']),
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,jsx}'],
  },
  {
    ...react.configs.recommended,
    files: ['**/*.{js,jsx}'],
  },
  {
    // The official react-hooks plugin is the canonical source for these analyses.
    // Turn off @eslint-react's duplicates so each finding is reported once.
    rules: {
      '@eslint-react/exhaustive-deps': 'off',
      '@eslint-react/rules-of-hooks': 'off',
      '@eslint-react/set-state-in-effect': 'off',
      '@eslint-react/set-state-in-render': 'off',
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ['**/*.{js,jsx}'],
  },
  {
    ...reactRefresh.configs.vite,
    files: ['**/*.{js,jsx}'],
  },
]