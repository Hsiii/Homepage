import { completeConfigBase } from 'eslint-config-complete';
import sortKeys from 'eslint-plugin-sort-keys';
import { defineConfig } from 'eslint/config';

export default defineConfig(
    ...completeConfigBase,

    {
        ignores: ['.next/**', '.vercel/**', 'dist/**', 'next-env.d.ts'],
    },

    {
        files: ['**/*.d.ts'],
        rules: {
            'import-x/no-default-export': 'off',
            'import-x/no-unassigned-import': 'off',
        },
    },

    {
        files: [
            'next.config.ts',
            'src/app/**/{error,layout,loading,not-found,page}.tsx',
            'src/proxy.ts',
        ],
        rules: {
            'import-x/no-default-export': 'off',
        },
    },

    {
        files: ['next.config.ts'],
        rules: {
            '@typescript-eslint/require-await': 'off',
            'complete/no-mutable-return': 'off',
        },
    },

    {
        files: ['src/proxy.ts'],
        rules: {
            'unicorn/prefer-string-raw': 'off',
        },
    },

    {
        files: ['src/constants/links.ts'],
        plugins: {
            'sort-keys': sortKeys,
        },
        rules: {
            'sort-keys/sort-keys-fix': [
                'error',
                'asc',
                {
                    caseSensitive: false,
                    natural: true,
                },
            ],
        },
    },

    {
        rules: {
            '@stylistic/quotes': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off',
            'n/file-extension-in-import': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            'import-x/no-unassigned-import': [
                'error',
                {
                    allow: ['**/*.css', 'server-only'],
                },
            ],
        },
    }
);
