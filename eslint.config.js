import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/generated/**',
      'out/**',
      '.husky/**',
      'package-lock.json',
      'selfcheck.js',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          './package/shared/tsconfig.json',
          './worker/tsconfig.json',
          './exporter/tsconfig.json',
          './tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
);
