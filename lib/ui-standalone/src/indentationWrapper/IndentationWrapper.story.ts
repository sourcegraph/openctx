import type { Meta, StoryObj } from '@storybook/html'
import { createIndentationWrapper } from './IndentationWrapper'

const meta: Meta = {
    title: 'IndentationWrapper',
    decorators: [
        story => {
            const container = document.createElement('div')
            container.style.maxWidth = '600px'
            container.style.margin = '2rem auto'
            container.style.border = 'solid 1px #ccc'
            container.append(story())
            return container
        },
    ],
}

export default meta

const FIXTURE_ELEMENT = document.createElement('div')
FIXTURE_ELEMENT.innerHTML = 'foo bar'
FIXTURE_ELEMENT.style.backgroundColor = '#ccc'

export const NoIndent: StoryObj = {
    render: () => createIndentationWrapper({ indent: undefined, children: [FIXTURE_ELEMENT] }),
}

export const Indented: StoryObj = {
    render: () => createIndentationWrapper({ indent: '    ', children: [FIXTURE_ELEMENT] }),
}

export const ExtraMargin: StoryObj = {
    render: () => createIndentationWrapper({ indent: '    ', extraMargin: 50, children: [FIXTURE_ELEMENT] }),
}
