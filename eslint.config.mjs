import { completeConfigBase } from 'eslint-config-complete';
import { defineConfig } from 'eslint/config';

export default defineConfig(
    ...completeConfigBase,

    {
        ignores: ['public/theme-init.js'],
    },

    {
        rules: {
            '@stylistic/quotes': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            'import-x/no-unassigned-import': [
                'error',
                {
                    allow: ['**/*.css'],
                },
            ],
        },
    }
);
