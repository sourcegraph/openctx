import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
    stories: ['../src/**/*.story.@(js|jsx|ts|tsx)'],
    addons: ['@storybook/addon-essentials'],
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    async viteFinal(config) {
        return mergeConfig(config, { css: { modules: { localsConvention: 'camelCaseOnly' } } })
    },
}
export default config
