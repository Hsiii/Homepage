import { completeConfigBase } from 'eslint-config-complete';
import { defineConfig } from 'eslint/config';
import sortKeys from 'eslint-plugin-sort-keys';

export default defineConfig(
    ...completeConfigBase,

    {
        ignores: ['public/theme-init.js', 'vite.config.ts'],
    },

    {
        files: ['**/*.d.ts'],
        rules: {
            'import-x/no-default-export': 'off',
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
                    allow: ['**/*.css'],
                },
            ],
        },
    }
);
