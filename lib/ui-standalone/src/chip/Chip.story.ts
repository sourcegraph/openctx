import type { Annotation } from '@openctx/schema'
import type { Meta, StoryObj } from '@storybook/html'
import { createChip } from './Chip.js'

const meta: Meta = {
    title: 'Chip',
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

const FIXTURE_ANN: Annotation = {
    uri: 'file:///f',
    item: {
        title: '📘 Docs: CSS in client/web',
    },
}

export const Text: StoryObj = { render: () => createChip({ annotation: { ...FIXTURE_ANN } }) }

export const Link: StoryObj = {
    render: () =>
        createChip({
            annotation: { ...FIXTURE_ANN, item: { ...FIXTURE_ANN.item, url: 'https://example.com' } },
        }),
}

export const Detail: StoryObj = {
    render: () =>
        createChip({
            annotation: {
                ...FIXTURE_ANN,
                item: { ...FIXTURE_ANN.item, ui: { hover: { text: 'View doc page' } } },
            },
        }),
}

export const Markdown: StoryObj = {
    render: () =>
        createChip({
            annotation: {
                ...FIXTURE_ANN,
                item: {
                    ...FIXTURE_ANN.item,
                    ui: { hover: { markdown: 'Status: **active**', text: 'Status: active' } },
                },
            },
        }),
}

export const Image: StoryObj = {
    render: () =>
        createChip({
            annotation: {
                ...FIXTURE_ANN,
                item: {
                    ...FIXTURE_ANN.item,
                    ui: {
                        hover: {
                            markdown:
                                '<img src="https://lh3.googleusercontent.com/d_S5gxu_S1P6NR1gXeMthZeBzkrQMHdI5uvXrpn3nfJuXpCjlqhLQKH_hbOxTHxFhp5WugVOEcl4WDrv9rmKBDOMExhKU5KmmLFQVg" alt="Google logo" width=512 height=300 />',
                        },
                    },
                },
            },
        }),
}
