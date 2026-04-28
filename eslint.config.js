import { configApp } from '@adonisjs/eslint-config'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default [
    ...configApp(),
    {
        rules: {
            indent: 'off',
        },
    },
];
