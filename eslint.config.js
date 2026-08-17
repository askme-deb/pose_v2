const tseslint = require('typescript-eslint');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

// Flat config, picked up by every workspace's `eslint . --ext ts,tsx` script
// since ESLint walks up from cwd to find it — one shared config instead of
// ~25 near-identical per-package ones. Non-type-aware "recommended" rules
// only: this is the first time this repo has ever actually run eslint (every
// package's "lint" script was pointing at nothing), so the bar here is
// "catches real bugs" without needing every package's tsconfig wired into a
// project-service setup just to lint.
module.exports = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/.expo/**',
      '**/dev-dist/**',
      '**/coverage/**',
      'apps/desktop-pos/dist-electron/**',
      'apps/desktop-pos/release/**',
      'apps/desktop-pos/electron/**',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // `declare global { namespace Express { ... } }` is the standard,
      // correct way to augment Express's Request type — several services
      // do exactly this to type req.authUser.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      // Just the two long-standing hook-correctness rules, not v7's full
      // "recommended" set — that pulls in the newer React Compiler-era
      // diagnostics (set-state-in-effect, preserve-manual-memoization, ...)
      // which flag this codebase's extremely common, legitimate
      // `useEffect(() => { reload() }, [])` initial-fetch pattern
      // everywhere. Not what a CI lint gate should be re-litigating. Applies
      // to plain .ts too, not just .tsx — custom hooks live in both.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { react },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
);
