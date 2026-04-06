import { configApp } from '@adonisjs/eslint-config'

export default [
    ...configApp(),
    {
        rules: {
            indent: 'off',
        },
    },
]
