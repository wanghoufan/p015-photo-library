import eslint from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    settings: {
      'import/extensions': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        },
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      'import/no-cycle': ['error', { ignoreExternal: true }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs', 'server.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  globalIgnores([
    'dist/**',
    'dist-server/**',
    'node_modules/**',
    'scripts/**',
    // scratch/ 是临时区（不进 Git）：调试探针、一次性脚本放这里，不参与 lint
    'scratch/**',
  ]),
]);
