// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.wxt/**', '.output/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Entrypoints intentionally use `document` / `location` / `fetch`
      // globals provided by the browser runtime, not Node.
      'no-undef': 'off',
    },
  },
);
