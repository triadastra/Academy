import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Secure-context-only API: undefined on the plain-http production URL.
      'no-restricted-properties': [
        'error',
        {
          object: 'crypto',
          property: 'randomUUID',
          message:
            'Use uuid() from src/lib/uuid.ts — crypto.randomUUID is secure-context-only and the deployed app is served over http.',
        },
      ],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/components/CourseShell.tsx'],
    rules: {
      // Shared component modules intentionally export variants and helpers.
      'react-refresh/only-export-components': 'off',
    },
  },
])
