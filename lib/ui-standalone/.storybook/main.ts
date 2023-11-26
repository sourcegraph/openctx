import type { StorybookConfig } from '@storybook/html-vite'

export default {
    stories: ['../src/**/*.story.@(js|jsx|ts|tsx)'],
    addons: ['@storybook/addon-essentials'],
    framework: {
        name: '@storybook/html-vite',
        options: {},
    },
} satisfies StorybookConfig
