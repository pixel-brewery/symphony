// eslint.config.mjs
import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '.angular/**',
      '.nx/**',
      'artifacts/**',
      'coverage/**',
      'dist/**',
      '**/eslint.config.mjs',
      'node_modules/**',
      'out/**',
      '**/vitest.config.*.timestamp*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mjs'],
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:domain',
              onlyDependOnLibsWithTags: ['scope:domain'],
            },
            {
              sourceTag: 'scope:application',
              onlyDependOnLibsWithTags: [
                'scope:application',
                'scope:domain',
                'scope:orchestration',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:orchestration',
              onlyDependOnLibsWithTags: ['scope:domain', 'scope:orchestration'],
            },
            {
              sourceTag: 'scope:infrastructure',
              onlyDependOnLibsWithTags: [
                'scope:application',
                'scope:domain',
                'scope:infrastructure',
                'scope:orchestration',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:renderer',
              onlyDependOnLibsWithTags: [
                'scope:domain',
                'scope:frontend',
                'scope:frontend-feature',
                'scope:renderer',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:frontend',
              onlyDependOnLibsWithTags: [
                'scope:domain',
                'scope:frontend',
                'scope:frontend-feature',
                'scope:shared',
              ],
            },
            ...[
              'core',
              'ui',
              'search',
              'setting',
              'notification',
              'quick-create',
              'widget',
              'update',
              'interaction',
            ].map((capability) => ({
              allSourceTags: ['scope:frontend', `type:${capability}`],
              onlyDependOnLibsWithTags: ['scope:domain', 'scope:frontend', 'scope:shared'],
            })),
            {
              sourceTag: 'scope:frontend-feature',
              onlyDependOnLibsWithTags: [
                'scope:domain',
                'scope:frontend',
                'scope:frontend-feature',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:desktop',
              onlyDependOnLibsWithTags: [
                'scope:application',
                'scope:desktop',
                'scope:domain',
                'scope:infrastructure',
                'scope:orchestration',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:domain', 'scope:shared'],
            },
            {
              sourceTag: 'scope:testing',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
